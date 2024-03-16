import { JsonRpcProvider } from "ethers";
import { genMaciStateFromContract } from "./genMaciState";
import { Keypair, PrivKey } from "maci-domainobjs";

import fs from "fs";

/**
 * Generate a local MACI state from the smart contracts events
 * @param GenLocalStateArgs - The arguments for the genLocalState command
 */
export const genLocalState = async ({
  outputPath,
  pollId,
  maciContractAddress,
  maciContractAbi,
  pollContractAbi,
  coordinatorPrivateKey,
  ethereumProvider,
  endBlock,
  startBlock,
  blockPerBatch,
  transactionHash,
  sleep,
  signer,
  quiet = true,
}: any): Promise<void> => {

  const network = await signer.provider?.getNetwork();
  const maciAddress = maciContractAddress;

  // if no private key is passed we ask it securely
  const coordPrivKey = coordinatorPrivateKey;
  if (!PrivKey.isValidSerializedPrivKey(coordPrivKey)) {
    console.log("Invalid MACI private key");
  }

  const coordinatorMaciPrivKey = PrivKey.deserialize(coordPrivKey);
  const coordinatorKeypair = new Keypair(coordinatorMaciPrivKey);

  // calculate the end block number
  const endBlockNumber = endBlock || (await signer.provider!.getBlockNumber());

  let fromBlock = startBlock || 0;
  if (transactionHash) {
    const tx = await signer.provider!.getTransaction(transactionHash);
    fromBlock = tx?.blockNumber ?? 0;
  }

  const provider = ethereumProvider ? new JsonRpcProvider(ethereumProvider) : signer.provider;

  console.log(`Fetching logs from ${fromBlock} till ${endBlockNumber} and generating the offline maci state`);

  console.log("wal", pollContractAbi, maciContractAbi)
  const maciState = await genMaciStateFromContract(
    provider!,
    maciAddress,
    coordinatorKeypair,
    pollId,
    fromBlock,
    blockPerBatch || 50,
    endBlockNumber,
    sleep,
    maciContractAbi,
    pollContractAbi,
    signer,
  );

  // write the state to a file
  const serializedState = maciState.toJSON();
  // fs.writeFileSync(outputPath, JSON.stringify(serializedState, null, 4));
  console.log(serializedState);

  // console.log(`The state has been written to ${outputPath}`);
};
