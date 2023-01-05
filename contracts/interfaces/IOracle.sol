// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 @title IOracle
 @dev oracle interface for the CFC contract
**/
interface IOracle {
    function getRootHashAndSupply(uint256 _timestamp,uint256 _chainID, address _address) external view returns(bytes memory _value);
}