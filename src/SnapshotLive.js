const Web3 = require('web3')
const Web3_2 = require('web3')
const ERC20 = require('../artifacts/contracts/interfaces/IERC20.sol/IERC20.json')
const ERC20Snapshot = require('../artifacts/contracts/CFC.sol/CFC.json')

const MerkleTree = require("./MerkleTree")

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class SnapshotLive {

  constructor(address, blockNumber, web3, node2){
    this.target = address; // contract address
    this.blockNumber = blockNumber; // block number contract was deployed.
    this.web3 = web3;
    this.web2 = web3;
    this.contract2 = new this.web2.eth.Contract(ERC20.abi, this.target);
    this.contract = new this.web3.eth.Contract(ERC20.abi, this.target);
    this.node2 = node2;
    this.MerkleTree = new MerkleTree(web3);
    this.data = {};
  }

  setSnapshotContract(target) {
    this.snapshot = new this.web3.eth.Contract(ERC20Snapshot.abi, target);
  }

  async getAccountList(blockNumber){
    let accountMap = {};
    let balanceMap = {}
    let y = 0;
    let _shift = 25000
    let _toBlock;
    let acc
    while(y < blockNumber){
      _toBlock = y + _shift
      if(_toBlock > blockNumber){
        _toBlock = blockNumber
      }
      await this.contract.getPastEvents("Transfer", {
        fromBlock:y,
        toBlock: _toBlock,
      }).then(function(evtData){
        let index;
        for (index in evtData) {
          let evt = evtData[index];
          accountMap[evt.returnValues.to] = true;
        }
      });
      y += _shift
      console.log("Getting up to block: ",y)
    }
    let key;
    let accountList = [];
    console.log("getting balances..")
      // set provider for all later instances to use
    //await this.contract2.setProvider(this.node2);
    for (key in accountMap){
      let bal = await this.contract.methods.balanceOf(key).call({}, blockNumber);
      if(bal > 0){
        balanceMap[key] = bal;
        accountList.push(key);
      }
    }     
    return {accountList, balanceMap};
  }

  getSortedAccounts(accountList) {
    let sorted = accountList.sort(function(account1, account2){
      if (account1.toLowerCase() < account2.toLowerCase()){
        return -1;
      } else {
        return 1;
      }
    })
    return sorted;
  }

  getHashList(sortedAccountList, balanceMap) {
    let hashList = [];
    let key;
    for (key in sortedAccountList){
      let account = sortedAccountList[key];
      let balance = balanceMap[account];
      let hash = this.MerkleTree.getHash(account, balance);
      hashList.push(hash);
    }
    return hashList;
  }

  async getRootHash(blockNumber) {
    await this.setupData(blockNumber)
    return this.data[blockNumber].merkleRoot;
  }

  async setupData(blockNumber) {
    if (this.data[blockNumber]){
      return;
    }
    let accounts = await this.getAccountList(blockNumber);
    let sorted =  this.getSortedAccounts(accounts.accountList);
    let hashList = this.getHashList(sorted, accounts.balanceMap);
    let root = this.MerkleTree.getRoot(hashList);
    this.data[blockNumber] = {
      //accountList: accountList,
      sortedAccountList: sorted, 
      balanceMap: accounts.balanceMap, 
      hashList: hashList,
      merkleRoot: root
    }
  }

  async getClaimTX(blockNumber, account) {
    await this.setupData(blockNumber);
    let index;
    let key;
    let data = this.data[blockNumber];
    for (key in data.sortedAccountList) {
      if(key){
        let acct = data.sortedAccountList[key];
        if (acct == account){
          index = key;
          break;
        }
      }
    }
    let hashList = this.data[blockNumber].hashList;
    let proof = (this.MerkleTree.createProof(hashList, hashList[index]))
    return proof;
  }
}

module.exports = SnapshotLive;
