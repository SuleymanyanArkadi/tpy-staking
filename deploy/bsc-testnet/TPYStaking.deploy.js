module.exports = async ({ deployments: { deploy }, ethers: { getNamedSigners, getContract } }) => {
	const { deployer, treasury } = await getNamedSigners();

	const token = await getContract("TPYToken");

	await deploy("TPYStaking", {
		from: deployer.address,
		contract: "TPYStaking",
		args: [token.address, treasury.address],
		log: true
	});
};

module.exports.tags = ["TPYStaking", "bsc-testnet"];
module.exports.dependencies = ["TPYToken"];
