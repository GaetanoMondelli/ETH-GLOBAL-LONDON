import {
  AccQueue__factory as AccQueueFactory,
  MACI__factory as MACIFactory,
  Poll__factory as PollFactory,
} from "../../../../hardhat/typechain-types";



/**
 * Command to merge the signups of a MACI contract
 * @param MergeSignupsArgs - The arguments for the mergeSignups command
 */
export const mergeSignups = async ({
  pollId,
  maciContractAddress,
  numQueueOps,
  signer,
  quiet = true,
}: any): Promise<void> => {
  const network = await signer.provider?.getNetwork();


  const maciAddress = maciContractAddress;


  if (pollId < 0) {
    console.log("Invalid poll id");
  }

  const maciContract = MACIFactory.connect(maciAddress, signer);
  const pollAddress = await maciContract.polls(pollId);


  const pollContract = PollFactory.connect(pollAddress, signer);
  const accQueueContract = AccQueueFactory.connect(await maciContract.stateAq(), signer);

  // check if it's time to merge the message AQ
  // const dd = await pollContract.getDeployTimeAndDuration();
  // const deadline = Number(dd[0]) + Number(dd[1]);
  // const now = await currentBlockTimestamp(signer.provider!);

  // if (now < deadline) {
  //   console.log("Voting period is not over");
  // }

  let subTreesMerged = false;

  // infinite loop to merge the sub trees
  while (!subTreesMerged) {
    // eslint-disable-next-line no-await-in-loop
    subTreesMerged = await accQueueContract.subTreesMerged();

    if (subTreesMerged) {
      // 
      console.log("All state subtrees have been merged.");
    } else {
      // eslint-disable-next-line no-await-in-loop
      await accQueueContract
        .getSrIndices()
        .then((data) => data.map((x) => Number(x)))
        .then((indices) => {
          console.log(`Merging state subroots ${indices[0] + 1} / ${indices[1] + 1}`);
        });

      // first merge the subroots
      // eslint-disable-next-line no-await-in-loop
      const tx = await pollContract.mergeMaciStateAqSubRoots(numQueueOps, pollId.toString());
      // eslint-disable-next-line no-await-in-loop
      const receipt = await tx.wait();

      if (receipt?.status !== 1) {
        console.log("Error merging state subroots");
      }

      console.log(`Transaction hash: ${receipt!.hash}`);
      
      console.log(`Executed mergeMaciStateAqSubRoots(); gas used: ${receipt!.gasUsed.toString()}`);
    }
  }

  // check if the state AQ has been fully merged
  const stateTreeDepth = Number(await maciContract.stateTreeDepth());
  const mainRoot = (await accQueueContract.getMainRoot(stateTreeDepth.toString())).toString();

  if (mainRoot === "0" || pollId > 0) {
    // go and merge the state tree
    console.log("Merging subroots to a main state root...");
    const tx = await pollContract.mergeMaciStateAq(pollId.toString());
    const receipt = await tx.wait();

    if (receipt?.status !== 1) {
      console.log("Error merging state subroots");
    }

    console.log(`Transaction hash: ${receipt!.hash}`);
    
    console.log(`Executed mergeStateAq(); gas used: ${receipt!.gasUsed.toString()}`);
  } else {
    console.log("The state tree has already been merged.");
  }
};
