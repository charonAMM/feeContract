const { expect } = require("chai");
const { ethers } = require("hardhat");
const web3 = require('web3');
const { abi, bytecode } = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json");
const h = require("usingtellor/test/helpers/helpers.js");
const { assert } = require("console");


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
        let feePeriods = await cfc.feePeriods(0)
        assert(feePeriods > 0, "first fee period shoud be set")
        let thisPeriod = await cfc.getFeePeriodByTimestamp(feePeriods)
        assert(thisPeriod.endDate == feePeriods[0], "end date should be set")
        assert(await cfc.token() == baseToken.address, "base token should be set")
        assert(await cfc.chd() ==chd.address, "chd should be set")

    });
    it("addFees()", async function() {
        await baseToken.mint(accounts[2].address, web3.utils.toWei("100"))
        await h.expectThrow(cfc.connect(accounts[1]).addFees(web3.utils.toWei("100"),false))
        await baseToken.connect(accounts[2]).approve(cfc.address,web3.utils.toWei("100"))
        await cfc.connect(accounts[2]).addFees(web3.utils.toWei("100"),false);
        assert(await cfc.toDistributeToken() == web3.utils.toWei("60"), "amount of token to distribute should be set")
        await chd.mint(accounts[2].address, web3.utils.toWei("100"))
        await h.expectThrow(cfc.connect(accounts[2]).addFees(web3.utils.toWei("100"),true))
        await chd.connect(accounts[2]).approve(cfc.address,web3.utils.toWei("100"))
        await cfc.connect(accounts[2]).addFees(web3.utils.toWei("100"),true);
        assert(await cfc.toDistributeCHD() == web3.utils.toWei("60"), "amount of token to distribute should be set")
    });
    it("claimRewards()", async function() {
    });
    it("endFeeRound()", async function() {
    });
    it("constructor()", async function() {
        console.log("oracle.sol")
        assert(await oracle.tellor() == tellor.address, "tellor address should be set properly")

    });
    it("getRootHashAndSupply()", async function() {

    });
    it("InTree()", async function() {
        console.log("Merkle Tree Tests")
    });
    it("GetRootHash", async function() {
    });
});
