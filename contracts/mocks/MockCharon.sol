//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

/**
 @title MockERC20
 @dev mock token contract to allow minting and burning for testing
**/  
contract MockCharon{

    address public chd;
    address public baseToken;

    constructor(address _chd, address _baseToken){
        chd = _chd;
        baseToken = _baseToken;
    }

    function getTokens() external returns(address,address){
        return (chd,baseToken);
    }
}
