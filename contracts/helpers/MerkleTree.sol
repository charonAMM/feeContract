// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

/**
 @title MerleTree
 @dev contract for verifying inclusion in a given a merkleTree
**/
contract MerkleTree {

    /*Functions*/
    /**
     * @dev Gets roothash of a given tree
     * @param _inputs bytes32[] of merkle tree inputs
     */
    function getRootHash(bytes32[] memory _inputs) public pure returns (bytes32) {
        uint256 _len = _inputs.length;
        if (_len == 1) {
            return _inputs[0];
        }
        bytes32[] memory _currentTree = new bytes32[](_len/2 + (_len) % 2);
        uint256 _index = 0;
        uint256 _maxIndex = _len - 1;
        bool _readInputs = true;
        bytes32 _newHash;
        bytes32 _hash1;
        while (true) {
            if (_readInputs) {
                _hash1 = _inputs[_index];
                if (_index + 1 > _maxIndex){
                    _newHash = keccak256(abi.encodePacked(_hash1,_hash1));
                }
                else {
                    _newHash = keccak256(abi.encodePacked(_hash1,_inputs[_index+1]));
                }
            }
            else {
                _hash1 = _currentTree[_index];
                if (_index + 1 > _maxIndex){
                    _newHash = keccak256(abi.encodePacked(_hash1,_hash1));
                }
                else {
                    _newHash = keccak256(abi.encodePacked(_hash1,_currentTree[_index+1]));
                }             
            }
            _currentTree[_index/2] = _newHash;
            _index += 2;
            if (_index > _maxIndex) {
                _maxIndex = (_index - 2) / 2;
                if (_maxIndex == 0) {
                    break;
                }
                _index = 0;
                _readInputs = false;
            }
        }
        return _currentTree[0];
    }  

    /** @dev Function to return true if a TargetHash was part of a tree
      * @param _rootHash the root hash of the tree
      * @param _hashTree The array of the hash items. The first is hashed with the second, the second with the third, etc.
      * @param _right bool array of if the corresponding hash is rightmost
      * @return A boolean wether `TargetHash` is part of the Merkle Tree with root hash `RootHash`. True if it is part of this tree, false if not. 
      */
    function _inTree(bytes32 _rootHash, bytes32[] memory _hashTree, bool[] memory _right) internal pure returns (bool) {
        bytes32 _cHash = _hashTree[0];
        for (uint256 _i=1;_i < _hashTree.length; _i++) {
            if (_right[_i]) {
                _cHash = keccak256(abi.encodePacked(_cHash, _hashTree[_i]));
            } else {
                _cHash = keccak256(abi.encodePacked(_hashTree[_i], _cHash));
            }
        }
        return (_cHash == _rootHash);
    }
}
