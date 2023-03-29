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
//npx hardhat run scripts/generateCCB.js --network goerli

const token = "0x826c1A89F9A504631d81E41488B050C8B2Df56E7"
const myAddress = "0xD109A7BD41F2bECE58885f1B04b607B5034FfbeD"
const blockNumber = 8739000

async function getRootHashandTS(node2) {
    let CIT = await hre.ethers.getContractAt("Token", token)
    Snap = new SnapshotLive(token, blockNumber, web3, node2)
    let root = await Snap.getRootHash(blockNumber)
    console.log("blockNumber", blockNumber);
    console.log("myRootHash", root);
    console.log("my balance",ethers.utils.formatEther(await CIT.balanceOf(myAddress)) )
    console.log("total Supply", ethers.utils.formatEther(await CIT.totalSupply()))
    let tx = await Snap.getClaimTX(blockNumber, myAddress)
    console.log("tx Hashes: ", tx.hashes)
    console.log("tx Right: ", tx.hashRight)
}


getRootHashandTS(process.env.NODE_URL)
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

