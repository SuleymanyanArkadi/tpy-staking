module.exports = (network) => {
	const length = network.split("-").length;
	if (network.split("-")[length - 1] === "proxy") {
		network = network.slice(0, network.length - 6);
	}
	console.log(network);
	return {
		...require(`./${network}/contracts.json`),
		...require(`./${network}/BUniverseStaking.json`),
		...require(`./${network}/Tokens.json`)
	};
};
