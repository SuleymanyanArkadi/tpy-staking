const { task } = require("hardhat/config");

require("./utils");
require("./deploy");

const { mint, burn, setMinterRole } = require("./BUniverseToken");

task("mint", "mint BUniverse Token", mint)
	.addParam("caller", "Name of account that called the function", "minter")
	.addParam("account", "Tokens will be minted to that account")
	.addParam("amount", "Amount of tokens to mint");

task("burn", "burn BUniverse Token", burn)
	.addParam("caller", "Name of account that called the function", "minter")
	.addParam("account", "Tokens will be burned from that account")
	.addParam("amount", "Amount of tokens to burn");

task("setMinterRole", "set MinterRole to the account", setMinterRole)
	.addParam("caller", "Name of account that called the function", "minter")
	.addParam("account", "The MinterRole will be set to that account");