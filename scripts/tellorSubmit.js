require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
const hre = require("hardhat");
const abiCoder = new ethers.utils.AbiCoder()
const h = require("usingtellor/test/helpers/helpers.js");
require("dotenv").config();
const web3 = require('web3');
const { abi, bytecode } = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json")


//npx hardhat run scripts/tellorPush.js --network chiado
tellorAddress = "0xD9157453E2668B2fc45b7A803D3FEF3642430cC0"

let _citAddres = "0x826c1A89F9A504631d81E41488B050C8B2Df56E7"
let _trialRoot = "0x8cee24c803a64646f1d2412d16187d5cbb9960598dd051f8d296288dbf65400c"
let _trialTs = web3.utils.toWei("20000.0")


async function tellorPush() {
    let _networkName = hre.network.name
    let tellor
    await run("compile")
    console.log("running oracle deposit on :  ", _networkName)

    //charonAMM
    tellor = await hre.ethers.getContractAt(abi, tellorAddress,hre.provider);

    let _f= 911//await cfc.feePeriods(0)
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
    console.log("Tellor value pushed!! ")
}

tellorPush()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
