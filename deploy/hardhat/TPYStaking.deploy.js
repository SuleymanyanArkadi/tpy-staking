module.exports = async ({ deployments: { deploy }, ethers: { getNamedSigners, getContract } }) => {
	const { deployer, treasury } = await getNamedSigners();

	const token = await getContract("TPYToken");

	await deploy("TPYStaking", {
		from: deployer.address,
		contract: "TPYStakingMock",
		args: [token.address, treasury.address, deployer.address],
		log: true
	});
};

module.exports.tags = ["TPYStaking", "Hardhat"];
module.exports.dependencies = ["TPYToken"];
