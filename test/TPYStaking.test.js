// const { expect } = require("chai");
const {
	ethers: {
		getContract,
		// getNamedSigners,
		// utils: { parseEther }
	},
	deployments: { fixture, createFixture }
} = require("hardhat");

const setupFixture = createFixture(async () => {
	await fixture(["Hardhat"]);

	const tpyStaking = await getContract("TPYStaking");

	return [tpyStaking];
});

describe("TPYStaking", function () {
	let /* deployer, caller, minter, */ tpyStaking;

	before("Before All: ", async function () {
		// ({ deployer, caller, minter } = await getNamedSigners());
	});

	beforeEach(async function () {
		[tpyStaking] = await setupFixture();
	});

	describe("Initialization: ", function () {
		it("Should initialize with correct values", async function () {
			console.log((await tpyStaking.compound(10000000000, 12, 1200, 4)).toString());
		});
	});
});
