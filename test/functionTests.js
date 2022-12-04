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

    FeePeriod storage _f = feePeriodByTimestamp[feePeriods[feePeriods.length - 1]];
    require(block.timestamp > _f.endDate + 12 hours, "round should be over and time for tellor");
    bytes memory _val = oracle.getRootHashAndSupply(_f.endDate,CIT);
    (bytes32 _rootHash, uint256 _totalSupply) = abi.decode(_val,(bytes32,uint256));
    _f.rootHash = _rootHash;
    _f.totalSupply = _totalSupply;
    uint256 _endDate = block.timestamp + 30 days;
    feePeriods.push(_endDate);
    feePeriodByTimestamp[_endDate].endDate = _endDate;
    _f.baseTokenRewardsPerToken = toDistributeToken * toHolders/100e18 / _totalSupply;
    _f.chdRewardsPerToken = toDistributeCHD * toHolders/100e18 / _totalSupply;
    //CHD transfers
    uint256 _toOracle = toDistributeCHD * toOracle / 100e18;
    chd.transfer(oraclePayment,_toOracle);
    _toOracle = toDistributeToken * toOracle / 100e18;
    token.transfer(oraclePayment, _toOracle);
    toDistributeToken = 0;
    toDistributeCHD = 0;
    emit FeeRoundEnded(_f.endDate, _f.baseTokenRewardsPerToken, _f.chdRewardsPerToken);
}



    it("endFeeRound()", async function() {
        await baseToken.mint(accounts[2].address, web3.utils.toWei("100"))
        await baseToken.connect(accounts[2]).approve(cfc.address,web3.utils.toWei("100"))
        await cfc.connect(accounts[2]).addFees(web3.utils.toWei("100"),false);
        await chd.mint(accounts[2].address, web3.utils.toWei("100"))
        await chd.connect(accounts[2]).approve(cfc.address,web3.utils.toWei("100"))
        await cfc.connect(accounts[2]).addFees(web3.utils.toWei("100"),true);
        await h.expectThrow(cfc.endFeeRound())//hasn't been time
        await h.advanceTime(86400 * 31)
        await h.expectThrow(cfc.endFeeRound())//no oracle push yet
        //check all variables and actually run it
        let _queryData = abiCoder.encode(
            ['string', 'bytes'],
            ['CrossChainBalance', abiCoder.encode(
                ['uint256','address'],
                [1,cit.address]
            )]
            );
            _queryId = h.hash(_queryData)
        let _value = "0x3b696cbaa12880500df23f90cf5599987649df71fe24e830cc21fbb95891dbe7"
        await tellor.submitValue(_queryId, _value,0, _queryData);
        await h.advanceTime(86400/2)
        await cfc.endFeeRound()
        assert(await cfc.toDistributeCHD() == 0, "should zero out toDistributeCHD")
        assert(await cfc.toDistributeToken() == 0, "toDistributeToken should zero out")
        let toOracleToken = await cfc.toDistributeToken() * web3.utils.toWei("10")
        assert(await )


    });
    it("constructor()", async function() {
        console.log("oracle.sol")
        assert(await oracle.tellor() == tellor.address, "tellor address should be set properly")

    });
    it("getRootHashAndSupply()", async function() {
        let _queryData = abiCoder.encode(
            ['string', 'bytes'],
            ['CrossChainBalance', abiCoder.encode(
                ['uint256','address'],
                [1,accounts[1].address]
            )]
            );
            _queryId = h.hash(_queryData)
        let _value = 100
        await tellor.submitValue(_queryId, _value,0, _queryData);
        await h.advanceTime(86400)
        assert(await oracle.getRootHashAndSupply(1,1) == 100, "value should be correct")
    });
    it("inTree()", async function() {
        console.log("Merkle Tree Tests")
    });
    it("getRootHash", async function() {
    });
});
