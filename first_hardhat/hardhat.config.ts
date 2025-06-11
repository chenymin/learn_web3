import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const privateKey = 'INSERT_PRIVATE_KEY';

const config: HardhatUserConfig = {
  solidity: "0.8.28",
//   networks: {
//     moonbase: {
//      url: 'https://rpc.api.moonbase.moonbeam.network',
//      chainId: 1287, // 0x507 in hex,
//      accounts: [privateKey]
//    }
//  }
};

export default config;
