const { expect,assert } = require("chai");
const { ethers } = require("hardhat");
const Web3 = require('web3')
const web3 = new Web3(hre.network.provider)
const { abi, bytecode } = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json");
const h = require("usingtellor/test/helpers/helpers.js");
const MerkleTree = require("../src/MerkleTree");
const abiCoder = new ethers.utils.AbiCoder()
const Snapshot = require("../src/Snapshot")


let _citAddres = "0x826c1A89F9A504631d81E41488B050C8B2Df56E7"
let _trialRoot = "0x8cee24c803a64646f1d2412d16187d5cbb9960598dd051f8d296288dbf65400c"
let _trialTs = web3.utils.toWei("20000.0")
let _myAddress = "0xD109A7BD41F2bECE58885f1B04b607B5034FfbeD"
let _myBalance = web3.utils.toWei("9999")
let myTxHashes = ["0xdb801bdf5cd149a2cb0f65d7e27664843d665ede5ebef2f0a5d5068a48f60436","0xdb801bdf5cd149a2cb0f65d7e27664843d665ede5ebef2f0a5d5068a48f60436","0x69cc28c6205e9c986390c143ee664088b6aea94890852723cb7c3ce67cfa92e6"]
let myTxHashRight = [ false, false, false ]

describe("trialTest - upload balance", function() {
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
        await cfc.setCit(_citAddres,1,chd.address)
        const initBlock = await hre.ethers.provider.getBlock("latest")
        Snap = new Snapshot(_citAddres, initBlock, web3)
        fac = await ethers.getContractFactory("MockMerkleTree")
        mockTree = await fac.deploy()
        await mockTree.deployed()
    });
    it("myTest()", async function() {
        //claim rewards, can't claim a bad reward
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
                [1,_citAddres,_f]
            )]
            );
        _queryId = h.hash(_queryData)
        let _value = abiCoder.encode(['bytes32','uint256'],[_trialRoot,_trialTs])
        await tellor.submitValue(_queryId, _value,0, _queryData);
        await h.advanceTime(86400/2)
        await cfc.endFeeRound()
        await cfc.claimRewards(_f,_myAddress,_myBalance  ,myTxHashes,myTxHashRight)
        assert(await cfc.getDidClaim(_f,_myAddress)== true, "didn't claim already")
        let _amount = web3.utils.toWei("500") * _myBalance / _trialTs;
        console.log(await chd.balanceOf(_myAddress) ,_amount)
        assert(await chd.balanceOf(_myAddress) == _amount, "chd should be paid")
        assert(await baseToken.balanceOf(_myAddress) == _amount, "baseToken should be paid")
    });
});
