/* eslint-disable no-underscore-dangle */
import { MACI, Poll } from "../../../../hardhat/typechain-types";
import {
  AccQueue__factory as AccQueueFactory,
  MACI__factory as MACIFactory,
  Poll__factory as PollFactory,
} from "../../../../hardhat/typechain-types";
// import type { Action } from "./types";
import { parseArtifact } from "./abi";
import { sleep, sortActions } from "./utils";
import assert from "assert";
import { BaseContract, Interface, type Log, type Provider } from "ethers";
import { MaciState, STATE_TREE_ARITY } from "maci-core";
import { type Keypair, Message, PubKey } from "maci-domainobjs";

/**
 * Generate a MaciState object from the events of a MACI and Poll smart contracts
 * @param provider - the ethereum provider
 * @param address - the address of the MACI contract
 * @param coordinatorKeypair - the keypair of the coordinator
 * @param pollId - the id of the poll for which we are fetching events
 * @param fromBlock - the block number from which to start fetching events
 * @param blocksPerRequest - the number of blocks to fetch in each request
 * @param endBlock - the block number at which to stop fetching events
 * @param sleepAmount - the amount of time to sleep between each request
 * @returns an instance of MaciState
 */
export const genMaciStateFromContract = async (
  provider: Provider,
  address: string,
  coordinatorKeypair: Keypair,
  pollId: bigint,
  fromBlock = 0,
  blocksPerRequest = 50,
  endBlock: number | undefined = undefined,
  sleepAmount: number | undefined = undefined,
  maciContractAbi: any,
  pollContractAbi: any,
  signer: any,
): Promise<any> => {
  // ensure the pollId is valid
  assert(pollId >= 0);

  console.log("Maci state from contract", pollContractAbi, maciContractAbi);
  // [pollContractAbi] = pollContractAbi;
  // [maciContractAbi] = maciContractAbi;

  const maciContract = MACIFactory.connect(address, signer);
  const pollAddress = await maciContract.polls(pollId);

  // const maciContract = new BaseContract(address, maciContractAbi, provider) as unknown as MACI;

  // const maciIface = new Interface([maciContractAbi]);
  // const pollIface = new Interface([pollContractAbi]);
  console.log("Maci state from contract2");

  // Check stateTreeDepth
  const stateTreeDepth = await maciContract.stateTreeDepth();

  // we need to pass the stateTreeDepth
  const maciState = new MaciState(Number(stateTreeDepth));
  // ensure it is set correctly
  assert(stateTreeDepth === BigInt(maciState.stateTreeDepth));
  console.log("Maci state from contract3");

  let signUpLogs: Log[] = [];
  let deployPollLogs: Log[] = [];

  // if no last block is set then we fetch until the current block number
  const lastBlock = endBlock || (await provider.getBlockNumber());

  console.log('last', lastBlock)

  // Fetch event logs in batches (lastBlock inclusive)
  for (let i = fromBlock; i <= lastBlock; i += blocksPerRequest + 1) {
    // the last block batch will be either current iteration block + blockPerRequest
    // or the end block if it is set
    const toBlock = i + blocksPerRequest >= lastBlock ? lastBlock : i + blocksPerRequest;

    const [tmpSignUpLogs, tmpDeployPollLogs] =
      // eslint-disable-next-line no-await-in-loop
      await Promise.all([
        maciContract.queryFilter(maciContract.filters.SignUp(), i, toBlock),
        maciContract.queryFilter(maciContract.filters.DeployPoll(), i, toBlock),
      ]);

    signUpLogs = signUpLogs.concat(tmpSignUpLogs as unknown as Log[]);
    deployPollLogs = deployPollLogs.concat(tmpDeployPollLogs as unknown as Log[]);

    if (sleepAmount) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(sleepAmount);
    }
  }

  console.log(signUpLogs, 'dp', deployPollLogs)
  let actions: any[] = [];

// maciInterface
  

  signUpLogs.forEach(log => {
    assert(!!log);
    const mutableLog = { ...log, topics: [...log.topics] };

    const event = maciContract.interface.parseLog(mutableLog) as unknown as {
      args: {
        _stateIndex: number;
        _userPubKeyX: string;
        _userPubKeyY: string;
        _voiceCreditBalance: number;
        _timestamp: number;
      };
    };

    console.log("Maci state from contract4", event);

    actions.push({
      type: "SignUp",
      blockNumber: log.blockNumber,
      transactionIndex: log.transactionIndex,
      data: {
        stateIndex: Number(event.args._stateIndex),
        pubKey: new PubKey([BigInt(event.args._userPubKeyX), BigInt(event.args._userPubKeyY)]),
        voiceCreditBalance: Number(event.args._voiceCreditBalance),
        timestamp: Number(event.args._timestamp),
      },
    });
  });

  let index = 0n;
  const foundPollIds: number[] = [];
  const pollContractAddresses = new Map<bigint, string>();

  deployPollLogs.forEach(log => {
    console.log("Maci state from contract5", log);
    if (!log) {
      return;
    }
    const mutableLogs = { ...log, topics: [...log.topics] };
    const event = maciContract.interface.parseLog(mutableLogs) as unknown as {
      args: {
        _coordinatorPubKeyX: string;
        _coordinatorPubKeyY: string;
        _pollId: bigint;
        pollAddr: {
          poll: string;
          messageProcessor: string;
          tally: string;
        };
      };
    };

    const pubKey = new PubKey([BigInt(event.args._coordinatorPubKeyX), BigInt(event.args._coordinatorPubKeyY)]);

    const p = event.args._pollId;
    console.log("p", p, index);
    assert(p === index);

    const pollAddr = event.args.pollAddr.poll;
    actions.push({
      type: "DeployPoll",
      blockNumber: log.blockNumber,
      transactionIndex: log.transactionIndex,
      data: { pollId: p, pollAddr, pubKey },
    });

    foundPollIds.push(Number(p));
    pollContractAddresses.set(BigInt(p), pollAddr);
    index += 1n;
  });

  // Check whether each pollId exists
  assert(foundPollIds.includes(Number(pollId)), "Error: the specified pollId does not exist on-chain");


  console.log("Maci state from contract6");


  const pollContractAddress = pollContractAddresses.get(pollId)!;
  // const pollContract = new BaseContract(pollContractAddress, [pollContractAbi], provider) as unknown as Poll;
  const pollContract = PollFactory.connect(pollAddress, signer);

  const coordinatorPubKeyOnChain = await pollContract.coordinatorPubKey();
  console.log(coordinatorPubKeyOnChain[0].toString(), coordinatorKeypair.pubKey.rawPubKey[0].toString());
  assert(coordinatorPubKeyOnChain[0].toString() === coordinatorKeypair.pubKey.rawPubKey[0].toString());
  console.log(coordinatorPubKeyOnChain[1].toString(), coordinatorKeypair.pubKey.rawPubKey[1].toString());
  assert(coordinatorPubKeyOnChain[1].toString() === coordinatorKeypair.pubKey.rawPubKey[1].toString());
  console.log("Maci coordinator asserts okay");

  const dd = await pollContract.getDeployTimeAndDuration();
  const deployTime = Number(dd[0]);
  const duration = Number(dd[1]);
  const onChainMaxValues = await pollContract.maxValues();
  const onChainTreeDepths = await pollContract.treeDepths();

  const maxValues = {
    maxMessages: Number(onChainMaxValues.maxMessages),
    maxVoteOptions: Number(onChainMaxValues.maxVoteOptions),
  };
  const treeDepths = {
    intStateTreeDepth: Number(onChainTreeDepths.intStateTreeDepth),
    messageTreeDepth: Number(onChainTreeDepths.messageTreeDepth),
    messageTreeSubDepth: Number(onChainTreeDepths.messageTreeSubDepth),
    voteOptionTreeDepth: Number(onChainTreeDepths.voteOptionTreeDepth),
  };
  const batchSizes = {
    tallyBatchSize: STATE_TREE_ARITY ** Number(onChainTreeDepths.intStateTreeDepth),
    subsidyBatchSize: STATE_TREE_ARITY ** Number(onChainTreeDepths.intStateTreeDepth),
    messageBatchSize: STATE_TREE_ARITY ** Number(onChainTreeDepths.messageTreeSubDepth),
  };

  // fetch poll contract logs
  let publishMessageLogs: Log[] = [];
  let topupLogs: Log[] = [];
  let mergeMaciStateAqSubRootsLogs: Log[] = [];
  let mergeMaciStateAqLogs: Log[] = [];
  let mergeMessageAqSubRootsLogs: Log[] = [];
  let mergeMessageAqLogs: Log[] = [];

  for (let i = fromBlock; i <= lastBlock; i += blocksPerRequest + 1) {
    const toBlock = i + blocksPerRequest >= lastBlock ? lastBlock : i + blocksPerRequest;

    const [
      tmpPublishMessageLogs,
      tmpTopupLogs,
      tmpMergeMaciStateAqSubRootsLogs,
      tmpMergeMaciStateAqLogs,
      tmpMergeMessageAqSubRootsLogs,
      tmpMergeMessageAqLogs,
      // eslint-disable-next-line no-await-in-loop
    ] = await Promise.all([
      pollContract.queryFilter(pollContract.filters.PublishMessage(), i, toBlock),
      pollContract.queryFilter(pollContract.filters.TopupMessage(), i, toBlock),
      pollContract.queryFilter(pollContract.filters.MergeMaciStateAqSubRoots(), i, toBlock),
      pollContract.queryFilter(pollContract.filters.MergeMaciStateAq(), i, toBlock),
      pollContract.queryFilter(pollContract.filters.MergeMessageAqSubRoots(), i, toBlock),
      pollContract.queryFilter(pollContract.filters.MergeMessageAq(), i, toBlock),
    ]);

    publishMessageLogs = publishMessageLogs.concat(tmpPublishMessageLogs as unknown as Log[]);
    topupLogs = topupLogs.concat(tmpTopupLogs as unknown as Log[]);
    mergeMaciStateAqSubRootsLogs = mergeMaciStateAqSubRootsLogs.concat(
      tmpMergeMaciStateAqSubRootsLogs as unknown as Log[],
    );
    mergeMaciStateAqLogs = mergeMaciStateAqLogs.concat(tmpMergeMaciStateAqLogs as unknown as Log[]);
    mergeMessageAqSubRootsLogs = mergeMessageAqSubRootsLogs.concat(tmpMergeMessageAqSubRootsLogs as unknown as Log[]);
    mergeMessageAqLogs = mergeMessageAqLogs.concat(tmpMergeMessageAqLogs as unknown as Log[]);

    if (sleepAmount) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(sleepAmount);
    }
  }

  publishMessageLogs.forEach(log => {
    // assert(!!log);
    console.log("publishMessageLogs", log);
    if (!log) {
      return;
    }
    const mutableLogs = { ...log, topics: [...log.topics] };
    const event = pollContract.interface.parseLog(mutableLogs) as unknown as {
      args: { _message: [string, string[]]; _encPubKey: string[] };
    };

    const message = new Message(
      BigInt(event.args._message[0]),

      event.args._message[1].map(x => BigInt(x)),
    );

    const encPubKey = new PubKey(event.args._encPubKey.map(x => BigInt(x.toString())) as [bigint, bigint]);

    actions.push({
      type: "PublishMessage",
      blockNumber: log.blockNumber,
      transactionIndex: log.transactionIndex,
      data: {
        message,
        encPubKey,
      },
    });
  });

  topupLogs.forEach(log => {
    assert(!!log);
    const mutableLog = { ...log, topics: [...log.topics] };
    const event = pollContract.interface.parseLog(mutableLog) as unknown as {
      args: { _message: [string, string[]] };
    };
    const message = new Message(
      BigInt(event.args._message[0]),
      event.args._message[1].map(x => BigInt(x)),
    );

    actions.push({
      type: "TopupMessage",
      blockNumber: log.blockNumber,
      transactionIndex: log.transactionIndex,
      data: {
        message,
      },
    });
  });

  mergeMessageAqSubRootsLogs.forEach(log => {
    // assert(!!log);
    console.log("mergeMessageAqSubRootsLogs", log);
    if (!log) {
      return;
    }
    const mutableLogs = { ...log, topics: [...log.topics] };
    const event = pollContract.interface.parseLog(mutableLogs) as unknown as { args: { _numSrQueueOps: string } };

    const numSrQueueOps = Number(event.args._numSrQueueOps);
    actions.push({
      type: "MergeMessageAqSubRoots",
      blockNumber: log.blockNumber,
      transactionIndex: log.transactionIndex,
      data: {
        numSrQueueOps,
      },
    });
  });

  console.log("Maci coordinator mergeMessageAqSubRootsLogs okay");


  mergeMessageAqLogs.forEach(log => {
    // assert(!!log);
    const mutableLogs = { ...log, topics: [...log.topics] };
    const event = pollContract.interface.parseLog(mutableLogs);

    const messageRoot = BigInt((event?.args as unknown as { _messageRoot: string })._messageRoot);
    actions.push({
      type: "MergeMessageAq",
      blockNumber: log.blockNumber,
      transactionIndex: log.transactionIndex,
      data: { messageRoot },
    });
  });

  console.log("Maci coordinator mergeMessageAqLogs okay");

  // Sort actions
  actions = sortActions(actions);

  // Reconstruct MaciState in order
  actions.forEach(action => {
    switch (true) {
      case action.type === "SignUp": {
        const { pubKey, voiceCreditBalance, timestamp } = action.data;

        maciState.signUp(pubKey!, BigInt(voiceCreditBalance!), BigInt(timestamp!));
        break;
      }

      case action.type === "DeployPoll" && action.data.pollId?.toString() === pollId.toString(): {
        maciState.deployPoll(
          BigInt(deployTime + duration),
          maxValues,
          treeDepths,
          batchSizes.messageBatchSize,
          coordinatorKeypair,
        );
        break;
      }

      case action.type === "DeployPoll" && action.data.pollId?.toString() !== pollId.toString(): {
        maciState.deployNullPoll();
        break;
      }

      case action.type === "PublishMessage": {
        const { encPubKey, message } = action.data;
        maciState.polls.get(pollId)?.publishMessage(message!, encPubKey!);
        break;
      }

      case action.type === "TopupMessage": {
        const { message } = action.data;
        maciState.polls.get(pollId)?.topupMessage(message!);
        break;
      }

      // ensure that the message root is correct (i.e. all messages have been published offchain)
      case action.type === "MergeMessageAq": {
        assert(maciState.polls.get(pollId)?.messageTree.root.toString() === action.data.messageRoot?.toString());
        break;
      }

      default:
        break;
    }
  });

  // Set numSignUps
  const numSignUpsAndMessages = await pollContract.numSignUpsAndMessages();

  const poll = maciState.polls.get(pollId);

  // ensure all messages were recorded
  console.log('poll len', numSignUpsAndMessages[1], maciState.polls.get(pollId)?.messages.length);
  assert(Number(numSignUpsAndMessages[1]) === poll?.messages.length);
  // set the number of signups
  poll.updatePoll(numSignUpsAndMessages[0]);

  // we need to ensure that the stateRoot is correct
  const stateRoot = await pollContract.mergedStateRoot();
  assert(poll.stateTree?.root.toString() === (await pollContract.mergedStateRoot()).toString());

  maciState.polls.set(pollId, poll);

  return maciState;
};
