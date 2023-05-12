module.exports = async ({ deployments: { deploy }, ethers: { getNamedSigners, getContract } }) => {
	const { deployer } = await getNamedSigners();

	const token = { address: "0xda11769dDf10561ee1E115E3F365fcd59bE0a0da" };
	// const token = await getContract("TPYToken");

	await deploy("TPYStaking", {
		from: deployer.address,
		contract: "TPYStaking",
		args: [token.address, deployer.address, deployer.address],
		log: true
	});
};

module.exports.tags = ["TPYStaking", "testnet"];
module.exports.dependencies = ["TPYToken"];
