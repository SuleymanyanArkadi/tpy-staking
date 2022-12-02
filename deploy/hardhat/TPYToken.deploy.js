module.exports = async ({deployments: { deploy }, ethers: { getNamedSigners, getContract }}) => {
	const { deployer } = await getNamedSigners();

	await deploy("TPYToken", {
		from: deployer.address,
		contract: "TPYToken",
		args: [],
		log: true,
	});

	return await getContract("TPYToken");
};

module.exports.tags = ["TPYToken", "Hardhat"];
