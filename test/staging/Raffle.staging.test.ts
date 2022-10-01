import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains, networkConfig } from "../../helper-hardhat-config";
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types";

developmentChains.includes(network.name)
	? describe.skip
	: describe("Raffle Staging Test", () => {
			let raffle: Raffle;
			let raffleEntranceFee: BigNumber;

			beforeEach(async () => {
				const accounts = await ethers.getSigners();
				raffle = await ethers.getContract("Raffle", accounts[0].address);
				raffleEntranceFee = await raffle.getEntranceFee();
			});

			describe("fulfillRandomWords", () => {
				it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async () => {
					const startingTimeStamp = await raffle.getLatestTimeStamp();
					const accounts = await ethers.getSigners();

					//setup a listener for the WinnerPicked event vefore we enter the raffle
					await new Promise<void>(async (resolve, reject) => {
						raffle.once("WinnerPicked", async () => {
							console.log("WinnerPicked event fired");
							try {
								const recentWinner = await raffle.getRecentWinner();
								const raffleState = await raffle.getRaffleState();
								const winnerEndingBalance =
									await accounts[0].getBalance();
								const endingTimeStamp = await raffle.getLatestTimeStamp();

								//check if players has been reset
								await expect(raffle.getPlayer(0)).to.be.reverted;
								//check if recentWinner is set
								assert.equal(
									recentWinner.toString(),
									accounts[0].address
								);
								//check if raffleState is OPEN
								assert.equal(raffleState.toString(), "0");
								//check if the money has been transfer correctly
								assert.equal(
									winnerEndingBalance.toString(),
									winnerStartingBalance
										.add(raffleEntranceFee)
										.toString()
								);
								//check ending timestamp is greater than starting timestamp
								assert(endingTimeStamp > startingTimeStamp);
								resolve();
							} catch (error) {
								reject(error);
							}
						});

						const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
						await tx.wait(1);
						const winnerStartingBalance = await accounts[0].getBalance();
					});
				});
			});
	  });
