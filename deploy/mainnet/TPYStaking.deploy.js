module.exports = async ({ deployments: { deploy }, ethers: { getNamedSigners } }) => {
	const { deployer } = await getNamedSigners();

	const tpyAddress = "0xa279301414012C53Bc7b7a21788d33E244efBECC";
	const treasuryAddress = "0xbA5664758f52f60e7d7B0FB0784dc4AcC1c39d45";
	
	await deploy("TPYStaking", {
		from: deployer.address,
		contract: "TPYStaking",
		args: [tpyAddress, treasuryAddress, deployer.address],
		log: true
	});
};

module.exports.tags = ["TPYStaking", "mainnet"];
