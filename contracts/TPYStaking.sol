// SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./libs/ABDKMath64x64.sol";
import "hardhat/console.sol";

contract TPYStaking {
    struct PoolInfo {
        uint256 lockPeriod;
        uint256 apy;
        uint256 totalStakes;
    }

    struct UserStake {
        uint256 amount;
        uint256 checkpoint;
    }

    ERC20 public immutable tpy;
    uint256 public constant SECONDS_IN_YEAR = 1200;
    uint256 public reinvestPeriod = 100;
    uint256 public referrerFee = 10;

    PoolInfo[] public poolInfo;

    mapping(uint256 => mapping(address => UserStake)) public stakes;
    mapping(address => address) public referalToReferrer;

    constructor(ERC20 _tpy) {
        tpy = _tpy;
    }

    function addPool(uint256 apy_, uint256 lockPeriod_) external {
        require(apy_ != 0 && lockPeriod_ != 0, "TPYStaking::Wrong pool params");

        poolInfo.push(PoolInfo({
            lockPeriod: lockPeriod_,
            apy: apy_,
            totalStakes: 0
        }));
    }

    function stake(uint256 pid_, uint256 amount_, address referrer_) external {
        require(poolInfo[pid_].lockPeriod != 0, "TPYStaking::Wrong pid");

        UserStake storage userStake = stakes[pid_][msg.sender];

        if(referalToReferrer[msg.sender] == address(0)) {
            referalToReferrer[msg.sender] = referrer_;
        }
        if (userStake.amount > 0) {
            reinvest(pid_);
        }

        userStake.amount += amount_;
        userStake.checkpoint = getTime();
        poolInfo[pid_].totalStakes += amount_;

        tpy.transferFrom(msg.sender, address(this), amount_);
    }

    /**
     * @notice Get current amount of user's stake including rewards
     * @param user_: User's address
     */
    function stakeOfAuto(uint256 pid_, address user_) public view returns (uint256 result) {
        UserStake memory userStake = stakes[pid_][user_];
        PoolInfo memory pool = poolInfo[pid_];

        result = userStake.amount;
        if (result <= 0) {
            return result;
        }

        uint256 passedPeriods = (getTime() - userStake.checkpoint) / reinvestPeriod;
        
        result = compound(result, pool.apy, SECONDS_IN_YEAR / reinvestPeriod, passedPeriods);
    }

    /**
     * @notice Reinvest user's rewards and change storage
     */
    function reinvest(uint256 pid_) public returns (uint256 result) {
        UserStake storage userStake = stakes[pid_][msg.sender];
        require(userStake.amount > 0, "TPYStaking::No stake");

        uint256 userReward = stakeOfAuto(pid_, msg.sender) - userStake.amount;
        uint256 referrerReward = userReward * referrerFee / 100;

        userStake.amount += userReward - referrerReward;
        userStake.checkpoint = block.number;
        poolInfo[pid_].totalStakes += userReward - referrerReward;

        tpy.transfer(referalToReferrer[msg.sender], referrerReward);
    }

    /**
     * @notice Calculate compound ROI
     * @param principal_: User stake amount
     * @param n_: Number of passed periods
     */
    function compound(
        uint256 principal_,
        uint256 apy_,
        uint256 periodsInYear_,
        uint256 n_
    ) public pure returns (uint256) {
        return
            ABDKMath64x64.mulu(
                ABDKMath64x64.pow(
                    ABDKMath64x64.add(ABDKMath64x64.fromUInt(1), ABDKMath64x64.divu(apy_, periodsInYear_ * 100)),
                    n_
                ),
                principal_
            );
    }

    function getTime() internal view virtual returns (uint256) {
        return block.timestamp;
    }
}
