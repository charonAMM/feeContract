require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
const hre = require("hardhat");
const abiCoder = new ethers.utils.AbiCoder()
const h = require("usingtellor/test/helpers/helpers.js");
require("dotenv").config();
const web3 = require('web3');
const { abi, bytecode } = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json")

//npx hardhat run scripts/tellorSubmit.js --network sepolia
//to change

let _trialRoot = "0xa4906c4ad4c6466752ba567e33376c52e327634fae18d8a129c615be08f0d999"
let _trialTs = web3.utils.toWei("70000.0")
let _round = 0;


//Testnet vars
// let cfcAddy ="0x3beA65D139c47715695376324B9e22CbAb6460d8"//sepolia
//  let cfcAddy = "0x849aBD73C1Afc8571B2571074653e9225B4Ec79E"; //chiado
let cfcAddy = "0x3237cAF25CF3ee5aCf491Bc824E59923DCdEBd86"; //mumbai
let _citAddres = "0x23a363e59d915216a4a3fa751ade8dEAEa7A66BD"
let _citChain = 11155111; //if testnet
//let tellorAddress = "0x199839a4907ABeC8240D119B606C98c405Bb0B33"//sepolia
let tellorAddress = "0xD9157453E2668B2fc45b7A803D3FEF3642430cC0" //others

//don't touch from here on

async function tellorSubmit() {
    let _networkName = hre.network.name
    let tellor
    await run("compile")
    console.log("running oracle deposit on :  ", _networkName)

    //charonAMM
    tellor = await hre.ethers.getContractAt(abi, tellorAddress,hre.provider);
    let cfc = await hre.ethers.getContractAt("CFC", cfcAddy)
    let _f= await cfc.feePeriods(_round)
    let _feeData = await hre.ethers.provider.getFeeData();
    delete _feeData.lastBaseFeePerGas
    delete _feeData.gasPrice
    if(_networkName == "polygon" || _networkName == "mumbai"){
        _feeData = {"gasPrice":160000000000}
    }

    let _queryData = abiCoder.encode(
        ['string', 'bytes'],
        ['CrossChainBalance', abiCoder.encode(
            ['uint256','address','uint256'],
            [_citChain,_citAddres,_f]
        )]
        );
    _queryId = h.hash(_queryData)
    let _value = abiCoder.encode(['bytes32','uint256'],[_trialRoot,_trialTs])
    await tellor.estimateGas.submitValue(_queryId, _value,0, _queryData, _feeData);
    await tellor.submitValue(_queryId, _value,0, _queryData, _feeData);
    console.log("Tellor value pushed!! ")
}

tellorSubmit()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
