import {
  AccQueue__factory as AccQueueFactory,
  MACI__factory as MACIFactory,
  Poll__factory as PollFactory,
} from "../../../../hardhat/typechain-types";

/**
 * Merge the message queue on chain
 * @param MergeMessagesArgs - The arguments for the mergeMessages command
 */
export const mergeMessages = async ({
  pollId,
  quiet = true,
  maciContractAddress,
  numQueueOps,
  signer,
}: any): Promise<void> => {
  const network = await signer.provider?.getNetwork();

  // maci contract validation
  const DEFAULT_SG_DATA = "0x0000000000000000000000000000000000000000000000000000000000000000";
  // the defualt initial voice credit proxy data
  const DEFAULT_IVCP_DATA = "0x0000000000000000000000000000000000000000000000000000000000000000";
  // the default number of operations to queue in the state root queue
  const DEFAULT_SR_QUEUE_OPS = 4;

  const maciAddress = maciContractAddress;

  if (pollId < 0) {
    console.log("Invalid poll id");
  }

  const maciContract = MACIFactory.connect(maciAddress, signer);
  const pollAddress = await maciContract.polls(pollId);

  const pollContract = PollFactory.connect(pollAddress, signer);
  const extContracts = await pollContract.extContracts();
  const messageAqContractAddr = extContracts.messageAq;

  const accQueueContract = AccQueueFactory.connect(messageAqContractAddr, signer);

  // we need to ensure that the signer is the owner of the poll contract
  // this is because only the owner can merge the message AQ
  const pollOwner = await pollContract.owner();
  const signerAddress = await signer.getAddress();
  if (pollOwner.toLowerCase() !== signerAddress.toLowerCase()) {
    console.log("The signer is not the owner of this Poll contract");
  }

  // check if it's time to merge the message AQ
  // const dd = await pollContract.getDeployTimeAndDuration();
  // const deadline = Number(dd[0]) + Number(dd[1]);
  // const now = await currentBlockTimestamp(signer.provider!);

  // if (now < deadline) {
  //   console.log("The voting period is not over yet");
  // }

  let subTreesMerged = false;

  // infinite loop to merge the sub trees
  while (!subTreesMerged) {
    // eslint-disable-next-line no-await-in-loop
    subTreesMerged = await accQueueContract.subTreesMerged();

    if (subTreesMerged) {
      console.log("All message subtrees have been merged");
    } else {
      // eslint-disable-next-line no-await-in-loop
      await accQueueContract
        .getSrIndices()
        .then(data => data.map(x => Number(x)))
        .then(indices => {
          console.log(`Merging message subroots ${indices[0] + 1} / ${indices[1] + 1}`);
        });

      // eslint-disable-next-line no-await-in-loop
      const tx = await pollContract.mergeMessageAqSubRoots(numQueueOps || DEFAULT_SR_QUEUE_OPS);
      // eslint-disable-next-line no-await-in-loop
      const receipt = await tx.wait();

      if (receipt?.status !== 1) {
        console.log("Transaction failed");
      }

      console.log(`Executed mergeMessageAqSubRoots(); gas used: ${receipt!.gasUsed.toString()}`);

      console.log(`Transaction hash: ${receipt!.hash}`);
    }
  }

  // check if the message AQ has been fully merged
  const messageTreeDepth = Number((await pollContract.treeDepths()).messageTreeDepth);

  // check if the main root was not already computed
  const mainRoot = (await accQueueContract.getMainRoot(messageTreeDepth.toString())).toString();
  if (mainRoot === "0") {
    // go and merge the message tree

    console.log("Merging subroots to a main message root...");
    const tx = await pollContract.mergeMessageAq();
    const receipt = await tx.wait();

    if (receipt?.status !== 1) {
      console.log("Transaction failed");
    }

    console.log(`Executed mergeMessageAq(); gas used: ${receipt!.gasUsed.toString()}`);
    console.log(`Transaction hash: ${receipt!.hash}`);
    console.log("The message tree has been merged.");
  } else {
    console.log("The message tree has already been merged.");
  }
};
