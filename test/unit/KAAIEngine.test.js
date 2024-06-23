// We are going to skip a bit on these tests...

const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-config");
const { accessListify } = require("ethers/lib/utils");

//writing the test code from here..

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("KAAIEngine", function () {
          let deployer,
              KAAIEngine,
              KAAIEngineContract,
              weth,
              wethAddress,
              kaai,
              ethContract,
              wethContract,
              kaaiContract,
              user,
              ethAggregatorContract;

          beforeEach(async () => {
              accounts = await ethers.getSigners();
              deployer = accounts[0];
              await deployments.fixture(["all"]);
              KAAIEngine = await deployments.get("KAAIEngine");
              wbtc = await deployments.get("WbtcMock");
              weth = await deployments.get("WethMock");
              ethAggregator = await deployments.get("EthAggregator");
              ethAggregatorContract = await ethers.getContractAt(
                  "EthAggregator",
                  ethAggregator.address,
                  deployer
              );
              ethContract = await ethers.getContractAt(
                  "EthAggregator",
                  ethAggregator.address,
                  deployer
              );
              btcAggregator = await deployments.get("BtcAggregator");
              wethAddress = weth.address;
              KAAIEngineContract = await ethers.getContractAt(
                  "KAAIEngine",
                  KAAIEngine.address,
                  deployer
              );
              user = await ethers.getContractAt(
                  "KAAIEngine",
                  KAAIEngine.address,
                  accounts[1]
              );
              wethContract = await ethers.getContractAt(
                  "WethMock",
                  wethAddress,
                  deployer
              );
              wethContract.mint(accounts[1].address, BigInt(2000e18).toString());
              kaai = await deployments.get("DecentralizedStableCoin");
              kaaiContract = await ethers.getContractAt(
                  "DecentralizedStableCoin",
                  kaai.address,
                  deployer
              );
              userKaai =await ethers.getContractAt(
                "DecentralizedStableCoin",
                kaai.address,
                accounts[1]
            );
              await kaaiContract.transferOwnership(KAAIEngine.address);
          });
          describe("Constructor", () => {
              it("value checks", async () => {
                  let address = await KAAIEngineContract.getKaai();
                  assert.equal(address.toString(), kaai.address.toString());
                  let tokens = await KAAIEngineContract.getCollateralTokens();
                  let priceFeeds = [];
                  priceFeeds[0] = await KAAIEngineContract.getCollateralTokenPriceFeed(
                      tokens[0]
                  );
                  priceFeeds[1] = await KAAIEngineContract.getCollateralTokenPriceFeed(
                      tokens[1]
                  );
                  assert.equal(tokens.length, 2);
                  assert.equal(tokens[0], wbtc.address);
                  assert.equal(tokens[1], wethAddress);
                  assert.equal(priceFeeds[0], btcAggregator.address);
                  assert.equal(priceFeeds[1], ethAggregator.address);
              });
          });
          describe("get Usd value", () => {
              it("usd value", async () => {
                  const amount = BigInt(102e17);
                  const ethToUsd = (await ethContract.latestRoundData())[1];
                  const decimals = await ethContract.decimals();
                  const precision = BigInt(1e18);
                  const additionalPrecision = precision / BigInt(10 ** decimals);
                  const expectedValue =
                      (amount * BigInt(ethToUsd) * additionalPrecision) / precision;
                  let usdValue = await KAAIEngineContract.getUsdValue(
                      wethAddress,
                      amount
                  );
                  assert.equal(usdValue.toString(), expectedValue.toString());
              });
          });
          describe("get Token Amount From Usd", () => {
              it("Convertion check", async () => {
                  const amount = BigInt(102e17);
                  const ethToUsd = (await ethContract.latestRoundData())[1];
                  const decimals = await ethContract.decimals();
                  const precision = BigInt(1e18);
                  const additionalPrecision = precision / BigInt(10 ** decimals);
                  const expectedValue =
                      (amount * precision) / (BigInt(ethToUsd) * additionalPrecision);
                  let usdValue = await KAAIEngineContract.getTokenAmountFromUsd(
                      wethAddress,
                      amount
                  );
                  assert.equal(usdValue.toString(), expectedValue.toString());
              });
          });
          describe("Deposit Collateral", () => {
              it("More than Zero", async () => {
                  const error = `DSCEngine__moreThanZero()`;
                  await expect(
                      KAAIEngineContract.depositCollateral(wethAddress, 0)
                  ).to.be.revertedWith(error);
              });
              it("Token Check", async () => {
                  const error = `DSCEngine__tokenNotAllowed()`;
                  await expect(
                      KAAIEngineContract.depositCollateral(deployer.address, 1)
                  ).to.be.revertedWith(error);
              });
              it("Stored collateral deposit", async () => {
                  const expectedCollateralAmount = BigInt(10);
                  const expectedCollateralAmountinUsd =
                      await KAAIEngineContract.getUsdValue(
                          wethAddress,
                          expectedCollateralAmount
                      );
                  await wethContract.increaseAllowance(
                      KAAIEngineContract.address,
                      expectedCollateralAmount
                  );
                  await KAAIEngineContract.depositCollateral(
                      wethAddress,
                      expectedCollateralAmount
                  );
                  const collateralAmount = BigInt(
                      await KAAIEngineContract.getCollateralValue(deployer.address)
                  );
                  assert.equal(expectedCollateralAmountinUsd, collateralAmount);
              });
              it("balance Check", async () => {
                  const expectedCollateralAmount = BigInt(10);
                  await wethContract.increaseAllowance(
                      KAAIEngineContract.address,
                      expectedCollateralAmount
                  );
                  await KAAIEngineContract.depositCollateral(
                      wethAddress,
                      expectedCollateralAmount
                  );
                  const balance = await wethContract.balanceOf(
                      KAAIEngineContract.address
                  );
                  assert.equal(balance, expectedCollateralAmount);
              });
              it("emit Collateral Deposited", async () => {
                  const expectedCollateralAmount = BigInt(10);
                  await wethContract.increaseAllowance(
                      KAAIEngineContract.address,
                      expectedCollateralAmount
                  );
                  await expect(
                      KAAIEngineContract.depositCollateral(
                          wethAddress,
                          expectedCollateralAmount
                      )
                  )
                      .to.emit(KAAIEngineContract, "collateralDeposited")
                      .withArgs(deployer.address, wethAddress, expectedCollateralAmount);
              });
          });
          describe("Mint Kaai", () => {
              beforeEach(async () => {
                  const expectedCollateralAmount = BigInt(10);
                  await wethContract.increaseAllowance(
                      KAAIEngineContract.address,
                      expectedCollateralAmount
                  );
                  await KAAIEngineContract.depositCollateral(
                      wethAddress,
                      expectedCollateralAmount
                  );
              });
              it("More than Zero", async () => {
                  const error = `DSCEngine__moreThanZero()`;
                  await expect(KAAIEngineContract.mintKaai(0)).to.be.revertedWith(error);
              });
              it("Revert If health Factor broken", async () => {
                  const amount = BigInt(1e18);
                  const error = `DSCEngine__lessThanMinHealthFactor()`;
                  await expect(KAAIEngineContract.mintKaai(amount)).to.be.revertedWith(
                      error
                  );
              });
              it("Stored Perfectly", async () => {
                  const amount = BigInt(2);
                  await KAAIEngineContract.mintKaai(amount);
                  const balance = BigInt(await kaaiContract.balanceOf(deployer.address));
                  assert.equal(amount, balance);
              });
          });
          describe("Redeem Collateral", () => {
              const expectedCollateralAmount = BigInt(10);
              beforeEach(async () => {
                  await wethContract.increaseAllowance(
                      KAAIEngineContract.address,
                      expectedCollateralAmount
                  );
                  await KAAIEngineContract.depositCollateral(
                      wethAddress,
                      expectedCollateralAmount
                  );
                  const amount = BigInt(8001);
                  await KAAIEngineContract.mintKaai(amount);
              });
              it("health factor check", async () => {
                await KAAIEngineContract.mintKaai(1999);
                  const healthFactor = (
                      await KAAIEngineContract.getHealthFactor(deployer.address)
                  ).toString();
                  const health = BigInt(1e18).toString();
                  assert.equal(healthFactor, health);
              });
              it("revert Health Factor Broken", async () => {
                  const error = `DSCEngine__lessThanMinHealthFactor()`;

                  await expect(
                      KAAIEngineContract.redeemCollateral(wethAddress, 2)
                  ).to.be.revertedWith(error);
              });
              it("emit Collateral Redeem", async () => {
                  await expect(KAAIEngineContract.redeemCollateral(wethAddress, 1))
                      .to.emit(KAAIEngineContract, "collateralRedeemed")
                      .withArgs(deployer.address, 1, wethAddress);
              });
              it("Checking Collateral Deposit", async () => {
                  const redeemAmount = BigInt(1);
                  await KAAIEngineContract.redeemCollateral(wethAddress, redeemAmount);
                  const balance = (
                      await KAAIEngineContract.getCollateralDeposit(wethAddress)
                  ).toString();
                  const expectedBalance = (
                      expectedCollateralAmount - redeemAmount
                  ).toString();
                  assert.equal(balance, expectedBalance);
              });
          });
          describe("burn kaai", () => {
              const expectedCollateralAmount = BigInt(10);
              const amount = BigInt(8000);
              beforeEach(async () => {
                  await wethContract.increaseAllowance(
                      KAAIEngineContract.address,
                      expectedCollateralAmount
                  );
                  await KAAIEngineContract.depositCollateral(
                      wethAddress,
                      expectedCollateralAmount
                  );
                  await KAAIEngineContract.mintKaai(amount);
              });
              it("transfered successfully", async () => {
                  const burnAmount = BigInt(1000);
                  await kaaiContract.increaseAllowance(
                      KAAIEngineContract.address,
                      burnAmount
                  );
                  await KAAIEngineContract.burnKaai(burnAmount);
                  const balance = BigInt(await kaaiContract.balanceOf(deployer.address));
                  assert.equal(amount - burnAmount, balance);
              });
              it("burn check", async () => {
                  const burnAmount = BigInt(1000);
                  const beforeBalance = BigInt(
                      await kaaiContract.balanceOf(KAAIEngineContract.address)
                  );
                  // console.log(beforeBalance)
                  await kaaiContract.increaseAllowance(
                      KAAIEngineContract.address,
                      burnAmount
                  );
                  await KAAIEngineContract.burnKaai(burnAmount);
                  const afterBalance = BigInt(
                      await kaaiContract.balanceOf(KAAIEngineContract.address)
                  );
                  // console.log(afterBalance)
                  assert.equal(beforeBalance, afterBalance);
              });
          });
          describe("Liquidate", () => {
              const expectedCollateralAmount = BigInt(11);
              const amount = BigInt(10000);
              beforeEach(async () => {
                  await wethContract.increaseAllowance(
                      KAAIEngineContract.address,
                      expectedCollateralAmount
                  );
                  await userKaai.increaseAllowance(
                    KAAIEngineContract.address,
                    10000
                );
                  await KAAIEngineContract.depositCollateral(
                      wethAddress,
                      expectedCollateralAmount
                  );
                  const sign = await ethers.getContractAt(
                      "WethMock",
                      wethAddress,
                      accounts[1]
                  );
                  await sign.increaseAllowance(
                      KAAIEngineContract.address,
                      100
                  );
                  await user.depositCollateral(wethAddress, 100);
                  await KAAIEngineContract.mintKaai(amount);
                  await user.mintKaai(amount);
              });
              it("revert if health is fine", async () => {
                  const error = `DSCEngine__healthFactorIsFine()`;
                  await expect(
                      user.liquidate(wethAddress, 1000, deployer.address)
                  ).to.be.revertedWith(error);
              });
              it("Value check", async () => {
                  await ethAggregatorContract.updateRoundData(0, 1000e8, 0, 0);
                  const beforeEth = BigInt(await wethContract.balanceOf(accounts[1].address));
                //   console.log(typeof beforeEth)
                //   console.log("value:",beforeEth.toString())
                  await user.liquidate(wethAddress, 10000, deployer.address);
                  const afterEth = (await wethContract.balanceOf(accounts[1].address)).toString();
                //   console.log("value:",afterEth.toString())
                 assert.equal((beforeEth + BigInt(11)).toString(),afterEth);
              });
          });
          describe("Constant Checks",()=>{
            it("min health factor",async () => {
                const minHealth = (await KAAIEngineContract.getMinHealthFactor()).toString();
                const additionalPrecision = (await KAAIEngineContract.getAdditionalFeedPrecision()).toString();
                const liquidationThreshold = (await KAAIEngineContract.getLiquidationThreshold()).toString();
                const liquidationBonus = (await KAAIEngineContract.getLiquidationBonus()).toString();
                const precision =(await KAAIEngineContract.getPrecision()).toString();
                const value = (1e18).toString();
                const value1= (1e10).toString();
                assert.equal(minHealth,value)
                assert.equal(precision,value)
                assert.equal(additionalPrecision,value1)
                assert.equal(liquidationThreshold,"50")
                assert.equal(liquidationBonus,"10")
            })
          })
      });
