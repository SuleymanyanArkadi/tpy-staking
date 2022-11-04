// SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import "../TPYStaking.sol";

contract TPYStakingMock is TPYStaking {
    uint256 public time;

    constructor(ERC20 token) TPYStaking(token) {}

    function setMockTime(uint256 time_) public returns (uint256) {
        time = time_;
        return time;
    }

    function getTime() internal view override returns (uint256) {
        return time;
    }
}