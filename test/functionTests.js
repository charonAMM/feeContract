const { expect } = require("chai");
const { ethers } = require("hardhat");
const web3 = require('web3');
const { abi, bytecode } = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json");
const { assert } = require("console");


describe("fee contract - function tests", function() {
    let cit,tellor,baseToken,chd,charon,oraclePayment;
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
        charon = accounts[1]
        oraclePayment = accounts[2]
        fac = await ethers.getContractFactory("CFC");
        cfc = await fac.deploy(cit.address,charon.address,tellor.address,oraclePayment.address,web3.utils.toWei("10"),web3.utils.toWei("20"),web3.utils.toWei("50"),web3.utils.toWei("20") ;
        await cfc.deployed();
    });

    constructor(address _cit,address _charon, address _oracle, address _oraclePayment, uint256 _toOracle, uint256 _toLPs, uint256 _toHolders, uint256 _toUsers){
        CIT = _cit;
        charon = ICharon(_charon);
        oracle = IOracle(_oracle);
        oraclePayment = _oraclePayment;
        toOracle = _toOracle;
        toLPs = _toLPs;
        toHolders = _toHolders;
        toUsers = _toUsers;
        uint256 _endDate = block.timestamp + 30 days;
        feePeriods.push(_endDate);
        feePeriodByTimestamp[_endDate].endDate = _endDate;
        (address _a, address _b) = charon.getTokens();
        token = IERC20(_b);
        chd = IERC20(_a);
    }


    it("constructor()", async function() {
        assert(await cfc.CIT() == cit.address, "cit should be set")
        assert(await cfc.charon() == charon.address, "charon should be set")
        assert(await cfc.oracle() == tellor.address, "tellor should be set")
        assert(await cfc.oraclePayment() == oraclePayment.address, "oracle payment addrss should be set")
        assert(await cfc.toOracle() == web3.utils.toWei("10"), "toOracle should be set")
        assert(await cfc.toLPs() == web3.utils.toWei("20"), "toLPs should be set")
        assert(await cfc.toHolders() == web3.utils.toWei("50"), "toHolders should be set")
        assert(await cfc.toUsers() == web3.utils.toWei("20"), "toUsers should be set")
        let feePeriods = await cfc.feePeriods()
        assert(feePeriods[0] > 0, "first fee period shoud be set")
        let thisPeriod = await cfc.getFeePeriodByTimestamp(feePeriods[0])
        assert(thisPeriod.endDate == feePeriods[0], "end date should be set")
        assert(await cfc.token() == baseToken.address, "base token should be set")
        assert(await cfc.chd() ==chd.address, "chd should be set")

    });
    it("addFees()", async function() {
    });
    it("claimRewards()", async function() {
    });
    it("endFeeRound()", async function() {
    });
    it("getRootHashAndSuppl()", async function() {
    });
});
