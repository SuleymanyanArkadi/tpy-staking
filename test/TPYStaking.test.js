const { expect } = require("chai");
const {
	ethers: {
		getContract,
		getNamedSigners,
		utils: { parseUnits },
		BigNumber,
		constants
	},
	deployments: { fixture, createFixture }
} = require("hardhat");

const setupFixture = createFixture(async () => {
	await fixture(["Hardhat"]);

	const tpy = await getContract("TPYToken");
	const staking = await getContract("TPYStaking");

	const reinvestPeriod = await staking.reinvestPeriod();
	await staking.addPool(12, 100000);

	await tpy.approve(staking.address, constants.MaxUint256);

	return [tpy, staking, reinvestPeriod];
});

describe("TPYStaking", function () {
	let deployer, caller, /* minter, */ tpy, staking, reinvestPeriod;

	before("Before All: ", async function () {
		({ deployer, caller } = await getNamedSigners());
	});

	beforeEach(async function () {
		[tpy, staking, reinvestPeriod] = await setupFixture();
	});

	describe("Initialization: ", function () {
		it("Should initialize with correct values", async function () {
			expect(await staking.tpy()).to.equal(tpy.address);
			expect(await staking.referrerFee()).to.equal(10);
		});
	});

	describe("addPool: ", function () {
		it("Should add first pool", async function () {
			expect(await staking.poolInfo(0)).to.eql([BigNumber.from(100000), BigNumber.from(12), BigNumber.from(0)]);
		});

		it("Should add 3 pools", async function () {
			await staking.addPool(20, 200000);
			await staking.addPool(30, 300000);

			expect(await staking.poolInfo(0)).to.eql([BigNumber.from(100000), BigNumber.from(12), BigNumber.from(0)]);
			expect(await staking.poolInfo(1)).to.eql([BigNumber.from(200000), BigNumber.from(20), BigNumber.from(0)]);
			expect(await staking.poolInfo(2)).to.eql([BigNumber.from(300000), BigNumber.from(30), BigNumber.from(0)]);
		});

		it("Should revert with 'TPYStaking::Wrong pool params'", async function () {
			await expect(staking.addPool(0, 100000)).to.be.revertedWith("TPYStaking::Wrong pool params");
			await expect(staking.addPool(10, 0)).to.be.revertedWith("TPYStaking::Wrong pool params");
		});
	});

	describe("stake: ", function () {
		it("Should stake first time", async function () {
			await expect(() => staking.stake(0, parseUnits("1000", 8), caller.address)).to.changeTokenBalances(
				tpy,
				[deployer, staking],
				[-parseUnits("1000", 8), parseUnits("1000", 8)]
			);

			expect(await staking.stakes(0, deployer.address)).to.eql([parseUnits("1000", 8), BigNumber.from(0)]);
			expect((await staking.poolInfo(0)).totalStakes).to.eq(parseUnits("1000", 8));
		});

		it("Should stake second time and reinvest assets", async function () {
			await staking.stake(0, parseUnits("100", 8), caller.address);

			await staking.setMockTime(reinvestPeriod.mul(3));
			const compReward = (await staking.compound(parseUnits("100", 8), 12, 12, 3)).sub(parseUnits("100", 8));

			await expect(() => staking.stake(0, parseUnits("100", 8), caller.address)).to.changeTokenBalances(
				tpy,
				[deployer, staking, caller],
				[-parseUnits("100", 8), parseUnits("100", 8).sub(compReward.div(10)), compReward.div(10)]
			);
		});
	});
});
