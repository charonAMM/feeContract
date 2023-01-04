const { expect,assert } = require("chai");
const { ethers } = require("hardhat");
const Web3 = require('web3')
const web3 = new Web3(hre.network.provider)
const { abi, bytecode } = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json");
const h = require("usingtellor/test/helpers/helpers.js");
const MerkleTree = require("../src/MerkleTree");
const abiCoder = new ethers.utils.AbiCoder()
const Snapshot = require("../src/Snapshot")

describe("fee contract - end to end tests", function() {
    let cit,tellor,baseToken,chd,charon,oracle,Snap,mockTree;
    beforeEach(async function () {
        accounts = await ethers.getSigners();
        let fac = await ethers.getContractFactory("MockERC20");
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
        cfc = await fac.deploy(charon.address,oracle.address,web3.utils.toWei("10"),web3.utils.toWei("20"),web3.utils.toWei("50"),web3.utils.toWei("20"));
        await cfc.deployed();
        fac = await ethers.getContractFactory("MockERC20");
        cit = await fac.deploy("charon incentive token", "cit");
        await cit.deployed();
        await cfc.setCIT(cit.address)
        const initBlock = await hre.ethers.provider.getBlock("latest")
        Snap = new Snapshot(cit.address, initBlock, web3)
        fac = await ethers.getContractFactory("MockMerkleTree")
        mockTree = await fac.deploy()
        await mockTree.deployed()
    });
    it("Test lots of fees added and proper distributions", async function() {
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
        assert(await baseToken.balanceOf(charon.address) == web3.utils.toWei("500"), "charon has token balance")
        assert(await chd.balanceOf(charon.address) == web3.utils.toWei("500"), "charon has chd balance")
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
        //add fees for round 2
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
        assert(await baseToken.balanceOf(charon.address) == web3.utils.toWei("1000"), "charon has token balance")
        assert(await chd.balanceOf(charon.address) == web3.utils.toWei("1000"), "charon has chd balance")
        await h.advanceTime(86400 * 31)
        let _f2= await cfc.feePeriods(1)
        _queryData = abiCoder.encode(
            ['string', 'bytes'],
            ['CrossChainBalance', abiCoder.encode(
                ['uint256','address','uint256'],
                [1,cit.address,_f2]
            )]
            );
        _queryId = h.hash(_queryData)
        let block2 = await ethers.provider.getBlockNumber()
        let root2 = await Snap.getRootHash(block2)
        let ts2 = await cit.totalSupply()
        _value = abiCoder.encode(['bytes32','uint256'],[root2,ts2])
        await tellor.submitValue(_queryId, _value,0, _queryData);
        await h.advanceTime(86400/2)
        await cfc.endFeeRound()
        //withdraw round 1
        data = Snap.data[blockN]
        i = 4
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
        //add fees round 3
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
        assert(await baseToken.balanceOf(charon.address) == web3.utils.toWei("1500"), "charon has token balance")
        assert(await chd.balanceOf(charon.address) == web3.utils.toWei("1500"), "charon has chd balance")
        await h.advanceTime(86400 * 31)
        let _f3= await cfc.feePeriods(2)
        _queryData = abiCoder.encode(
            ['string', 'bytes'],
            ['CrossChainBalance', abiCoder.encode(
                ['uint256','address','uint256'],
                [1,cit.address,_f3]
            )]
            );
        _queryId = h.hash(_queryData)
        let block3 = await ethers.provider.getBlockNumber()
        let root3 = await Snap.getRootHash(block3)
        let ts3 = await cit.totalSupply()
        _value = abiCoder.encode(['bytes32','uint256'],[root3,ts3])
        await tellor.submitValue(_queryId, _value,0, _queryData);
        await h.advanceTime(86400/2)
        await cfc.endFeeRound()
        //withdraw round 2
        data = Snap.data[block2]
        i = 4
        for (key in data.sortedAccountList) {
            let account = data.sortedAccountList[key]
            for(j=0;j<5;j++){
                if(account == accounts[j].address){
                    i = j
                }
            }
            let tx = await Snap.getClaimTX(block2, account)
            assert(await cfc.getDidClaim(_f2,account)== false, "didn't claim already")
            let myBal = 2 * i * 100
            assert(data.balanceMap[account] - web3.utils.toWei(myBal.toString()) == 0, "balance should be correct")
            await cfc.claimRewards(_f2,account,data.balanceMap[account],tx.hashes, tx.hashRight)
            assert(await cfc.getDidClaim(_f2,account)== true, "did claim already")
            await h.expectThrow(cfc.claimRewards(_f2,account,web3.utils.toWei("100")*i,tx.hashes, tx.hashRight))
            assert(await baseToken.balanceOf(account) - 2* web3.utils.toWei("100")*i/2 == 0, "token balance should be claimed")
            assert(await chd.balanceOf(account) - 2 * web3.utils.toWei("100")*i/2 == 0, "chd balance should be claimed")
            i--
        }
        //withdraw all round 3
        data = Snap.data[block3]
        i = 4
        for (key in data.sortedAccountList) {
            let account = data.sortedAccountList[key]
            for(j=0;j<5;j++){
                if(account == accounts[j].address){
                    i = j
                }
            }
            let tx = await Snap.getClaimTX(block3, account)
            assert(await cfc.getDidClaim(_f3,account)== false, "didn't claim already")
            let myBal = 3 * i * 100
            assert(data.balanceMap[account] - web3.utils.toWei(myBal.toString()) == 0, "balance should be correct")
            await cfc.claimRewards(_f3,account,data.balanceMap[account],tx.hashes, tx.hashRight)
            assert(await cfc.getDidClaim(_f3,account)== true, "did claim already")
            await h.expectThrow(cfc.claimRewards(_f3,account,web3.utils.toWei("100")*i,tx.hashes, tx.hashRight))
            assert(await baseToken.balanceOf(account) - 3* web3.utils.toWei("100")*i/2 == 0, "token balance should be claimed")
            assert(await chd.balanceOf(account) - 3 *web3.utils.toWei("100")*i/2 == 0, "chd balance should be claimed")
            i--
        }
        assert(await baseToken.balanceOf(cfc.address)*1 < web3.utils.toWei(".001"), "all tokens should be gone")
        assert(await chd.balanceOf(cfc.address)*1 < web3.utils.toWei(".001"), "all tokens should be gone")
    });
});
