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
	let deployer, caller, treasury, tpy, staking, reinvestPeriod, referrerReward, adminRole;

	const setupFixture = createFixture(async () => {
		await fixture(["Hardhat"]);

		const tpy = await getContract("TPYToken");
		const staking = await getContract("TPYStaking");

		const reinvestPeriod = await staking.REINVEST_PERIOD();
		const referrerReward = await staking.referrerReward();
		const adminRole = await staking.DEFAULT_ADMIN_ROLE();
		await staking.addPool(1200, reinvestPeriod);

		await tpy.transfer(caller.address, parseUnits("1000", 8));
		await tpy.transfer(staking.address, parseUnits("100000", 8));
		await tpy.approve(staking.address, constants.MaxUint256);
		await tpy.connect(caller).approve(staking.address, constants.MaxUint256);

		return [tpy, staking, reinvestPeriod, referrerReward, adminRole];
	});

	before("Before All: ", async function () {
		({ deployer, caller, treasury } = await getNamedSigners());
	});

	beforeEach(async function () {
		[tpy, staking, reinvestPeriod, referrerReward, adminRole] = await setupFixture();
	});

	describe("Initialization: ", function () {
		it("Should initialize with correct values", async function () {
			expect(await staking.tpy()).to.equal(tpy.address);
			expect(await staking.SECONDS_IN_YEAR()).to.equal(31557600);
			expect(await staking.idToAddress(0)).to.equal(treasury.address);
			expect(referrerReward).to.equal(20);
			expect(reinvestPeriod).to.equal(2629800);
		});
	});

	describe("addPool: ", function () {
		it("Should add first pool", async function () {
			expect(await staking.poolInfo(0)).to.eql([
				false,
				BigNumber.from(reinvestPeriod),
				BigNumber.from(1200),
				BigNumber.from(0),
				BigNumber.from(0)
			]);
		});

		it("Should add another 2 pools", async function () {
			await staking.addPool(2000, 200000);
			await staking.addPool(3000, 300000);

			expect(await staking.poolInfo(1)).to.eql([
				false,
				BigNumber.from(200000),
				BigNumber.from(2000),
				BigNumber.from(0),
				BigNumber.from(0)
			]);
			expect(await staking.poolInfo(2)).to.eql([
				false,
				BigNumber.from(300000),
				BigNumber.from(3000),
				BigNumber.from(0),
				BigNumber.from(0)
			]);
		});

		it("Should emit 'NewPool'", async function () {
			await expect(staking.addPool(3000, 300000)).to.emit(staking, "NewPool").withArgs(1, 3000, 300000);
		});

		it("Should revert with 'TPYStaking::APY can't be 0'", async function () {
			await expect(staking.addPool(0, 100000)).to.be.revertedWith("TPYStaking::APY can't be 0");
		});

		it("Should revert: Only admin", async function () {
			await expect(staking.connect(treasury).addPool(0, 100000)).to.be.revertedWith(
				`AccessControl: account ${treasury.address.toLowerCase()} is missing role ${adminRole}`
			);
		});
	});

	describe("changePool: ", function () {
		it("Should change existing pool apy", async function () {
			await staking.changePool(0, 2000, reinvestPeriod);
			expect(await staking.poolInfo(0)).to.eql([
				false,
				BigNumber.from(reinvestPeriod),
				BigNumber.from(2000),
				BigNumber.from(0),
				BigNumber.from(0)
			]);
		});

		it("Should change existing pool lockPeriod", async function () {
			await staking.changePool(0, 1200, 10000);
			expect(await staking.poolInfo(0)).to.eql([
				false,
				BigNumber.from(10000),
				BigNumber.from(1200),
				BigNumber.from(0),
				BigNumber.from(0)
			]);
		});

		it("Should revert with 'TPYStaking::APY can't be 0", async function () {
			await expect(staking.changePool(0, 0, 10000)).to.be.revertedWith("TPYStaking::APY can't be 0");
		});

		it("Should revert: Only admin", async function () {
			await expect(staking.connect(treasury).changePool(0, 0, 10000)).to.be.revertedWith(
				`AccessControl: account ${treasury.address.toLowerCase()} is missing role ${adminRole}`
			);
		});
	});

	describe("setReferrerReward: ", function () {
		it("Should change referrerReward", async function () {
			await staking.setReferrerReward(referrerReward * 2);

			expect(await staking.referrerReward()).to.eq(referrerReward * 2);
		});

		it("Should emit 'NewReferrerReward'", async function () {
			await expect(staking.setReferrerReward(referrerReward * 2))
				.to.emit(staking, "NewReferrerReward")
				.withArgs(referrerReward * 2);
		});

		it("Should revert: Only admin", async function () {
			await expect(staking.connect(treasury).setReferrerReward(referrerReward * 2)).to.be.revertedWith(
				`AccessControl: account ${treasury.address.toLowerCase()} is missing role ${adminRole}`
			);
		});
	});

	describe("setTreasuryAddress: ", function () {
		it("Should change treasury", async function () {
			await staking.stake(0, parseUnits("100", 8), 0);
			await staking.setMockTime(reinvestPeriod.add(reinvestPeriod.div(2)));
			await staking.unstake(0, parseUnits("50", 8));

			await staking.setTreasuryAddress(caller.address);
			expect(await staking.idToAddress(0)).to.eq(caller.address);

			await staking.setMockTime(reinvestPeriod.mul(3));
			const stake = (await staking.stakes(0, deployer.address)).amount;
			const compReward = (await staking.stakeOfAuto(0, deployer.address)).sub(stake);

			await expect(() => staking.unstake(0, parseUnits("50", 8))).to.changeTokenBalances(
				tpy,
				[deployer, staking, treasury, caller],
				[
					parseUnits("50", 8),
					-parseUnits("50", 8).add(compReward.mul(referrerReward).div(100)),
					BigNumber.from("0"),
					compReward.mul(referrerReward).div(100)
				]
			);
		});

		it("Should emit 'NewTreasury'", async function () {
			await expect(staking.setTreasuryAddress(caller.address))
				.to.emit(staking, "NewTreasury")
				.withArgs(caller.address);
		});

		it("Should revert: Only admin", async function () {
			await expect(staking.connect(treasury).setTreasuryAddress(deployer.address)).to.be.revertedWith(
				`AccessControl: account ${treasury.address.toLowerCase()} is missing role ${adminRole}`
			);
		});
	});

	describe("pausePool: ", function () {
		it("Should pause pool", async function () {
			await staking.setMockTime(1111);
			await staking.pausePool(0);

			expect(await staking.poolInfo(0)).to.eql([
				true,
				BigNumber.from(reinvestPeriod),
				BigNumber.from(1200),
				BigNumber.from(0),
				BigNumber.from(1111)
			]);
		});

		it("Should emit 'PausePool'", async function () {
			await staking.setMockTime(1000);

			await expect(staking.pausePool(0)).to.emit(staking, "PausePool").withArgs(0, 1000);
		});

		it("Should revert with 'TPYStaking::Pool already paused'", async function () {
			await staking.setMockTime(1111);
			await staking.pausePool(0);

			await expect(staking.pausePool(0)).to.be.revertedWith("TPYStaking::Pool already paused");
		});

		it("Should revert: Only admin", async function () {
			await expect(staking.connect(treasury).pausePool(0)).to.be.revertedWith(
				`AccessControl: account ${treasury.address.toLowerCase()} is missing role ${adminRole}`
			);
		});
	});

	describe("stakeOfAuto: ", function () {
		it("Should calculate only simple percent", async function () {
			await staking.stake(0, parseUnits("1000", 8), 0);

			expect(await staking.stakeOfAuto(0, deployer.address)).to.eq(parseUnits("1000", 8));

			await staking.setMockTime(reinvestPeriod.div(2));

			expect(await staking.stakeOfAuto(0, deployer.address)).to.eq(BigNumber.from("100499999999"));

			await staking.setMockTime(reinvestPeriod.sub(1));

			expect(await staking.stakeOfAuto(0, deployer.address)).to.eq(BigNumber.from("100999999618"));
		});

		it("Should change after reinvestPeriod passed", async function () {
			await staking.stake(0, parseUnits("1000", 8), 0);

			await staking.setMockTime(reinvestPeriod);
			expect(await staking.stakeOfAuto(0, deployer.address)).to.eq(parseUnits("1010", 8).sub(1));

			await staking.setMockTime(reinvestPeriod.mul(2).add(reinvestPeriod.div(2)));
			expect(await staking.stakeOfAuto(0, deployer.address)).to.eq(BigNumber.from("102520050000").sub(1));

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

		it("Should emit 'Stake'", async function () {
			await expect(staking.stake(0, parseUnits("100", 8), 0))
				.to.emit(staking, "Stake")
				.withArgs(deployer.address, 0, parseUnits("100", 8));
		});

		it("Should emit 'NewReferral'", async function () {
			await expect(staking.stake(0, parseUnits("100", 8), 0))
				.to.emit(staking, "NewReferral")
				.withArgs(deployer.address, treasury.address);
		});

		it("Should emit 'Restake'", async function () {
			await staking.stake(0, parseUnits("100", 8), 0);

			await staking.setMockTime(reinvestPeriod.mul(10));
			const compReward = (await staking.stakeOfAuto(0, deployer.address)).sub(parseUnits("100", 8));

			await expect(staking.stake(0, parseUnits("100", 8), 0))
				.to.emit(staking, "Restake")
				.withArgs(deployer.address, 0, compReward);
		});

		it("Should revert with 'TPYStaking::Pool is paused'", async function () {
			await staking.pausePool(0);

			await expect(staking.stake(0, parseUnits("100", 8), 0)).to.be.revertedWith("TPYStaking::Pool is paused");
		});
	});

	describe("unstake: ", function () {
		it("Should unstake all after lock period passed", async function () {
			await staking.stake(0, parseUnits("100", 8), 0);

			await staking.setMockTime(reinvestPeriod.add(reinvestPeriod.div(2)));

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

			await staking.setMockTime(reinvestPeriod.add(reinvestPeriod.div(2)));

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
				reinvestPeriod.add(reinvestPeriod.div(2)),
				reinvestPeriod
			]);
			expect((await staking.poolInfo(0)).totalStakes).to.eq(parseUnits("50", 8).add(compReward));
			expect(await staking.userReferrer(deployer.address)).to.eq(treasury.address);
		});

		it("Should emit 'Unstake'", async function () {
			await staking.stake(0, parseUnits("100", 8), 0);
			await staking.setMockTime(reinvestPeriod);

			await expect(staking.unstake(0, parseUnits("50", 8)))
				.to.emit(staking, "Unstake")
				.withArgs(deployer.address, 0, parseUnits("50", 8));
		});

		it("Should revert with 'TPYStaking::Lock period don't passed!'", async function () {
			await staking.stake(0, parseUnits("100", 8), 0);

			await expect(staking.unstake(0, parseUnits("50", 8))).to.be.revertedWith(
				"TPYStaking::Lock period don't passed!"
			);
		});
	});
});
