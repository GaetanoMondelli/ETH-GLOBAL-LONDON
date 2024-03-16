import { extractVk, genProof, verifyProof } from "maci-circuits";
import { type CircuitInputs, type IJsonMaciState, MaciState } from "maci-core";
import { hash3, hashLeftRight, genTreeCommitment } from "maci-crypto";
import { genMaciStateFromContract } from "./genMaciState";
import { Keypair, PrivKey } from "maci-domainobjs";
import {
  AccQueue__factory as AccQueueFactory,
  MACI__factory as MACIFactory,
  Poll__factory as PollFactory,
} from "../../../../hardhat/typechain-types";


import fs from "fs";
import path from "path";

import type { BigNumberish } from "ethers";

const asHex = (val: BigNumberish): string => `0x${BigInt(val).toString(16)}`;


/**
 * Generate proofs for the message processing, tally and subsidy calculations
 * @note see different options for zkey files to use specific circuits https://maci.pse.dev/docs/trusted-setup, https://maci.pse.dev/docs/testing/#pre-compiled-artifacts-for-testing
 * @param GenProofsArgs - The arguments for the genProofs command
 * @returns The tally data
 */
export const genProofs = async ({
  outputDir,
  tallyFile,
  tallyZkey,
  processZkey,
  pollId,
  subsidyFile,
  subsidyZkey,
  rapidsnark,
  processWitgen,
  processDatFile,
  tallyWitgen,
  tallyDatFile,
  subsidyWitgen,
  subsidyDatFile,
  coordinatorPrivKey,
  maciAddress,
  transactionHash,
  processWasm,
  tallyWasm,
  subsidyWasm,
  useWasm,
  stateFile,
  startBlock,
  blocksPerBatch,
  endBlock,
  signer,
  tallyAddress,
  useQuadraticVoting = true,
  quiet = true,
}: any): Promise<any> => {

  // if we do not have the output directory just create it
  if (!fs.existsSync(outputDir)) {
    // Create the directory
    fs.mkdirSync(outputDir);
  }

  // differentiate whether we are using wasm or rapidsnark
  if (useWasm) {
    // if no rapidsnark then we assume we go with wasm
    // so we expect those arguments
    if (!processWasm) {
      console.log("Please specify the process wasm file location");
    }

    if (!tallyWasm) {
      console.log("Please specify the tally wasm file location");
    }

    // const wasmResult = doesPathExist([processWasm!, tallyWasm!]);

    // if (!wasmResult[0]) {
    //   console.log(`Could not find ${wasmResult[1]}.`);
    // }
  } else {
    if (!rapidsnark) {
      console.log("Please specify the rapidsnark file location");
    }

    if (!processWitgen) {
      console.log("Please specify the process witgen file location");
    }

    if (!tallyWitgen) {
      console.log("Please specify the tally witgen file location");
    }

    // const witgenResult = doesPathExist([rapidsnark!, processWitgen!, tallyWitgen!, processDatFile!, tallyDatFile!]);

    // if (!witgenResult[0]) {
    //   console.log(`Could not find ${witgenResult[1]}.`);
    // }
  }

  // check if zkeys were provided
  // const zkResult = doesPathExist([processZkey, tallyZkey]);

  // if (!zkResult[0]) {
  //   console.log(`Could not find ${zkResult[1]}.`);
  // }

  // the vk for the subsidy contract (optional)
  // extract the rest of the verifying keys
  const processVk = await extractVk(processZkey);
  const tallyVk = await extractVk(tallyZkey);

  // the coordinator's MACI private key
  const privateKey = coordinatorPrivKey;
  if (!PrivKey.isValidSerializedPrivKey(privateKey)) {
    console.log("Invalid MACI private key");
  }
  const maciPrivKey = PrivKey.deserialize(privateKey);
  const coordinatorKeypair = new Keypair(maciPrivKey);

  const network = await signer.provider?.getNetwork();

  // contracts

  const maciContractAddress = maciAddress;


  if (pollId < 0) {
    console.log("Invalid poll id");
  }

  const maciContract = MACIFactory.connect(maciContractAddress, signer);
  const pollAddr = await maciContract.polls(pollId);

 
  const pollContract = PollFactory.connect(pollAddr, signer);

  const extContracts = await pollContract.extContracts();
  const messageAqContractAddr = extContracts.messageAq;
  const messageAqContract = AccQueueFactory.connect(messageAqContractAddr, signer);

  // Check that the state and message trees have been merged for at least the first poll
  if (!(await pollContract.stateAqMerged()) && pollId.toString() === "0") {
    console.log("The state tree has not been merged yet. Please use the mergeSignups subcommmand to do so.");
  }

  const messageTreeDepth = Number((await pollContract.treeDepths()).messageTreeDepth);

  // check that the main root is set
  const mainRoot = (await messageAqContract.getMainRoot(messageTreeDepth.toString())).toString();
  if (mainRoot === "0") {
    console.log("The message tree has not been merged yet. Please use the mergeMessages subcommmand to do so.");
  }

  let maciState: MaciState | undefined;
  if (stateFile) {
    const content = JSON.parse(fs.readFileSync(stateFile).toString()) as unknown as IJsonMaciState;
    const serializedPrivateKey = maciPrivKey.serialize();

    try {
      maciState = MaciState.fromJSON(content);

      maciState.polls.forEach((poll) => {
        poll.setCoordinatorKeypair(serializedPrivateKey);
      });
    } catch (error) {
      console.log((error as Error).message);
    }
  } else {
    // build an off-chain representation of the MACI contract using data in the contract storage
    let fromBlock = startBlock ? Number(startBlock) : 0;
    if (transactionHash) {
      const tx = await signer.provider!.getTransaction(transactionHash);
      fromBlock = tx?.blockNumber ?? 0;
    }

    console.log(`starting to fetch logs from block ${fromBlock}`);
    maciState = await genMaciStateFromContract(
      signer.provider!,
      await maciContract.getAddress(),
      coordinatorKeypair,
      pollId,
      fromBlock,
      blocksPerBatch,
      endBlock,
      undefined,
      undefined,
      undefined,
      signer,
    );
  }

  const poll = maciState!.polls.get(pollId)!;

  const processProofs: any[] = [];
  const tallyProofs: any[] = [];
  const subsidyProofs: any[] = [];

  // time how long it takes
  const startTime = Date.now();

  console.log(`Generating proofs of message processing...`);  
  const { messageBatchSize } = poll.batchSizes;
  const numMessages = poll.messages.length;
  let totalMessageBatches = numMessages <= messageBatchSize ? 1 : Math.floor(numMessages / messageBatchSize);
  if (numMessages > messageBatchSize && numMessages % messageBatchSize > 0) {
    totalMessageBatches += 1;
  }

  // while we have unprocessed messages, process them
  while (poll.hasUnprocessedMessages()) {
    // process messages in batches
    const circuitInputs = poll.processMessages(pollId, useQuadraticVoting, quiet) as unknown as CircuitInputs;

    try {
      // generate the proof for this batch
      // eslint-disable-next-line no-await-in-loop
      const r = await genProof({
        inputs: circuitInputs,
        zkeyPath: processZkey,
        useWasm,
        rapidsnarkExePath: rapidsnark,
        witnessExePath: processWitgen,
        wasmPath: processWasm,
      });

      // verify it
      // eslint-disable-next-line no-await-in-loop
      const isValid = await verifyProof(r.publicSignals, r.proof, processVk);
      if (!isValid) {
        throw new Error("Generated an invalid proof");
      }

      const thisProof = {
        circuitInputs,
        proof: r.proof,
        publicInputs: r.publicSignals,
      };
      // save the proof
      processProofs.push(thisProof);
      fs.writeFileSync(
        path.resolve(outputDir, `process_${poll.numBatchesProcessed - 1}.json`),
        JSON.stringify(thisProof, null, 4),
      );

      console.log(`Progress: ${poll.numBatchesProcessed} / ${totalMessageBatches}`);
  } catch (error) {
      console.log((error as Error).message);
    }
  }

  const endTime = Date.now();

  console.log(`gen processMessage proof took ${(endTime - startTime) / 100} seconds\n`);

  // subsidy calculations are not mandatory
  if (false) {
    const subsidyStartTime = Date.now();

    console.log(`Generating proofs f subsidy calculation...`);

    const { subsidyBatchSize } = poll.batchSizes;
    const numLeaves = poll.stateLeaves.length;
    const totalSubsidyBatches = Math.ceil(numLeaves / subsidyBatchSize) ** 2;

    console.log(`subsidyBatchSize=${subsidyBatchSize}, numLeaves=${numLeaves}, totalSubsidyBatch=${totalSubsidyBatches}`);

    let numBatchesCalulated = 0;

    let subsidyCircuitInputs: CircuitInputs;
    // calculate the subsidy for each batch
    while (poll.hasUnfinishedSubsidyCalculation()) {
      // calculate subsidy in batches
      subsidyCircuitInputs = poll.subsidyPerBatch() as unknown as CircuitInputs;
      try {
        // generate proof for this batch
        // eslint-disable-next-line no-await-in-loop
        const r = await genProof({
          inputs: subsidyCircuitInputs,
          zkeyPath: subsidyZkey!,
          useWasm,
          rapidsnarkExePath: rapidsnark,
          witnessExePath: subsidyWitgen,
          wasmPath: subsidyWasm,
        });
        // check validity of it
        // eslint-disable-next-line no-await-in-loop
        // const isValid = await verifyProof(r.publicSignals, r.proof, subsidyVk);


        const thisProof = {
          circuitInputs: subsidyCircuitInputs,
          proof: r.proof,
          publicInputs: r.publicSignals,
        };
        subsidyProofs.push(thisProof);
        fs.writeFileSync(
          path.resolve(outputDir, `subsidy_${numBatchesCalulated}.json`),
          JSON.stringify(thisProof, null, 4),
        );
        numBatchesCalulated += 1;

        console.log(`Progress: ${numBatchesCalulated} / ${totalSubsidyBatches}`);
    } catch (error) {
        console.log((error as Error).message);
      }
    }

    const subsidyFileData = {
      provider: process.env.ETH_PROVIDER,
      maci: maciAddress,
      pollId: pollId.toString(),
      newSubsidyCommitment: asHex(subsidyCircuitInputs!.newSubsidyCommitment as BigNumberish),
      results: {
        subsidy: poll.subsidy.map((x) => x.toString()),
        salt: asHex(subsidyCircuitInputs!.newSubsidySalt as BigNumberish),
      },
    };

    // store it
    fs.writeFileSync(subsidyFile, JSON.stringify(subsidyFileData, null, 4));

    const susbsidyEndTime = Date.now();

  }

  // tallying proofs
  console.log(`Generating proofs of vote tallying...`);
  const tallyStartTime = Date.now();

  const { tallyBatchSize } = poll.batchSizes;
  const numStateLeaves = poll.stateLeaves.length;
  let totalTallyBatches = numStateLeaves <= tallyBatchSize ? 1 : Math.floor(numStateLeaves / tallyBatchSize);
  if (numStateLeaves > tallyBatchSize && numStateLeaves % tallyBatchSize > 0) {
    totalTallyBatches += 1;
  }

  let tallyCircuitInputs: CircuitInputs;
  // tally all ballots for this poll
  while (poll.hasUntalliedBallots()) {
    // tally votes in batches
    tallyCircuitInputs = useQuadraticVoting
      ? (poll.tallyVotes() as unknown as CircuitInputs)
      : (poll.tallyVotesNonQv() as unknown as CircuitInputs);

    try {
      // generate the proof
      // eslint-disable-next-line no-await-in-loop
      const r = await genProof({
        inputs: tallyCircuitInputs,
        zkeyPath: tallyZkey,
        useWasm,
        rapidsnarkExePath: rapidsnark,
        witnessExePath: tallyWitgen,
        wasmPath: tallyWasm,
      });

      // verify it
      // eslint-disable-next-line no-await-in-loop
      const isValid = await verifyProof(r.publicSignals, r.proof, tallyVk);

      if (!isValid) {
        console.log("Generated an invalid tally proof");
      }

      const thisProof = {
        circuitInputs: tallyCircuitInputs,
        proof: r.proof,
        publicInputs: r.publicSignals,
      };

      // save it
      tallyProofs.push(thisProof);
      fs.writeFileSync(
        path.resolve(outputDir, `tally_${poll.numBatchesTallied - 1}.json`),
        JSON.stringify(thisProof, null, 4),
      );

      console.log(`Progress: ${poll.numBatchesTallied} / ${totalTallyBatches}`);
  } catch (error) {
      console.log((error as Error).message);
    }
  }

  // verify the results
  // Compute newResultsCommitment
  const newResultsCommitment = genTreeCommitment(
    poll.tallyResult,
    BigInt(asHex(tallyCircuitInputs!.newResultsRootSalt as BigNumberish)),
    poll.treeDepths.voteOptionTreeDepth,
  );

  // compute newSpentVoiceCreditsCommitment
  const newSpentVoiceCreditsCommitment = hashLeftRight(
    poll.totalSpentVoiceCredits,
    BigInt(asHex(tallyCircuitInputs!.newSpentVoiceCreditSubtotalSalt as BigNumberish)),
  );

  // get the tally contract address
  const tallyContractAddress = tallyAddress;

  let newPerVOSpentVoiceCreditsCommitment: bigint | undefined;
  let newTallyCommitment: bigint;

  // create the tally file data to store for verification later
  const tallyFileData: any = {
    maci: maciContractAddress,
    pollId: pollId.toString(),
    network: network?.name,
    chainId: network?.chainId.toString(),
    isQuadratic: useQuadraticVoting,
    tallyAddress: tallyContractAddress,
    newTallyCommitment: asHex(tallyCircuitInputs!.newTallyCommitment as BigNumberish),
    results: {
      tally: poll.tallyResult.map((x) => x.toString()),
      salt: asHex(tallyCircuitInputs!.newResultsRootSalt as BigNumberish),
      commitment: asHex(newResultsCommitment),
    },
    totalSpentVoiceCredits: {
      spent: poll.totalSpentVoiceCredits.toString(),
      salt: asHex(tallyCircuitInputs!.newSpentVoiceCreditSubtotalSalt as BigNumberish),
      commitment: asHex(newSpentVoiceCreditsCommitment),
    },
  };

  if (useQuadraticVoting) {
    // Compute newPerVOSpentVoiceCreditsCommitment
    newPerVOSpentVoiceCreditsCommitment = genTreeCommitment(
      poll.perVOSpentVoiceCredits,
      BigInt(asHex(tallyCircuitInputs!.newPerVOSpentVoiceCreditsRootSalt as BigNumberish)),
      poll.treeDepths.voteOptionTreeDepth,
    );

    // Compute newTallyCommitment
    newTallyCommitment = hash3([
      newResultsCommitment,
      newSpentVoiceCreditsCommitment,
      newPerVOSpentVoiceCreditsCommitment,
    ]);

    // update perVOSpentVoiceCredits in the tally file data
    tallyFileData.perVOSpentVoiceCredits = {
      tally: poll.perVOSpentVoiceCredits.map((x) => x.toString()),
      salt: asHex(tallyCircuitInputs!.newPerVOSpentVoiceCreditsRootSalt as BigNumberish),
      commitment: asHex(newPerVOSpentVoiceCreditsCommitment),
    };
  } else {
    newTallyCommitment = hashLeftRight(newResultsCommitment, newSpentVoiceCreditsCommitment);
  }

  fs.writeFileSync(tallyFile, JSON.stringify(tallyFileData, null, 4));

  console.log(`Tally file:\n${JSON.stringify(tallyFileData, null, 4)}\n`);

  // compare the commitments
  if (asHex(newTallyCommitment) === tallyFileData.newTallyCommitment) {
    console.log(quiet, ("The tally commitment is correct"));
  } else {
    console.log("Error: the newTallyCommitment is invalid.");
  }

  const tallyEndTime = Date.now();

  console.log(`gen tally proof took ${(tallyEndTime - tallyStartTime) / 100} seconds\n`);

  return tallyFileData;
};
