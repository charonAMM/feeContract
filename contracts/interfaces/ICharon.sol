// SPDX-License-Identifier: None
pragma solidity ^0.8.0;
import "./IERC20.sol";
/**
 * @dev Interface of the charonAMM contracts used by the CFC
 */
interface ICharon {
    function addRewards(uint256 _toUsers, uint256 _toLPs, uint256 _toOracle,bool _isCHD) external;
    function token() external view returns(IERC20);
}
