module.exports = async ({ deployments: { deploy }, ethers: { getNamedSigners, getContract } }) => {
	const { deployer } = await getNamedSigners();

	await deploy("TestToken", {
		from: deployer.address,
		contract: "TestToken",
		args: [],
		log: true
	});

	return await getContract("TestToken");
};

module.exports.tags = ["TestToken", "Hardhat"];
