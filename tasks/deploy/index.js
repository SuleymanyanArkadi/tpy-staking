const { task } = require("hardhat/config");
const {
	deployBUniverseToken
} = require("./deploy");

task("deploy:bUniverseToken", "Deploy BUniverseToken contract", deployBUniverseToken);