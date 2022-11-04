module.exports = async ({ deployments: { deploy }, ethers: { getNamedSigners, getContract } }) => {
	const { deployer } = await getNamedSigners();

	const token = await getContract("TPYToken");

	await deploy("TPYStaking", {
		from: deployer.address,
		contract: "TPYStaking",
		args: [token.address],
		log: true
	});
};

module.exports.tags = ["TPYStaking", "Hardhat"];
module.exports.dependencies = ["TPYToken"];
