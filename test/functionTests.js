const { expect,assert } = require("chai");
const { ethers } = require("hardhat");
const Web3 = require('web3')
const web3 = new Web3(hre.network.provider)
const { abi, bytecode } = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json");
const h = require("usingtellor/test/helpers/helpers.js");
const MerkleTree = require("../src/MerkleTree");
const abiCoder = new ethers.utils.AbiCoder()
const Snapshot = require("../src/Snapshot")

describe("fee contract - function tests", function() {
    let cit,tellor,baseToken,chd,charon,oracle,Snap,mockTree;
    beforeEach(async function () {
        accounts = await ethers.getSigners();
        let fac = await ethers.getContractFactory("MockERC20");
        cit = await fac.deploy("charon incentive token", "cit");
        await cit.deployed();
        baseToken = await fac.deploy("base token", "bt");
        await baseToken.deployed();
        chd = await fac.deploy("charon dollar", "chd");
        await chd.deployed();
        let TellorOracle = await ethers.getContractFactory(abi, bytecode);
        tellor = await TellorOracle.deploy();
        await tellor.deployed()
        fac = await ethers.getContractFactory("Oracle")
        oracle = await fac.deploy(tellor.address)
        await oracle.deployed()
        fac = await ethers.getContractFactory("MockCharon")
        charon = await fac.deploy(chd.address,baseToken.address);
        await charon.deployed()
        fac = await ethers.getContractFactory("CFC");
        cfc = await fac.deploy(cit.address,charon.address,oracle.address,web3.utils.toWei("10"),web3.utils.toWei("20"),web3.utils.toWei("50"),web3.utils.toWei("20"));
        await cfc.deployed();
        const initBlock = await hre.ethers.provider.getBlock("latest")
        Snap = new Snapshot(cit.address, initBlock, web3)
        fac = await ethers.getContractFactory("MockMerkleTree")
        mockTree = await fac.deploy()
        await mockTree.deployed()
    });
    it("constructor()", async function() {
        assert(await cfc.CIT() == cit.address, "cit should be set")
        assert(await cfc.charon() == charon.address, "charon should be set")
        assert(await cfc.oracle() == oracle.address, "tellor should be set")
        assert(await cfc.toOracle() == web3.utils.toWei("10"), "toOracle should be set")
        assert(await cfc.toLPs() == web3.utils.toWei("20"), "toLPs should be set")
        assert(await cfc.toHolders() == web3.utils.toWei("50"), "toHolders should be set")
        assert(await cfc.toUsers() == web3.utils.toWei("20"), "toUsers should be set")
        let feePeriod = await cfc.feePeriods(0)
        assert(feePeriod > 0, "first fee period shoud be set")
        let thisPeriod = await cfc.getFeePeriodByTimestamp(feePeriod)
        assert(thisPeriod.endDate - feePeriod == 0, "end date should be set")
        assert(await cfc.token() == baseToken.address, "base token should be set")
        assert(await cfc.chd() ==chd.address, "chd should be set")

    });
    it("addFees()", async function() {
        await baseToken.mint(accounts[2].address, web3.utils.toWei("100"))
        await h.expectThrow(cfc.connect(accounts[1]).addFees(web3.utils.toWei("100"),false))
        await baseToken.connect(accounts[2]).approve(cfc.address,web3.utils.toWei("100"))
        await cfc.connect(accounts[2]).addFees(web3.utils.toWei("100"),false);
        assert(await cfc.toDistributeToken() == web3.utils.toWei("100"), "amount of token to distribute should be set")
        await chd.mint(accounts[2].address, web3.utils.toWei("100"))
        await h.expectThrow(cfc.connect(accounts[2]).addFees(web3.utils.toWei("100"),true))
        await chd.connect(accounts[2]).approve(cfc.address,web3.utils.toWei("100"))
        await cfc.connect(accounts[2]).addFees(web3.utils.toWei("100"),true);
        assert(await cfc.toDistributeCHD() == web3.utils.toWei("100"), "amount of token to distribute should be set")
    });
    it("claimRewards()", async function() {
        //claim rewards, can't claim a bad reward
        await cit.mint(accounts[1].address,web3.utils.toWei("100"))
        await cit.mint(accounts[2].address,web3.utils.toWei("200"))
        await cit.mint(accounts[3].address,web3.utils.toWei("300"))
        await cit.mint(accounts[4].address,web3.utils.toWei("400"))
        await baseToken.mint(accounts[2].address, web3.utils.toWei("1000"))
        await baseToken.connect(accounts[2]).approve(cfc.address,web3.utils.toWei("1000"))
        await cfc.connect(accounts[2]).addFees(web3.utils.toWei("1000"),false);
        await chd.mint(accounts[2].address, web3.utils.toWei("1000"))
        await chd.connect(accounts[2]).approve(cfc.address,web3.utils.toWei("1000"))
        await cfc.connect(accounts[2]).addFees(web3.utils.toWei("1000"),true);
        await h.advanceTime(86400 * 31)
        let _f= await cfc.feePeriods(0)
        let _queryData = abiCoder.encode(
            ['string', 'bytes'],
            ['CrossChainBalance', abiCoder.encode(
                ['uint256','address','uint256'],
                [1,cit.address,_f]
            )]
            );
        _queryId = h.hash(_queryData)
        let blockN = await ethers.provider.getBlockNumber()
        let root = await Snap.getRootHash(blockN)
        let ts = await cit.totalSupply()
        let _value = abiCoder.encode(['bytes32','uint256'],[root,ts])
        await tellor.submitValue(_queryId, _value,0, _queryData);
        await h.advanceTime(86400/2)
        await cfc.endFeeRound()
        //Take snapshop
        let data = Snap.data[blockN]
        //bad tries
        let i = 1
        for (key in data.sortedAccountList) {
            let account = data.sortedAccountList[key]
            let tx = await Snap.getClaimTX(blockN, account)
            assert(await cfc.getDidClaim(_f,accounts[i].address)== false, "didn't claim already")
            await h.expectThrow(cfc.claimRewards(_f,account,web3.utils.toWei("1000")*i,tx.hashes, tx.hashRight))//bad balance
            tx.hashes[0] = h.hash("badHash")
            await h.expectThrow(cfc.claimRewards(_f,account,web3.utils.toWei("100")*i,tx.hashes, tx.hashRight))//bad tx.hashes
            tx = await Snap.getClaimTX(blockN, account)
            for(j=0;j < tx.hashRight.length; j++){
                tx.hashRight[j] = true
            }
            await h.expectThrow(cfc.claimRewards(_f,account,web3.utils.toWei("100")*i,tx.hashes, tx.hashRight))//bad tx.hashRight
            for(j=0;j < tx.hashRight.length; j++){
                tx.hashRight[j] = false
            }
            await h.expectThrow(cfc.claimRewards(_f,account,web3.utils.toWei("100")*i,tx.hashes, tx.hashRight))//bad tx.hashRight
            i++
        }
        i = 4
        data = Snap.data[blockN]
        for (key in data.sortedAccountList) {
            let account = data.sortedAccountList[key]
            for(j=0;j<5;j++){
                if(account == accounts[j].address){
                    i = j
                }
            }
            let tx = await Snap.getClaimTX(blockN, account)
            assert(await cfc.getDidClaim(_f,account)== false, "didn't claim already")
            let myBal = i * 100
            assert(data.balanceMap[account] - web3.utils.toWei(myBal.toString()) == 0, "balance should be correct")
            await cfc.claimRewards(_f,account,data.balanceMap[account],tx.hashes, tx.hashRight)
            assert(await cfc.getDidClaim(_f,account)== true, "did claim already")
            await h.expectThrow(cfc.claimRewards(_f,account,web3.utils.toWei("100")*i,tx.hashes, tx.hashRight))
            assert(await baseToken.balanceOf(account) - web3.utils.toWei("100")*i/2 == 0, "token balance should be claimed")
            assert(await chd.balanceOf(account) - web3.utils.toWei("100")*i/2 == 0, "chd balance should be claimed")
            i--
        }
    });
    it("endFeeRound()", async function() {
        await h.expectThrow(cfc.feePeriods(1))
        await cit.mint(accounts[2].address,web3.utils.toWei("100"))
        await baseToken.mint(accounts[2].address, web3.utils.toWei("100"))
        await baseToken.connect(accounts[2]).approve(cfc.address,web3.utils.toWei("100"))
        await cfc.connect(accounts[2]).addFees(web3.utils.toWei("100"),false);
        await chd.mint(accounts[2].address, web3.utils.toWei("100"))
        await chd.connect(accounts[2]).approve(cfc.address,web3.utils.toWei("100"))
        await cfc.connect(accounts[2]).addFees(web3.utils.toWei("100"),true);
        await h.expectThrow(cfc.endFeeRound())//hasn't been time
        await h.advanceTime(86400 * 31)
        await h.expectThrow(cfc.endFeeRound())//no oracle push yet
        let _f= await cfc.feePeriods(0)
        let _queryData = abiCoder.encode(
            ['string', 'bytes'],
            ['CrossChainBalance', abiCoder.encode(
                ['uint256','address','uint256'],
                [1,cit.address,_f]
            )]
            );
        _queryId = h.hash(_queryData)
        let _value = abiCoder.encode(['bytes32','uint256'],["0x3b696cbaa12880500df23f90cf5599987649df71fe24e830cc21fbb95891dbe7",web3.utils.toWei("100")])
        await tellor.submitValue(_queryId, _value,0, _queryData);
        await h.advanceTime(86400/2)
        await cfc.endFeeRound()
        assert(await cfc.toDistributeCHD() == 0, "should zero out toDistributeCHD")
        assert(await cfc.toDistributeToken() == 0, "toDistributeToken should zero out")
        feePeriod = await cfc.feePeriods(1)
        let _f1 = await cfc.getFeePeriodByTimestamp(_f);
        assert(feePeriod > _f + 86400 * 30, "timestanp should be correct")
        assert(_f1.baseTokenRewardsPerToken == web3.utils.toWei("0.5"), "should be correct base rewards per token");
        assert(_f1.chdRewardsPerToken == web3.utils.toWei("0.5"), "should be correct chd rewards per token");
    });
    it("getFeePeriodByTimestamp()", async function() {
        await cit.mint(accounts[2].address,web3.utils.toWei("100"))
        await baseToken.mint(accounts[2].address, web3.utils.toWei("100"))
        await baseToken.connect(accounts[2]).approve(cfc.address,web3.utils.toWei("100"))
        await cfc.connect(accounts[2]).addFees(web3.utils.toWei("100"),false);
        await chd.mint(accounts[2].address, web3.utils.toWei("100"))
        await chd.connect(accounts[2]).approve(cfc.address,web3.utils.toWei("100"))
        await cfc.connect(accounts[2]).addFees(web3.utils.toWei("100"),true);
        await h.advanceTime(86400 * 31)
        let _f= await cfc.feePeriods(0)
        let _queryData = abiCoder.encode(
            ['string', 'bytes'],
            ['CrossChainBalance', abiCoder.encode(
                ['uint256','address','uint256'],
                [1,cit.address,_f]
            )]
            );
        _queryId = h.hash(_queryData)
        let _value = abiCoder.encode(['bytes32','uint256'],["0x3b696cbaa12880500df23f90cf5599987649df71fe24e830cc21fbb95891dbe7",web3.utils.toWei("100")])
        await tellor.submitValue(_queryId, _value,0, _queryData);
        await h.advanceTime(86400/2)
        await cfc.endFeeRound()
        let _f1 = await cfc.getFeePeriodByTimestamp(_f);
        assert(_f1.baseTokenRewardsPerToken == web3.utils.toWei("0.5"), "should be correct base rewards per token");
        assert(_f1.chdRewardsPerToken == web3.utils.toWei("0.5"), "should be correct chd rewards per token");
        assert(_f1.endDate - _f == 0, "fee period end date should be correct")
        assert(_f1.rootHash == "0x3b696cbaa12880500df23f90cf5599987649df71fe24e830cc21fbb95891dbe7", "rootHash should be correct")
        assert(_f1.totalSupply == web3.utils.toWei("100"), "total supply should be correct")
    });
    it("constructor()", async function() {
        console.log("oracle.sol")
        assert(await oracle.tellor() == tellor.address, "tellor address should be set properly")

    });
    it("getRootHashAndSupply()", async function() {
        let _queryData = abiCoder.encode(
            ['string', 'bytes'],
            ['CrossChainBalance', abiCoder.encode(
                ['uint256','address','uint256'],
                [1,accounts[1].address,1]
            )]
            );
        _queryId = h.hash(_queryData)
        let _value = 100
        await tellor.submitValue(_queryId, _value,0, _queryData);
        await h.advanceTime(86400)
        assert(await oracle.getRootHashAndSupply(1,accounts[1].address) == 100, "value should be correct")
    });
    it("inTree()", async function() {
        console.log("Merkle Tree Tests")
        //give addresses a balance
        await cit.mint(accounts[1].address,web3.utils.toWei("100"))
        await cit.mint(accounts[1].address,web3.utils.toWei("300"))
        await cit.mint(accounts[2].address,web3.utils.toWei("100"))
        await cit.mint(accounts[2].address,web3.utils.toWei("300"))
        await cit.mint(accounts[3].address,web3.utils.toWei("100"))
        await cit.mint(accounts[3].address,web3.utils.toWei("100"))
        //Take snapshop
        let blockN = await ethers.provider.getBlockNumber()
        let root = await Snap.getRootHash(blockN)
        let data = Snap.data[blockN]
        for (key in data.sortedAccountList) {
            let account = data.sortedAccountList[key]
            let tx = await Snap.getClaimTX(blockN, account)
            assert(await mockTree.inTree(root,tx.hashes, tx.hashRight))
        }
    });
    it("getRootHash", async function() {
            //give addresses a balance
            await cit.mint(accounts[1].address,web3.utils.toWei("100"))
            await cit.mint(accounts[1].address,web3.utils.toWei("100"))
            await cit.mint(accounts[2].address,web3.utils.toWei("100"))
            await cit.mint(accounts[2].address,web3.utils.toWei("100"))
            await cit.mint(accounts[3].address,web3.utils.toWei("100"))
            await cit.mint(accounts[3].address,web3.utils.toWei("100"))
            //Take snapshop
            let blockN = await ethers.provider.getBlockNumber()
            let root = await Snap.getRootHash(blockN)
            let data = Snap.data[blockN]
            let balanceMap = await Snap.getBalances(data.sortedAccountList,blockN)
            let hashList = await Snap.getHashList(data.sortedAccountList,balanceMap)
            let _solRoot = await mockTree.getRootHash(hashList);
            assert(root == _solRoot, "solidity root should match javascript root")
    });
});
