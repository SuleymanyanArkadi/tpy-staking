module.exports = async ({ deployments: { deploy }, ethers: { getNamedSigners } }) => {
	const { deployer } = await getNamedSigners();

	await deploy("TPYStaking", {
		from: deployer.address,
		contract: "TPYStaking",
		args: ["0x968Cbe62c830A0Ccf4381614662398505657A2A9"],
		log: true
	});
};

module.exports.tags = ["TPYStaking", "bsc-testnet"];
module.exports.dependencies = ["TPYToken"];
