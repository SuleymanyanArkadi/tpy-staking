// SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract BUniverseToken is ERC20, AccessControl {
    bytes32 public constant ROLE_MINTER = keccak256("ROLE_MINTER");

    constructor() ERC20("BUniverse Token", "BUNI") {
        _setupRole(ROLE_MINTER, msg.sender);
        _mint(msg.sender, 1e6 * 1e18);
    }

    function mint(address account, uint256 amount) external onlyRole(ROLE_MINTER) {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external onlyRole(ROLE_MINTER) {
        _burn(account, amount);
    }

    function setMinterRole(address account) external onlyRole(ROLE_MINTER) {
        _grantRole(ROLE_MINTER, account);
    }
}
