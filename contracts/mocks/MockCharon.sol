//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;
import "../interfaces/IERC20.sol";

/**
 @title MockCharon
 @dev mock contract to allow testing of adding LP and User rewards in the CFC system
**/  
contract MockCharon{

    IERC20 public baseToken;
    IERC20 public chd;

    constructor(address _chd, address _baseToken){
        chd = IERC20(_chd);
        baseToken = IERC20(_baseToken);
    }

    function addLPRewards(uint256 _amount,bool _isCHD) external{
      if(_isCHD){
        require(chd.transferFrom(msg.sender,address(this),_amount));
      }
      else{
        require(baseToken.transferFrom(msg.sender,address(this),_amount));
      }
    }

    function addUserRewards(uint256 _amount, bool _isCHD) external{
      if(_isCHD){
         require(chd.transferFrom(msg.sender,address(this),_amount));
      }
      else{
        require(baseToken.transferFrom(msg.sender,address(this),_amount));
      }
    }

    function getTokens() external view returns(address,address){
        return (address(chd),address(baseToken));
    }
}
