async function mint({ caller, account, amount }, { ethers: { getNamedSigners, getContract } }) {
	const signers = await getNamedSigners();

	const bUniverseToken = await getContract("BUniverseToken");
	await bUniverseToken.connect(signers[caller]).mint(signers[account].address, amount);
}

async function burn({ caller, account, amount }, { ethers: { getNamedSigners, getContract } }) {
	const signers = await getNamedSigners();

	const bUniverseToken = await getContract("BUniverseToken");
	await bUniverseToken.connect(signers[caller]).burn(signers[account].address, amount);
}

async function setMinterRole({ caller, account }, { ethers: { getNamedSigners, getContract } }) {
	const signers = await getNamedSigners();

	const bUniverseToken = await getContract("BUniverseToken");

	await bUniverseToken.connect(signers[caller]).setMinterRole(signers[account].address);
}

module.exports = {
	mint,
	burn,
	setMinterRole
};
