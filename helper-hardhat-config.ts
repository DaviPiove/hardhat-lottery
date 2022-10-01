import { ethers, BigNumber } from "ethers";

export interface networkConfigItem {
	name?: string;
	subscriptionId?: string;
	entranceFee?: BigNumber;
	gasLane?: string;
	keepersUpdateInterval?: string;
	callbackGasLimit?: string;
	vrfCoordinatorV2?: string;
}

export interface networkConfigInfo {
	[key: number]: networkConfigItem;
}

export const developmentChains = ["hardhat", "localhost"];
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6;

export const networkConfig: networkConfigInfo = {
	5: {
		name: "goerli",
		vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
		entranceFee: ethers.utils.parseEther("0.01"),
		gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
		subscriptionId: "3094",
		callbackGasLimit: "500000",
		keepersUpdateInterval: "30",
	},
	31337: {
		name: "hardhat",
		entranceFee: ethers.utils.parseEther("0.01"),
		gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
		callbackGasLimit: "500000",
		keepersUpdateInterval: "30",
	},
};
