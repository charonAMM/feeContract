//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

import "./interfaces/IOracle.sol";
import "./interfaces/ICharon.sol";
import "./helpers/MerkleTree.sol";
import "./interfaces/IERC20.sol";

/**
 @title CFC
 @dev charon fee contract for distributing fees and auction proceeds in the charon system
**/
contract CFC is MerkleTree{

    /*Storage*/
    struct FeePeriod{
        uint256 endDate;//end date of a given fee period (e.g. monthly fee payments)
        bytes32 rootHash;//rootHash of CIT token balance tree to allow holder reward distribution
        uint256 totalSupply;//total supply of CIT tokens for calculating payments to holders
        uint256 chdRewardsPerToken;//chd tokens due to each holder of cit tokens
        uint256 baseTokenRewardsPerToken;//base tokens due to each holder of cit tokens
    }

    uint256 public toOracle;//percent (e.g. 100% = 100e18) going to the oracle provider on this chain
    uint256 public toLPs;//percent (e.g. 100% = 100e18) going to LP's on this chain
    uint256 public toHolders;//percent (e.g. 100% = 100e18) going to Holders of the governance token
    uint256 public toUsers;//percent (e.g. 100% = 100e18) going to subsidize users (pay to mint CHD)
    uint256 public toDistributeToken;//amount of baseToken reward to distribute in contract
    uint256 public toDistributeCHD;//amount of chd in contract to distribute as rewards
    uint256[] public feePeriods;//a list of block numbers corresponding to fee periods
    mapping(uint256 => FeePeriod) feePeriodByTimestamp; //gov token balance
    mapping(uint256 => mapping(address => bool)) didClaim;//shows if a user already claimed reward
    ICharon public charon;//instance of charon on this chain
    IOracle public oracle;//oracle for reading cross-chain Balances
    address public oraclePayment;//payment address to fund all charon oracle queries
    address public CIT;//CIT address (on mainnet ethereum)
    IERC20 public token;//ERC20 base token instance
    IERC20 public chd;//chd token instance

    /*Events*/
    event FeeAdded(uint256 _amount, bool _isCHD);
    event FeeRoundEnded(uint256 _endDate, uint256 _baseTokenrRewardsPerToken, uint256 _chdRewardsPerToken);
    event RewardClaimed(address _account,uint256 _baseTokenRewards,uint256 _chdRewards);

    /*Functions*/
    /**
     * @dev Constructor to initialize token
     * @param _cit address of CIT token on mainnet
     * @param _charon address of charon on this chain
     * @param _oracle address of oracle for rootHash/supply
     * @param _oraclePayment address of oracle payment contract / party
     * @param _toOracle percentage (100% = 100e18) given to oraclePayment address
     * @param _toLPs percentage (100% = 100e18) given to LPs
     * @param _toHolders percentage (100% = 100e18) given to CIT token holders
     * @param _toUsers percentage (100% = 100e18) given to chd minters (users)
     */
    constructor(address _cit,address _charon, address _oracle, address _oraclePayment, uint256 _toOracle, uint256 _toLPs, uint256 _toHolders, uint256 _toUsers){
        CIT = _cit;
        charon = ICharon(_charon);
        oracle = IOracle(_oracle);
        oraclePayment = _oraclePayment;
        toOracle = _toOracle;
        toLPs = _toLPs;
        toHolders = _toHolders;
        toUsers = _toUsers;
        uint256 _endDate = block.timestamp + 30 days;
        feePeriods.push(_endDate);
        feePeriodByTimestamp[_endDate].endDate = _endDate;
        (address _a, address _b) = charon.getTokens();
        chd = IERC20(_a);
        token = IERC20(_b);
    }

    /**
     * @dev allows fees to be added to the CFC for distribution
     * @param _amount amount of tokens being sent to contract
     * @param _isCHD bool whether the token is CHD (base token if false)
     */
    function addFees(uint256 _amount, bool _isCHD) external{
        //send LP and User rewards over now
        uint256 _toLPs = _amount * toLPs / 100e18;
        uint256 _toUsers = _amount * toUsers / 100e18;
        if(_isCHD){
            require(chd.transferFrom(msg.sender,address(this), _amount), "should transfer amount");
            chd.approve(address(charon),_toUsers + _toLPs);
            toDistributeCHD += _amount;
            charon.addUserRewards(_toUsers,true);
            charon.addLPRewards(_toLPs, true);
        }
        else{
            require(token.transferFrom(msg.sender,address(this), _amount), "should transfer amount");
            token.approve(address(charon),_toUsers + _toLPs);
            toDistributeToken += _amount;
            charon.addUserRewards(_toUsers,false);
            charon.addLPRewards(_toLPs, false);
        }
        emit FeeAdded(_amount , _isCHD);
    }

    /**
     * @dev enables CIT token holders to claim rewards for a given fee period
     * @param _timestamp uint256 input of fee period end date
     * @param _account _address to pay out
     * @param _balance uint256 amount of CIT tokens the _account holds
     * @param _hashes bytes32 hashes in the balance to prove balance
     * @param _right bool array of if the corresponding hash is rightmost
     */
    function claimRewards(uint256 _timestamp, address _account, uint256 _balance, bytes32[] calldata _hashes, bool[] calldata _right) external{
        FeePeriod storage _f = feePeriodByTimestamp[_timestamp];
        require(!didClaim[_timestamp][_account], "can only claim once");
        didClaim[_timestamp][_account] = true;
        bytes32 _rootHash = _f.rootHash;
        bytes32 _myHash = keccak256(abi.encode(_account,_balance));
        if (_hashes.length == 1) {
            require(_hashes[0] == _myHash);
        } else {
            require(_hashes[0] == _myHash || _hashes[1] == _myHash || _hashes[2] == _myHash);
        }
        require(_inTree(_rootHash, _hashes, _right));//checks if your balance/account is in the merkleTree
        uint256 _baseTokenRewards = _f.chdRewardsPerToken * _balance / 1e18;
        uint256 _chdRewards =  _f.chdRewardsPerToken * _balance /1e18;
        if(_baseTokenRewards > 0){
            require(token.transfer(_account, _baseTokenRewards));
        }
        if(_chdRewards > 0){
            require(chd.transfer(_account, _chdRewards));  
        }
        emit RewardClaimed(_account,_baseTokenRewards,_chdRewards);
    }

    /**
     * @dev function called to end a given fee round and distribute payment to oracle and holders
     */
    function endFeeRound() external{
        FeePeriod storage _f = feePeriodByTimestamp[feePeriods[feePeriods.length - 1]];
        require(block.timestamp > _f.endDate + 12 hours, "round should be over and time for tellor");
        bytes memory _val = oracle.getRootHashAndSupply(_f.endDate,CIT);
        (bytes32 _rootHash, uint256 _totalSupply) = abi.decode(_val,(bytes32,uint256));
        _f.rootHash = _rootHash;
        _f.totalSupply = _totalSupply;
        uint256 _endDate = block.timestamp + 30 days;
        feePeriods.push(_endDate);
        feePeriodByTimestamp[_endDate].endDate = _endDate;
        _f.baseTokenRewardsPerToken = toDistributeToken * toHolders / (_totalSupply * 100);
        _f.chdRewardsPerToken = toDistributeCHD * toHolders  / (_totalSupply * 100);
        //CHD transfers
        uint256 _toOracle = toDistributeCHD * toOracle / 100e18;
        if(_toOracle > 0){
            require(chd.transfer(oraclePayment,_toOracle));
        }
        _toOracle = toDistributeToken * toOracle / 100e18;
        if(_toOracle > 0){
            require(token.transfer(oraclePayment, _toOracle));
        }
        toDistributeToken = 0;
        toDistributeCHD = 0;
        emit FeeRoundEnded(_f.endDate, _f.baseTokenRewardsPerToken, _f.chdRewardsPerToken);
    }

    //Getters
    /** 
     * @dev getter to show fee period variables for given endDate
     * @param _timestamp uint256 input of fee period end date
     * @return returns the FeePeriod variables (endDate, rootHash, totalSupply, chdRewardsPerToken, baseRewardsPerToken)
     */
    function getFeePeriodByTimestamp(uint256 _timestamp) external view returns(FeePeriod memory){
        return feePeriodByTimestamp[_timestamp];
    }

        /** 
     * @dev getter to show whether a fee has been claimed
     * @param _timestamp uint256 input of fee period end date
     * @param _account account your inquiring about
     * @return returns bool of if claimed
     */
    function getDidClaim(uint256 _timestamp, address _account) external view returns(bool){
        return didClaim[_timestamp][_account];
    }
}