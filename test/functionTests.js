const { expect,assert } = require("chai");
const { ethers } = require("hardhat");
const web3 = require('web3');
const { abi, bytecode } = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json");
const h = require("usingtellor/test/helpers/helpers.js");
const abiCoder = new ethers.utils.AbiCoder()

describe("fee contract - function tests", function() {
    let cit,tellor,baseToken,chd,charon,oraclePayment,oracle;
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
        oraclePayment = accounts[2]
        fac = await ethers.getContractFactory("CFC");
        cfc = await fac.deploy(cit.address,charon.address,oracle.address,oraclePayment.address,web3.utils.toWei("10"),web3.utils.toWei("20"),web3.utils.toWei("50"),web3.utils.toWei("20"));
        await cfc.deployed();
    });
    it("constructor()", async function() {
        assert(await cfc.CIT() == cit.address, "cit should be set")
        assert(await cfc.charon() == charon.address, "charon should be set")
        assert(await cfc.oracle() == oracle.address, "tellor should be set")
        assert(await cfc.oraclePayment() == oraclePayment.address, "oracle payment addrss should be set")
        assert(await cfc.toOracle() == web3.utils.toWei("10"), "toOracle should be set")
        assert(await cfc.toLPs() == web3.utils.toWei("20"), "toLPs should be set")
        assert(await cfc.toHolders() == web3.utils.toWei("50"), "toHolders should be set")
        assert(await cfc.toUsers() == web3.utils.toWei("20"), "toUsers should be set")
        let feePeriod = await cfc.feePeriods(0)
        assert(feePeriod > 0, "first fee period shoud be set")
        let thisPeriod = await cfc.getFeePeriodByTimestamp(feePeriod)
        console.log(thisPeriod.endDate, feePeriod )
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
        assert(await baseToken.balanceOf(oraclePayment.address) == web3.utils.toWei("10"), "oracle payment should be correct" )
        assert(await chd.balanceOf(oraclePayment.address) == web3.utils.toWei("10"), "oracle payment chd should be correct")
        feePeriod = await cfc.feePeriods(1)
        let _f1 = await cfc.getFeePeriodByTimestamp(_f);
        assert(feePeriod > _f + 86400 * 30, "timestanp should be correct")
        assert(_f1.baseTokenRewardsPerToken == web3.utils.toWei("0.5"), "should be correct base rewards per token");
        assert(_f1.chdRewardsPerToken == web3.utils.toWei("0.5"), "should be correct chd rewards per token");
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
    });
    it("getRootHash", async function() {
    });
});
