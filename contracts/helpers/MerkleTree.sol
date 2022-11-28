// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

contract MerkleTree {

    function GetRootHash(bytes32[] memory _Inputs) public pure returns (bytes32) {
        uint256 _len = _Inputs.length;
        if (_len == 1) {
            return _Inputs[0];
        }
        bytes32[] memory _CurrentTree = new bytes32[](_len/2 + (_len) % 2);
        uint256 _index = 0;
        uint256 _maxIndex = _len - 1;
        bool _readInputs = true;
        bytes32 _newHash;
        bytes32 _hash1;
        while (true) {
            if (_readInputs) {
                _hash1 = _Inputs[_index];
                if (_index + 1 > _maxIndex){
                    _newHash = keccak256(abi.encodePacked(_hash1,_hash1));
                }
                else {
                    _newHash = keccak256(abi.encodePacked(_hash1,_Inputs[_index+1]));
                }
            }
            else {
                _hash1 = _CurrentTree[_index];
                if (_index + 1 > _maxIndex){
                    _newHash = keccak256(abi.encodePacked(_hash1,_hash1));
                }
                else {
                    _newHash = keccak256(abi.encodePacked(_hash1,_CurrentTree[_index+1]));
                }             
            }
            _CurrentTree[_index/2] = _newHash;
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
        return _CurrentTree[0];
    }  

    /** @dev Function to return true if a TargetHash was part of a tree
      * @param _RootHash the root hash of the tree
      * @param _HashTree The array of the hash items. The first is hashed with the second, the second with the third, etc.
      * @return A boolean wether `TargetHash` is part of the Merkle Tree with root hash `RootHash`. True if it is part of this tree, false if not. 
      */
    function InTree(bytes32 _RootHash, bytes32[] memory _HashTree, bool[] memory _right) internal pure returns (bool) {
        bytes32 _CHash = _HashTree[0];
        for (uint256 _i=1;_i < _HashTree.length; _i++) {
            if (_right[_i]) {
                _CHash = keccak256(abi.encodePacked(_CHash, _HashTree[_i]));
            } else {
                _CHash = keccak256(abi.encodePacked(_HashTree[_i], _CHash));
            }
        }
        return (_CHash == _RootHash);
    }
}
