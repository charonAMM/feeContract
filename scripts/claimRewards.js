require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
const hre = require("hardhat");
require("dotenv").config();

//npx hardhat run scripts/claimRewards.js --network sepolia
//to change
let _round = 0;
let _account = "0xACE235Da5C594C3DdE316393Ad59a6f55F930be8"
let _balance = ethers.utils.parseEther("50000")
let _hashes = ['0xa4906c4ad4c6466752ba567e33376c52e327634fae18d8a129c615be08f0d999']
let _right = [false]


//Testnet vars
//let cfcAddy ="0x3beA65D139c47715695376324B9e22CbAb6460d8"//sepolia
//let cfcAddy = "0x849aBD73C1Afc8571B2571074653e9225B4Ec79E"; //chiado
let cfcAddy = "0x3237cAF25CF3ee5aCf491Bc824E59923DCdEBd86"; //mumbai
//don't touch from here on

async function claimRewards() {
    let _networkName = hre.network.name
    await run("compile")
    console.log("claiming rewards on :  ", _networkName)

    let cfc = await hre.ethers.getContractAt("CFC", cfcAddy)
    let _timestamp = await cfc.feePeriods(_round)
    let _feeData = await hre.ethers.provider.getFeeData();
    delete _feeData.lastBaseFeePerGas
    delete _feeData.gasPrice
    if(_networkName == "polygon" || _networkName == "mumbai"){
        _feeData = {"gasPrice":160000000000}
    }
    console.log(_timestamp,_account,_balance,_hashes,_right);
    await cfc.estimateGas.claimRewards(_timestamp,_account,_balance,_hashes,_right,_feeData);
    await cfc.claimRewards(_timestamp,_account,_balance,_hashes,_right,_feeData);
    console.log("rewards claimed!!")
}

claimRewards()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
