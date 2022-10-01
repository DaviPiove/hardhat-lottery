import { ethers } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { developmentChains } from "../helper-hardhat-config";

const BASE_FEE = ethers.utils.parseEther("0.25");
const GAS_PRICE_LINK = 1e9;

const deployMocks: DeployFunction = async ({
	getNamedAccounts,
	deployments,
	network,
}: HardhatRuntimeEnvironment) => {
	const { deploy, log } = deployments;
	const { deployer } = await getNamedAccounts();
	const args = [BASE_FEE, GAS_PRICE_LINK];

	if (developmentChains.includes(network.name)) {
		log("Local network detected! Deploying mocks...");
		//deploy a mock Vrfcoordinator
		await deploy("VRFCoordinatorV2Mock", {
			from: deployer,
			log: true,
			args: args,
		});
		log("Mocks deployed!");
		log("----------------------------------------------");
	}
};

export default deployMocks;
deployMocks.tags = ["all", "mocks"];
