module.exports = async ({ deployments: { deploy }, ethers: { getNamedSigners } }) => {
	const { deployer } = await getNamedSigners();

	await deploy("TPYStaking", {
		from: deployer.address,
		contract: "TPYStaking",
		args: ["0x968Cbe62c830A0Ccf4381614662398505657A2A9", "0xbA5664758f52f60e7d7B0FB0784dc4AcC1c39d45", deployer.address],
		log: true
	});
};

module.exports.tags = ["TPYStaking", "mainnet"];
