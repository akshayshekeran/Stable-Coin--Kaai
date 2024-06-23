// We are going to skip a bit on these tests...

const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-config");
const { deployContract } = require("ethereum-waffle");

//writing the test code from here..

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Decentralized Stable Coin Unit Tests", function () {
          let DecentralizedStableCoin, deployer,DecentralizedStableCoinContract;

          beforeEach(async () => {
              accounts = await ethers.getSigners();
              deployer = accounts[0];
              await deployments.fixture(["all"]);
              DecentralizedStableCoin = await deployments.get("DecentralizedStableCoin")
              unknownUser = await ethers.getContractAt(
                  "DecentralizedStableCoin",
                  DecentralizedStableCoin.address,
                  accounts[1]
              );
              DecentralizedStableCoinContract = await ethers.getContractAt(
                  "DecentralizedStableCoin",
                  DecentralizedStableCoin.address,
                  deployer
              );
              
          });

          describe("Only Owner", () => {
              it("Only Owner", async () => {
                    await DecentralizedStableCoinContract.mint(deployer.address, 1);
                  const error = `Ownable: caller is not the owner`;
                  await expect(unknownUser.burn(1)).to.be.revertedWith(error);
                  await expect(unknownUser.mint(deployer.address, 1)).to.be.revertedWith(
                      error
                  );
              });
          });
          describe("burn", () => {
              it("amount should be greater than zero", async () => {
                  const error = `DecentralizedStableCoin__mustBeAboveZero()`;
                  await expect(
                      DecentralizedStableCoinContract.burn(0)
                  ).to.be.revertedWith(error);
              });
              it("Balance should be greater than amount", async () => {
                  let amount = 100;
                  await DecentralizedStableCoinContract.mint(deployer.address, amount);
                  const error = `DecentralizedStableCoin__burnAmountMustExceedsBalance()`;
                  await expect(
                      DecentralizedStableCoinContract.burn(amount + 1)
                  ).to.be.revertedWith(error);
              });
              it("Amount Burned", async () => {
                  let amount = 100;
                  await DecentralizedStableCoinContract.mint(deployer.address, amount);
                  await DecentralizedStableCoinContract.burn(amount);
                  let balance = (
                      await unknownUser.balanceOf(deployer.address)
                  ).toString();
                  await assert.equal(balance, 0);
              });
          });
          describe("mint", () => {
              it("zero address", async () => {
                  const error = `DecentralizedStableCoin__zeroAddress()`;
                  await expect(
                      DecentralizedStableCoinContract.mint(
                          "0x0000000000000000000000000000000000000000",
                          0
                      )
                  ).to.be.revertedWith(error);
              });
              it("amount should be greater than zero", async () => {
                  const error = `DecentralizedStableCoin__mustBeAboveZero()`;
                  await expect(
                      DecentralizedStableCoinContract.mint(deployer.address, 0)
                  ).to.be.revertedWith(error);
              });
              it("Minted Successfully", async () => {
                  let amount = 100;
                  await DecentralizedStableCoinContract.mint(deployer.address, amount);
                  let balance = (
                      await unknownUser.balanceOf(deployer.address)
                  ).toString();
                  await assert.equal(balance, amount);
              });
          });
      });
