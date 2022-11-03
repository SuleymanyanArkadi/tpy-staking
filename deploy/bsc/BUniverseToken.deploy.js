module.exports = async ({
	run,
	ethers: {
		getContractAt,
		getNamedSigners,
		utils: { parseEther }
	}
}) => {
	await run("deploy:bUniverseToken");
};
module.exports.tags = ["BUniverseToken", "bsc"];
