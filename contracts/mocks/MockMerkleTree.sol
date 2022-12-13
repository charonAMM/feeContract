//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

import "../helpers/MerkleTree.sol";

/**
 @title MockMerkleTree
 @dev mock merkleTree to allow for testing internal functions
**/  
contract MockMerkleTree is MerkleTree{

    function inTree(bytes32 _rootHash, bytes32[] memory _hashTree, bool[] memory _right) public pure returns (bool) {
        return(_inTree(_rootHash,_hashTree,_right));
    }
}
