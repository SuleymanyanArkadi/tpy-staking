module.exports = async ({ deployments: { deploy }, ethers: { getNamedSigners, getContract } }) => {
	const { deployer } = await getNamedSigners();

	const token = await getContract("TPYToken");

	await deploy("TPYStaking", {
		from: deployer.address,
		contract: "TPYStakingMock",
		args: [token.address, deployer.address, deployer.address],
		log: true
	});
};

module.exports.tags = ["TPYStaking", "bsc-testnet"];
module.exports.dependencies = ["TPYToken"];
