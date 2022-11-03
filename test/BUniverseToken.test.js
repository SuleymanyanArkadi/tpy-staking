const { expect } = require("chai");
const {
	ethers: {
		getContract,
		getNamedSigners,
		utils: { parseEther }
	},
	deployments: { fixture, createFixture }
} = require("hardhat");
const setupFixture = createFixture(async () => {
	await fixture(["Hardhat"]);

	const bUniverseToken = await getContract("BUniverseToken");

	const role = await bUniverseToken.ROLE_MINTER();

	return [bUniverseToken, role];
});

describe("BuniverseToken", function () {
	let deployer, caller, minter, bUniverseToken, role;

	before("Before All: ", async function () {
		({ deployer, caller, minter } = await getNamedSigners());
	});

	beforeEach(async function () {
		[bUniverseToken, role] = await setupFixture();
	});

	describe("Initialization: ", function () {
		it("Should initialize with correct values", async function () {
			expect(await bUniverseToken.hasRole(role, deployer.address)).to.equal(true);
			expect(await bUniverseToken.totalSupply()).to.equal(parseEther("1000000"));
			expect(await bUniverseToken.name()).to.equal("BUniverse Token");
			expect(await bUniverseToken.symbol()).to.equal("BUNI");
			expect(await bUniverseToken.decimals()).to.equal(18);
		});
	});

	describe("SetMinterRole function: ", function () {
		it("Should grand MinterRole to the account", async function () {
			expect(await bUniverseToken.hasRole(role, minter.address)).to.equal(false);
			await bUniverseToken.connect(deployer).setMinterRole(minter.address);

			expect(await bUniverseToken.hasRole(role, minter.address)).to.equal(true);
		});
	});

	describe("Mint function: ", function () {
		it("Should revert due to accessControl", async function () {
			await expect(bUniverseToken.connect(caller).mint(caller.address, parseEther("1000"))).to.be.reverted;
		});

		it("Should mint given amount of tokens to given account", async function () {
			await bUniverseToken.connect(deployer).setMinterRole(minter.address);

			await expect(() =>
				bUniverseToken.connect(deployer).mint(caller.address, parseEther("1000"))
			).to.changeTokenBalance(bUniverseToken, caller, parseEther("1000"));
		});
	});

	describe("Burn function: ", function () {
		it("Should revert due to accessControl", async function () {
			await expect(bUniverseToken.connect(caller).burn(caller.address, parseEther("1000"))).to.be.reverted;
		});

		it("Should burn given amount of tokens from given account", async function () {
			await bUniverseToken.connect(deployer).setMinterRole(minter.address);
			await bUniverseToken.connect(deployer).mint(caller.address, parseEther("0.001"));

			await expect(() =>
				bUniverseToken
					.connect(caller)
					.burn(caller.address, parseEther("0.001"))
					.to.changeTokenBalance(bUniverseToken, caller, -1000000000000000)
			);
		});
	});
});
