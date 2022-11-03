async function deployBUniverseToken({ msg }, { deployments: { deploy }, ethers: { getNamedSigners, getContract, utils } }) {
	const { deployer } = await getNamedSigners();

	await deploy("BUniverseToken", {
		from: deployer.address,
		contract: "BUniverseToken",
		args: [],
		log: true,
	});

	const bUniverseToken = await getContract("BUniverseToken");

	return bUniverseToken;
}

module.exports = {
	deployBUniverseToken
};
