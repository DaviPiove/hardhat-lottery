import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "dotenv/config";
import "hardhat-gas-reporter";

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL ?? "";
const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY ?? "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY ?? "";

const config: HardhatUserConfig = {
	solidity: "0.8.7",
	defaultNetwork: "hardhat",
	networks: {
		hardhat: {
			chainId: 31337,
		},
		localhost: {
			chainId: 31337,
		},
		goerli: {
			chainId: 5,
			url: GOERLI_RPC_URL,
			accounts: [PRIVATE_KEY],
		},
	},
	gasReporter: {
		enabled: false,
		outputFile: "gas-report.txt", //to output in a file
		noColors: true, //they can be messed up
		currency: "USD", //to get this we need a CoinMarketCap API Key
		coinmarketcap: COINMARKETCAP_API_KEY,
	},
	etherscan: {
		apiKey: ETHERSCAN_API_KEY,
	},
	namedAccounts: {
		deployer: {
			default: 0,
		},
		player: {
			default: 1,
		},
	},
	mocha: {
		timeout: 300000, //300 seconds max
	},
};

export default config;
