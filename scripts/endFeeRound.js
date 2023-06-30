require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
const hre = require("hardhat");
const abiCoder = new ethers.utils.AbiCoder()
const h = require("usingtellor/test/helpers/helpers.js");
require("dotenv").config();
const web3 = require('web3');
const { abi, bytecode } = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json")

//npx hardhat run scripts/endFeeRound.js --network sepolia

//Testnet vars
//let cfcAddy ="0x3beA65D139c47715695376324B9e22CbAb6460d8"//sepolia
//  let cfcAddy = "0x849aBD73C1Afc8571B2571074653e9225B4Ec79E"; //chiado
let cfcAddy = "0x3237cAF25CF3ee5aCf491Bc824E59923DCdEBd86"; //mumbai

//don't touch from here on
async function endFeeRound() {
    let _networkName = hre.network.name
    await run("compile")
    console.log("ending fee round on :  ", _networkName)

    let cfc = await hre.ethers.getContractAt("CFC", cfcAddy)
    let _feeData = await hre.ethers.provider.getFeeData();
    delete _feeData.lastBaseFeePerGas
    delete _feeData.gasPrice
    if(_networkName == "polygon" || _networkName == "mumbai"){
        _feeData = {"gasPrice":160000000000}
    }

    await cfc.estimateGas.endFeeRound(_feeData);
    await cfc.endFeeRound(_feeData);
    console.log("Fee round ended!!")
}

endFeeRound()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
