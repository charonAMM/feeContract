//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;
import "../interfaces/IERC20.sol";

/**
 @title MockCharon
 @dev mock contract to allow testing of adding LP and User rewards in the CFC system
**/  
contract MockCharon{

    IERC20 public token;
    IERC20 public chd;

    constructor(address _chd, address _baseToken){
        chd = IERC20(_chd);
        token = IERC20(_baseToken);
    }

    function addRewards(uint256 _toUsers, uint256 _toLPs, uint256 _toOracle,bool _isCHD) external{
      if(_isCHD){
        require(chd.transferFrom(msg.sender,address(this),_toUsers + _toLPs + _toOracle));
      }
      else{
        require(token.transferFrom(msg.sender,address(this),_toUsers + _toLPs + _toOracle));
      }
    }
}
