//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "usingtellor/contracts/UsingTellor.sol";

/**
 @title Oracle
 @dev oracle contract for use in the charon system implementing tellor
 **/
contract Oracle is UsingTellor{

    /**
     * @dev constructor to launch contract 
     * @param _tellor address of tellor oracle contract on this chain
     */
    constructor(address payable _tellor) UsingTellor(_tellor){}

    /**
     * @dev grabs the oracle value from the tellor oracle
     * @param _chain chainID of ID with commitment deposit
     * @param _depositId depositId of the specific deposit
     * @return _value bytes data returned from tellor
     */
    function getCommitment(uint256 _chain, address _partnerContract, uint256 _depositId) public view returns(bytes memory _value){
        bytes memory _data = abi.encodeWithSelector(bytes4(keccak256("getOracleSubmission(uint256)")),_depositId);
        bytes32 _queryId = keccak256(abi.encode("EVMCall",abi.encode(_chain,_partnerContract,_data)));
        (_value,) = getDataBefore(_queryId,block.timestamp - 12 hours);
    }

    /**
     * @dev grabs the oracle value from the tellor oracle
     * @param _timestamp timestamp to grab
     * @param _address address of the CIT token on mainnet Ethereum
     */
    function getRootHashAndSupply(uint256 _timestamp,address _address) public view returns(bytes memory _value){
        bytes32 _queryId = keccak256(abi.encode("CrossChainBalance",abi.encode(1,_address,_timestamp)));
        (_value,_timestamp) = getDataBefore(_queryId,block.timestamp - 12 hours);
        require(_timestamp > 0, "timestamp must be present");
    }
}