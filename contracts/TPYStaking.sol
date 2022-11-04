// SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./libs/ABDKMath64x64.sol";

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
    uint256 public referrerFee;

    PoolInfo[] public poolInfo;

    mapping(uint256 => mapping(address => UserStake)) public stakes;

    constructor(ERC20 _tpy) {
        tpy = _tpy;
    }

    function stake(uint256 pid_, uint256 amount_) external {
        // UserStake memory userStake = stakes[pid_][msg.sender];
        PoolInfo storage pool = poolInfo[pid_];

        // if (userStake.amount > 0) {
        //     rewardToMint = _reinvest();
        // }

        stakes[pid_][msg.sender] = UserStake({amount: amount_, checkpoint: block.number});
        pool.totalStakes += amount_;

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

        uint256 passedPeriods = (block.timestamp - userStake.checkpoint) / reinvestPeriod;

        result = compound(result, pool.apy, SECONDS_IN_YEAR / reinvestPeriod, passedPeriods);
    }

    // /**
    //  * @notice Reinvest user's rewards and change storage
    //  */
    // function _reinvest() private returns (uint256 result) {
    //     Stake storage userStake = autoStakes[msg.sender];

    //     result = rewardOfAuto(msg.sender);amount_
    //     userStake.amount = stakeOfAuto(msg.sender);
    //     userStake.checkpoint = block.number;
    // }

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
                    ABDKMath64x64.add(ABDKMath64x64.fromUInt(1), ABDKMath64x64.divu(apy_, periodsInYear_)),
                    n_
                ),
                principal_
            );
    }
}
