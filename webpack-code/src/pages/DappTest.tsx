import { InfoContract, InfoContract__factory } from '@/types/ethers-contracts';
import InfoContractABI from '@abis/InfoContract.json';
import { BrowserProvider } from 'ethers';
// import { Contract } from 'ethers';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    ethereum?: any;
  }
}
const CONTRACT_ADDRESS = InfoContractABI.networks['5777'].address;
console.log('🌺🌺🌺🌺🌺🌺🌺🌺🌺 ', CONTRACT_ADDRESS);
const DappPage = () => {
  const [contract, setContract] = useState<InfoContract | null>(null);
  // const contractInstance = new Contract(
  //   CONTRACT_ADDRESS,
  //   InfoContractABI.abi,
  //   signer,
  // ) as unknown as InfoContract;

  useEffect(() => {
    const provider = new BrowserProvider(window.ethereum);
    provider
      .getSigner()
      .then(signer => {
        const contractInstance = InfoContract__factory.connect(CONTRACT_ADDRESS, signer);
        setContract(contractInstance);
      })
      .catch(error => {
        console.error('Error connecting to contract:', error);
      });
  }, []);
  useEffect(() => {
    if (contract) {
      contract.setInfo('Hello, DappTest!', 2);
    }
  }, [contract]);

  return (
    <>
      <h1>Dapptest</h1>
    </>
  );
};
export default DappPage;
