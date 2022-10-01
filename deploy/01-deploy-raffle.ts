import { ethers } from "ethers";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
	developmentChains,
	networkConfig,
	VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat-config";
import { VRFCoordinatorV2Mock } from "../typechain-types";
import "dotenv/config";
import { verify } from "../utils/verify";

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2");

const deployRaffle: DeployFunction = async ({
	getNamedAccounts,
	deployments,
	network,
	ethers,
}: HardhatRuntimeEnvironment) => {
	const { deploy, log } = deployments;
	const { deployer } = await getNamedAccounts();

	const chainId = network.config.chainId!;
	let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
	let waitBlockConfirmations: number;
	let vrfCoordinatorV2Address: string | undefined, subscriptionId: string | undefined;

	if (developmentChains.includes(network.name)) {
		// Development Chains
		waitBlockConfirmations = 1;
		// Get VRFCoordinatorV2Mock contract
		vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
		// get address
		vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
		// get subscription id
		const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
		const transactionReceipt = await transactionResponse.wait(1);
		subscriptionId = transactionReceipt.events?.[0].args?.subId;
		// fund the subscription
		await vrfCoordinatorV2Mock.fundSubscription(subscriptionId!, VRF_SUB_FUND_AMOUNT);
	} else {
		// Testnet chains
		waitBlockConfirmations = VERIFICATION_BLOCK_CONFIRMATIONS;
		vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
		subscriptionId = networkConfig[chainId]["subscriptionId"];
	}

	const entranceFee = networkConfig[chainId]["entranceFee"];
	const gasLane = networkConfig[chainId]["gasLane"];
	const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
	const interval = networkConfig[chainId]["keepersUpdateInterval"];
	const args = [
		vrfCoordinatorV2Address,
		entranceFee,
		gasLane,
		subscriptionId,
		callbackGasLimit,
		interval,
	];

	const raffle = await deploy("Raffle", {
		from: deployer,
		args: args,
		log: true,
		waitConfirmations: waitBlockConfirmations,
	});

	if (developmentChains.includes(network.name)) {
		await vrfCoordinatorV2Mock!.addConsumer(subscriptionId!, raffle.address);
		log("Consumer is added");
	}

	log("Deployed!");
	log("----------------------------------------------");

	// Verify
	if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
		log("Verifying...");
		await verify(raffle.address, args);
	}
};

export default deployRaffle;
deployRaffle.tags = ["all", "raffle"];
