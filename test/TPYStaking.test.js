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

describe("TPYStaking", function () {
	let deployer, caller, treasury, tpy, staking, reinvestPeriod, referrerReward;

	const setupFixture = createFixture(async () => {
		await fixture(["Hardhat"]);

		const tpy = await getContract("TPYToken");
		const staking = await getContract("TPYStaking");

		const reinvestPeriod = await staking.REINVEST_PERIOD();
		const referrerReward = await staking.referrerReward();
		await staking.addPool(12, reinvestPeriod);

		await tpy.transfer(caller.address, parseUnits("1000", 8));
		await tpy.transfer(staking.address, parseUnits("100000", 8));
		await tpy.approve(staking.address, constants.MaxUint256);
		await tpy.connect(caller).approve(staking.address, constants.MaxUint256);

		return [tpy, staking, reinvestPeriod, referrerReward];
	});

	before("Before All: ", async function () {
		({ deployer, caller, treasury } = await getNamedSigners());
	});

	beforeEach(async function () {
		[tpy, staking, reinvestPeriod, referrerReward] = await setupFixture();
	});

	describe("Initialization: ", function () {
		it("Should initialize with correct values", async function () {
			expect(await staking.tpy()).to.equal(tpy.address);
			expect(await staking.SECONDS_IN_YEAR()).to.equal(31557600);
			expect(referrerReward).to.equal(20);
			expect(reinvestPeriod).to.equal(2629800);
		});
	});

	describe("addPool: ", function () {
		it("Should add first pool", async function () {
			expect(await staking.poolInfo(0)).to.eql([
				false,
				BigNumber.from(reinvestPeriod),
				BigNumber.from(12),
				BigNumber.from(0),
				BigNumber.from(0)
			]);
		});

		it("Should add another 2 pools", async function () {
			await staking.addPool(20, 200000);
			await staking.addPool(30, 300000);

			expect(await staking.poolInfo(1)).to.eql([
				false,
				BigNumber.from(200000),
				BigNumber.from(20),
				BigNumber.from(0),
				BigNumber.from(0)
			]);
			expect(await staking.poolInfo(2)).to.eql([
				false,
				BigNumber.from(300000),
				BigNumber.from(30),
				BigNumber.from(0),
				BigNumber.from(0)
			]);
		});

		it("Should revert with 'TPYStaking::APY can't be 0'", async function () {
			await expect(staking.addPool(0, 100000)).to.be.revertedWith("TPYStaking::APY can't be 0");
		});
	});

	describe("changePool: ", function () {
		it("Should change existing pool apy", async function () {
			await staking.changePool(0, 20, reinvestPeriod);
			expect(await staking.poolInfo(0)).to.eql([
				false,
				BigNumber.from(reinvestPeriod),
				BigNumber.from(20),
				BigNumber.from(0),
				BigNumber.from(0)
			]);
		});

		it("Should change existing pool lockPeriod", async function () {
			await staking.changePool(0, 12, 10000);
			expect(await staking.poolInfo(0)).to.eql([
				false,
				BigNumber.from(10000),
				BigNumber.from(12),
				BigNumber.from(0),
				BigNumber.from(0)
			]);
		});

		it("Should revert with 'TPYStaking::APY can't be 0", async function () {
			await expect(staking.changePool(0, 0, 10000)).to.be.revertedWith("TPYStaking::APY can't be 0");
		});
	});

	describe("setReferrerReward: ", function () {
		it("Should change referrerReward", async function () {
			await staking.setReferrerReward(referrerReward * 2);

			expect(await staking.referrerReward()).to.eq(referrerReward * 2);
		});
	});

	describe("pausePool: ", function () {
		it("Should pause pool", async function () {
			await staking.setMockTime(1111);
			await staking.pausePool(0);

			expect(await staking.poolInfo(0)).to.eql([
				true,
				BigNumber.from(reinvestPeriod),
				BigNumber.from(12),
				BigNumber.from(0),
				BigNumber.from(1111)
			]);
		});

		it("Should revert with 'TPYStaking::Pool already paused'", async function () {
			await staking.setMockTime(1111);
			await staking.pausePool(0);

			await expect(staking.pausePool(0)).to.be.revertedWith("TPYStaking::Pool already paused");
		});
	});

	describe("stakeOfAuto: ", function () {
		it("Should still stake amount before reinvestPeriod passed", async function () {
			await staking.stake(0, parseUnits("1000", 8), 0);

			expect(await staking.stakeOfAuto(0, deployer.address)).to.eq(parseUnits("1000", 8));

			await staking.setMockTime(reinvestPeriod.sub(1));

			expect(await staking.stakeOfAuto(0, deployer.address)).to.eq(parseUnits("1000", 8));
		});

		it("Should change after reinvestPeriod passed", async function () {
			await staking.stake(0, parseUnits("1000", 8), 0);
			expect(await staking.stakeOfAuto(0, deployer.address)).to.eq(parseUnits("1000", 8));

			await staking.setMockTime(reinvestPeriod);
			expect(await staking.stakeOfAuto(0, deployer.address)).to.eq(parseUnits("1010", 8).sub(1));

			await staking.setMockTime(reinvestPeriod.mul(3));
			expect(await staking.stakeOfAuto(0, deployer.address)).to.eq(parseUnits("1030.301", 8).sub(1));

			await staking.setMockTime(reinvestPeriod.mul(10));
			expect(await staking.stakeOfAuto(0, deployer.address)).to.eq(parseUnits("1104.62212542", 8).sub(1));
		});

		it("Should return 0", async function () {
			expect(await staking.stakeOfAuto(0, deployer.address)).to.eq(0);
		});
	});

	describe("stake: ", function () {
		it("Should stake first time and set treasury address to referrer if caller has no stake", async function () {
			await expect(() => staking.stake(0, parseUnits("1000", 8), 10)).to.changeTokenBalances(
				tpy,
				[deployer, staking],
				[-parseUnits("1000", 8), parseUnits("1000", 8)]
			);

			expect(await staking.stakes(0, deployer.address)).to.eql([
				parseUnits("1000", 8),
				BigNumber.from(0),
				reinvestPeriod
			]);
			expect((await staking.poolInfo(0)).totalStakes).to.eq(parseUnits("1000", 8));
			expect(await staking.userReferrer(deployer.address)).to.eq(treasury.address);
		});

		it("Two users should stake", async function () {
			await staking.stake(0, parseUnits("1000", 8), 0);
			await staking.connect(caller).stake(0, parseUnits("1000", 8), 1);

			expect((await staking.poolInfo(0)).totalStakes).to.eq(parseUnits("2000", 8));
			expect(await staking.userReferrer(caller.address)).to.eq(deployer.address);
		});

		it("Should stake second time and reinvest assets", async function () {
			await staking.stake(0, parseUnits("100", 8), 0);

			await staking.setMockTime(reinvestPeriod.mul(10));
			const compReward = (await staking.stakeOfAuto(0, deployer.address)).sub(parseUnits("100", 8));

			await expect(() => staking.stake(0, parseUnits("100", 8), 2)).to.changeTokenBalances(
				tpy,
				[deployer, staking, treasury],
				[
					-parseUnits("100", 8),
					parseUnits("100", 8).sub(compReward.mul(referrerReward).div(100)),
					compReward.mul(referrerReward).div(100)
				]
			);
			expect(await staking.stakes(0, deployer.address)).to.eql([
				parseUnits("200", 8).add(compReward),
				reinvestPeriod.mul(10),
				reinvestPeriod.mul(11)
			]);
			expect((await staking.poolInfo(0)).totalStakes).to.eq(parseUnits("200", 8).add(compReward));
			expect(await staking.userReferrer(deployer.address)).to.eq(treasury.address);
		});

		it("Should revert with 'TPYStaking::Pool is paused'", async function () {
			await staking.pausePool(0);

			await expect(staking.stake(0, parseUnits("100", 8), 0)).to.be.revertedWith(
				"TPYStaking::Pool is paused"
			);
		});
	});

	describe("unstake: ", function () {
		it("Should unstake all after lock period passed", async function () {
			await staking.stake(0, parseUnits("100", 8), 0);

			await staking.setMockTime(reinvestPeriod);

			const compReward = (await staking.stakeOfAuto(0, deployer.address)).sub(parseUnits("100", 8));
			
			await expect(() => staking.unstake(0, constants.MaxUint256)).to.changeTokenBalances(
				tpy,
				[deployer, staking, treasury],
				[
					parseUnits("100", 8).add(compReward),
					-parseUnits("100", 8).add(compReward).add(compReward.mul(referrerReward).div(100)),
					compReward.mul(referrerReward).div(100)
				]
			);

			expect(await staking.stakes(0, deployer.address)).to.eql([
				BigNumber.from(0),
				BigNumber.from(0),
				BigNumber.from(0)
			]);
			expect((await staking.poolInfo(0)).totalStakes).to.eq(0);
			expect(await staking.userReferrer(deployer.address)).to.eq(treasury.address);
		});

		it("Should unstake part after lock period passed", async function () {
			await staking.stake(0, parseUnits("100", 8), 0);

			await staking.setMockTime(reinvestPeriod);

			const compReward = (await staking.stakeOfAuto(0, deployer.address)).sub(parseUnits("100", 8));
			
			await expect(() => staking.unstake(0, parseUnits("50", 8))).to.changeTokenBalances(
				tpy,
				[deployer, staking, treasury],
				[
					parseUnits("50", 8),
					-parseUnits("50", 8).add(compReward.mul(referrerReward).div(100)),
					compReward.mul(referrerReward).div(100)
				]
			);

			expect(await staking.stakes(0, deployer.address)).to.eql([
				parseUnits("50", 8).add(compReward),
				reinvestPeriod,
				reinvestPeriod
			]);
			expect((await staking.poolInfo(0)).totalStakes).to.eq(parseUnits("50", 8).add(compReward));
			expect(await staking.userReferrer(deployer.address)).to.eq(treasury.address);
		});

		it("Should revert with 'TPYStaking::Lock period don't passed!'", async function () {
			await staking.stake(0, parseUnits("100", 8), 0);

			await expect(staking.unstake(0, parseUnits("50", 8))).to.be.revertedWith(
				"TPYStaking::Lock period don't passed!"
			);
		});
	});
});
