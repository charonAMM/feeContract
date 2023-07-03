require("@nomiclabs/hardhat-waffle")
const Web3 = require('web3')
const web3 = new Web3(hre.network.provider)
const { expect } = require("chai")
const { ethers } = require("hardhat")
const { abi, bytecode } = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json")
const h = require("usingtellor/test/helpers/helpers.js")
const assert = require('chai').assert
const MerkleTreeJS = require("../src/MerkleTree")
const MerkleTree = new MerkleTreeJS(Web3)
const SnapshotLive= require("../src/SnapshotLive")
require("dotenv").config();
//npx hardhat run scripts/generateCCB.js --network sepolia

const token = "0x23a363e59d915216a4a3fa751ade8dEAEa7A66BD"//sep
const myAddress = "0xACE235Da5C594C3DdE316393Ad59a6f55F930be8"
//const token = "0xA236e0a9fCCBd3BFcbb9Ed8aB4EEFEEBcbE58458"//gnosis
// const myAddress = "0xf288EB2539BfE8883747fa4513F1613e98cfc33B"
const blockNumber = 3615835

async function getRootHashandTS() {

    let CIT = await hre.ethers.getContractAt("Token", token)
    Snap = new SnapshotLive(token, blockNumber, web3)
    console.log("here")
    let root = await Snap.getRootHash(blockNumber)
    console.log("blockNumber", blockNumber);
    console.log("myRootHash", root);
    console.log("my balance",ethers.utils.formatEther(await CIT.balanceOf(myAddress)) )
    console.log("total Supply", ethers.utils.formatEther(await CIT.totalSupply()))
    let tx = await Snap.getClaimTX(blockNumber, myAddress)
    console.log(tx)
    console.log("tx Hashes: ", tx.hashes)
    console.log("tx Right: ", tx.hashRight)
}


getRootHashandTS()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

