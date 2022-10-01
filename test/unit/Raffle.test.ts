import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains, networkConfig } from "../../helper-hardhat-config";
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types";

!developmentChains.includes(network.name)
	? describe.skip
	: describe("Raffle Unit Test", () => {
			let raffle: Raffle;
			let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
			let raffleEntranceFee: BigNumber;
			let deployer: string;
			let interval: number;

			beforeEach(async () => {
				deployer = (await getNamedAccounts()).deployer;
				await deployments.fixture(["all"]);
				raffle = await ethers.getContract("Raffle", deployer);
				vrfCoordinatorV2Mock = await ethers.getContract(
					"VRFCoordinatorV2Mock",
					deployer
				);
				raffleEntranceFee = await raffle.getEntranceFee();
				interval = (await raffle.getInterval()).toNumber();
			});

			describe("constructor", () => {
				it("initializes the raffle correctly", async () => {
					const raffleState = await raffle.getRaffleState();
					const interval = await raffle.getInterval();
					assert.equal(raffleState.toString(), "0");
					assert.equal(
						interval.toString(),
						networkConfig[network.config.chainId!]["keepersUpdateInterval"]
					);
				});
			});

			describe("enterRaffle", () => {
				it("revert if you don't pau enough", async () => {
					await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
						raffle,
						"Raffle__NotEnoughETHEntered"
					);
				});
				it("records players when they enter", async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					const playerFromContract = await raffle.getPlayer(0);
					assert.equal(playerFromContract, deployer);
				});
				//check of events
				it("emits event on enter", async () => {
					await expect(
						raffle.enterRaffle({ value: raffleEntranceFee })
					).to.emit(raffle, "RaffleEnter");
				});
				it("doesn't allow entrance when raffle is calculating", async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send("evm_increaseTime", [interval + 1]);
					await network.provider.send("evm_mine", []);
					//we pretend to be a chainlink keeper
					await raffle.performUpkeep([]);
					await expect(
						raffle.enterRaffle({ value: raffleEntranceFee })
					).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen");
				});
			});

			describe("checkUpkeep", () => {
				it("returns false if people haven't sent any ETH", async () => {
					await network.provider.send("evm_increaseTime", [interval + 1]);
					await network.provider.send("evm_mine", []);
					const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
					assert(!upkeepNeeded);
				});
				it("returns false if raffle isn't open", async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send("evm_increaseTime", [interval + 1]);
					await network.provider.send("evm_mine", []);
					await raffle.performUpkeep("0x"); //ox == []
					const raffleState = await raffle.getRaffleState();
					const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
					assert.equal(raffleState.toString(), "1");
					assert.equal(upkeepNeeded, false);
				});
				it("returns false if enough time hasn't passed", async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send("evm_increaseTime", [interval - 5]);
					await network.provider.request({ method: "evm_mine", params: [] });
					const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
					assert(!upkeepNeeded);
				});
				it("returns true if enough time has passed, has players, eth, and is open", async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send("evm_increaseTime", [interval + 1]);
					await network.provider.request({ method: "evm_mine", params: [] });
					const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
					assert(upkeepNeeded);
				});
			});

			describe("performUpkeep", () => {
				it("it can only run it checkupkeep is true", async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send("evm_increaseTime", [interval + 1]);
					await network.provider.send("evm_mine", []);
					const tx = await raffle.performUpkeep([]);
					assert(tx);
				});
				it("reverts when checkUpkeep is false", async () => {
					await expect(raffle.performUpkeep([])).to.be.revertedWithCustomError(
						raffle,
						"Raffle__UpkeepNotNeeded"
					);
				});
				it("updates the raffle state, emits the event and calls the vrf coordinator", async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send("evm_increaseTime", [interval + 1]);
					await network.provider.send("evm_mine", []);
					const txResponse = await raffle.performUpkeep([]);
					const txReceipt = await txResponse.wait(1);
					const requestId = txReceipt.events![1].args?.requestId;
					const raffleState = await raffle.getRaffleState();
					assert(requestId.toNumber() > 0);
					assert(raffleState.toString(), "1");
				});
			});

			describe("fulfillRandomWords", () => {
				beforeEach(async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send("evm_increaseTime", [interval + 1]);
					await network.provider.send("evm_mine", []);
				});

				it("can only be called after performUpkeep", async () => {
					await expect(
						vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
					).to.be.revertedWith("nonexistent request");
					await expect(
						vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
					).to.be.revertedWith("nonexistent request");
				});
				it("picks a winner, resets the players, and sends money", async () => {
					const additionalEntrants = 3;
					const startingAccountIndex = 1; //deployer is 0
					const accounts = await ethers.getSigners();
					for (
						let i = startingAccountIndex;
						i < startingAccountIndex + additionalEntrants;
						i++
					) {
						const accountConnectedRaffle = raffle.connect(accounts[i]);
						await accountConnectedRaffle.enterRaffle({
							value: raffleEntranceFee,
						});
					}
					const startingTimeStamp = await raffle.getLatestTimeStamp();

					//we will have to wait for the fulfillRandomWords to be called
					await new Promise<void>(async (resolve, reject) => {
						raffle.once("WinnerPicked", async () => {
							console.log("Found the WinnerPicked event!");
							try {
								const recentWinner = await raffle.getRecentWinner();
								const raffleState = await raffle.getRaffleState();
								const endingTimeStamp = await raffle.getLatestTimeStamp();
								const numPlayers = await raffle.getNumberOfPlayers();
								const winnerEndingBalance =
									await accounts[1].getBalance();

								assert.equal(numPlayers.toString(), "0");
								assert.equal(raffleState.toString(), "0");
								assert.equal(
									recentWinner.toString(),
									accounts[1].address
								);
								assert(endingTimeStamp > startingTimeStamp);
								assert.equal(
									winnerEndingBalance.toString(),
									winnerStartingBalance
										.add(
											raffleEntranceFee
												.mul(additionalEntrants)
												.add(raffleEntranceFee)
										)
										.toString()
								);
							} catch (error) {
								reject(error);
							}
							resolve();
						});
						const tx = await raffle.performUpkeep([]); //mocking keepers
						const txReceipt = await tx.wait(1);
						const winnerStartingBalance = await accounts[1].getBalance();
						await vrfCoordinatorV2Mock.fulfillRandomWords(
							//mocking VRF
							txReceipt.events![1].args?.requestId,
							raffle.address
						);
					});
				});
			});
	  });
