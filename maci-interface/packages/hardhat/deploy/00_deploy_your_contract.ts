import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { setVerifyingKeys } from "../../../../cli/ts/commands/setVerifyingKeys";
import { Signer } from "/Users/gaetano/dev/maci/node_modules/.pnpm/ethers@6.11.1/node_modules/ethers/lib.commonjs/providers/signer";
import { deployPoseidonContracts } from "../../../../contracts/build/ts/deploy";
import { IDeployMaciArgs } from "../../../../contracts/build/ts/types";
import {
  buildPoseidonT3,
  buildPoseidonT4,
  buildPoseidonT5,
  buildPoseidonT6,
} from "../../../../contracts/build/ts/buildPoseidon";
import { PubKey } from "maci-domainobjs";
import { publish } from "../../../../cli/ts/commands/publish";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { mergeSignups } from "../../../../cli/ts/commands/mergeSignups";
import { mergeMessages } from "../../../../cli/ts/commands/mergeMessages";
import { genProofs } from "../../../../cli/ts/commands/genProofs";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network goerli`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  

  await deploy("VkRegistry", {
    from: deployer,
    // Contract constructor arguments
    args: [],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // Get the deployed contract to interact with it after deploying.
  const vkRegistry = await hre.ethers.getContract<Contract>("VkRegistry", deployer);

  const vkRegistryAddress = await vkRegistry.getAddress();

  // Get the signer to interact with the contract
  const signer2Provider = await hre.ethers.getSigner(deployer);

  console.log("vkRegistryAddress", vkRegistryAddress);

  await setVerifyingKeys({
    stateTreeDepth: 10,
    intStateTreeDepth: 1,
    messageTreeDepth: 2,
    voteOptionTreeDepth: 2,
    messageBatchDepth: 1,
    processMessagesZkeyPath:
      "/Users/gaetano/dev/maci/maci-interface/packages/hardhat/zkeys/ProcessMessages_10-2-1-2_test/ProcessMessages_10-2-1-2_test.0.zkey",
    tallyVotesZkeyPath:
      "/Users/gaetano/dev/maci/maci-interface/packages/hardhat/zkeys/TallyVotes_10-1-2_test/TallyVotes_10-1-2_test.0.zkey",
    vkRegistry: vkRegistryAddress,
    // subsidyZkeyPath: "/Users/gaetano/dev/maci/maci-interface/packages/hardhat/zkeys/SubsidyPerBatch_10-1-2_test/SubsidyPerBatch_10-1-2_test.0.zkey",
    signer: signer2Provider as unknown as Signer,
    quiet: false,
  });

  const t1 = await buildPoseidonT3();
  const t2 = await buildPoseidonT4();
  const t3 = await buildPoseidonT5();
  const t4 = await buildPoseidonT6();

  await deploy("PoseidonT3", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  const poseidonT3 = await hre.ethers.getContract<Contract>("PoseidonT3", deployer);

  await deploy("PoseidonT4", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  const poseidonT4 = await hre.ethers.getContract<Contract>("PoseidonT4", deployer);

  await deploy("PoseidonT5", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  const poseidonT5 = await hre.ethers.getContract<Contract>("PoseidonT5", deployer);

  await deploy("PoseidonT6", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  const poseidonT6 = await hre.ethers.getContract<Contract>("PoseidonT6", deployer);

  await deploy("ConstantInitialVoiceCreditProxy", {
    from: deployer,
    args: [99],
    log: true,
    autoMine: true,
  });

  await deploy("FreeForAllGatekeeper", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  await deploy("TopupCredit", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  const initialVoiceCreditProxy = await hre.ethers.getContract<Contract>("ConstantInitialVoiceCreditProxy", deployer);
  const freeForAllGatekeeper = await hre.ethers.getContract<Contract>("FreeForAllGatekeeper", deployer);
  const topupCredit = await hre.ethers.getContract<Contract>("TopupCredit", deployer);
  const topupCreditAddress = await topupCredit.getAddress();
  const poseidonT3Address = await poseidonT3.getAddress();
  const poseidonT4Address = await poseidonT4.getAddress();
  const poseidonT5Address = await poseidonT5.getAddress();
  const poseidonT6Address = await poseidonT6.getAddress();

  console.log("poseidonT3Address", poseidonT3Address);
  console.log("poseidonT4Address", poseidonT4Address);
  console.log("poseidonT5Address", poseidonT5Address);
  console.log("poseidonT6Address", poseidonT6Address);

  const initialVoiceCreditsProxyAddress = await initialVoiceCreditProxy.getAddress();
  const signupGatekeeperAddress = await freeForAllGatekeeper.getAddress();

  const contractsToLink = [
    // "MACI",
    "PollFactory",
    "MessageProcessorFactory",
    "TallyFactory",
    "TallyNonQvFactory",
    "SubsidyFactory",
  ];

  const contractsNameToAddress = new Map<string, string>();

  for (const contractName of contractsToLink) {
    await deploy(contractName, {
      from: deployer,
      args: [],
      log: true,
      autoMine: true,
      libraries: {
        PoseidonT3: poseidonT3Address,
        PoseidonT4: poseidonT4Address,
        PoseidonT5: poseidonT5Address,
        PoseidonT6: poseidonT6Address,
      },
    });

    const contract = await hre.ethers.getContract<Contract>(contractName, deployer);
    contractsNameToAddress.set(contractName, await contract.getAddress());
  }

  const stateTreeDepth = 10;

  await deploy("MACI", {
    from: deployer,
    args: [
      contractsNameToAddress.get("PollFactory"),
      contractsNameToAddress.get("MessageProcessorFactory"),
      contractsNameToAddress.get("TallyFactory"),
      contractsNameToAddress.get("SubsidyFactory"),
      signupGatekeeperAddress,
      initialVoiceCreditsProxyAddress,
      topupCreditAddress,
      stateTreeDepth,
    ],
    log: true,
    autoMine: true,
    libraries: {
      PoseidonT3: poseidonT3Address,
      PoseidonT4: poseidonT4Address,
      PoseidonT5: poseidonT5Address,
      PoseidonT6: poseidonT6Address,
    },
  });

  const maci = await hre.ethers.getContract<Contract>("MACI", deployer);
  // node build/ts/index.js deployPoll -t 300 -i 1 -m 2 -b 1 -v 2 -pk $COORDINATOR_PUBLIC_KEY

  const pollDuration = 6000;
  const intStateTreeDepth = 2;
  const messageTreeDepth = 2;
  const messageTreeSubDepth = 1;
  const voteOptionTreeDepth = 2;
  const subsidyEnabled = false;

  await deploy("Verifier", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  const verifierContract = await hre.ethers.getContract<Contract>("Verifier", deployer);
  const verifierContractAddress = await verifierContract.getAddress();

  const userPubKey = "macipk.f61e0aa75073f94c681cc495990cee21027208348598d65638696a1a3754f29b";
  const userPrivateKey = "macisk.48674bb3cff1761affd1d5b25edfe2cd58963561010c0b1a1f52c4bd16315b5c";


const coordinatorPrivateKey = "macisk.9db138fd3d7cb1c3dffef45d29c5cbc7dee307ca5daf5ccd9121bfffa8c79d2e";


  const coordinatorPubkey = "macipk.21d4940747c489b5cfb650e18137275fed6d1f6011bc443faed02099dd9aa5aa";
  const unserializedKey = PubKey.deserialize(coordinatorPubkey);
  // the default signup gatekeeper data
  const DEFAULT_SG_DATA = "0x0000000000000000000000000000000000000000000000000000000000000000";
  // the defualt initial voice credit proxy data
  const DEFAULT_IVCP_DATA = "0x0000000000000000000000000000000000000000000000000000000000000000";

  const tx = await maci.deployPoll(
    pollDuration,
    {
      intStateTreeDepth,
      messageTreeSubDepth,
      messageTreeDepth,
      voteOptionTreeDepth,
    },
    unserializedKey.asContractParam(),
    verifierContractAddress,
    vkRegistry,
    subsidyEnabled,
    { gasLimit: 10000000 },
  );


  // const userUnserializedKey = PubKey.deserialize(userPubKey);
  await maci.signUp(unserializedKey.asContractParam(), DEFAULT_SG_DATA, DEFAULT_IVCP_DATA);
  await maci.signUp(unserializedKey.asContractParam(), DEFAULT_SG_DATA, DEFAULT_IVCP_DATA);


  await publish({
    pubkey: userPubKey,
    stateIndex: BigInt(1),
    voteOptionIndex: BigInt(0),
    nonce: BigInt(0),
    pollId: BigInt(0),
    newVoteWeight: BigInt(3),
    maciContractAddress: await maci.getAddress(),
    salt: BigInt(0),
    privateKey: userPrivateKey,
    signer: signer2Provider as unknown as Signer,
    quiet: false,
  });


  // time.increase(pollDuration*2);
  // const DEFAULT_SR_QUEUE_OPS = 4;

  // const firstPoll = await maci.getPoll(0);


  // const pollContract = await hre.ethers.getContractAt("Poll", firstPoll, signer2Provider);

  // const finished = await pollContract.setFinish(true);

  // await mergeSignups({
  //   pollId: BigInt(0),
  //   maciContractAddress: await maci.getAddress(),
  //   numQueueOps: DEFAULT_SR_QUEUE_OPS.toString(),
  //   quiet: false,
  //   signer: signer2Provider as unknown as Signer,
  // });


  // await mergeMessages({
  //   pollId: BigInt(0),
  //   maciContractAddress: await maci.getAddress(),
  //   numQueueOps: DEFAULT_SR_QUEUE_OPS.toString(),
  //   quiet: false,
  //   signer: signer2Provider as unknown as Signer,
  // });

  // node build/ts/index.js genProofs \
  // -sk $COORDINATOR_PRIVATE_KEY \
  // -o 0 \
  // -t tally33.json \
  // -f proofs \
  // -zp ./zkeys/ProcessMessages_10-2-1-2_test/ProcessMessages_10-2-1-2_test.0.zkey \
  // -zt ./zkeys/TallyVotes_10-1-2_test/TallyVotes_10-1-2_test.0.zkey \
  // -tw ./zkeys/TallyVotes_10-1-2_test/TallyVotes_10-1-2_test_js/TallyVotes_10-1-2_test.wasm \
  // -pw ./zkeys/ProcessMessages_10-2-1-2_test/ProcessMessages_10-2-1-2_test_js/ProcessMessages_10-2-1-2_test.wasm \
  // -w true \



  // await genProofs({
  //   pollId: BigInt(0),
  //   tallyFile: "/Users/gaetano/dev/maci/maci-interface/packages/nextjs/app/maci/_utils/path/tallyyy.json",
  //   outputDir: "/Users/gaetano/dev/maci/maci-interface/packages/nextjs/app/maci/_utils/path",
  //   processZkey: "/Users/gaetano/dev/maci/maci-interface/packages/hardhat/zkeys/ProcessMessages_10-2-1-2_test/ProcessMessages_10-2-1-2_test.0.zkey",
  //   tallyZkey: "/Users/gaetano/dev/maci/maci-interface/packages/hardhat/zkeys/TallyVotes_10-1-2_test/TallyVotes_10-1-2_test.0.zkey",
  //   processWasm: "/Users/gaetano/dev/maci/maci-interface/packages/hardhat/zkeys/ProcessMessages_10-2-1-2_test/ProcessMessages_10-2-1-2_test_js/ProcessMessages_10-2-1-2_test.wasm",
  //   tallyWasm: "/Users/gaetano/dev/maci/maci-interface/packages/hardhat/zkeys/TallyVotes_10-1-2_test/TallyVotes_10-1-2_test_js/TallyVotes_10-1-2_test.wasm",
  //   maciAddress: "0x9A676e781A523b5d0C0e43731313A708CB607508",
  //   coordinatorPrivKey: "macisk.9db138fd3d7cb1c3dffef45d29c5cbc7dee307ca5daf5ccd9121bfffa8c79d2e",
  //   useWasm: true,
  //   signer: signer2Provider as unknown as Signer,
  // });


  await deploy("Poll", {
    from: deployer,
    // Contract constructor arguments
    args: [
      60000,
      {
        maxMessages:100,
        maxVoteOptions: 200,
      },
      {
        intStateTreeDepth,
        messageTreeSubDepth,
        messageTreeDepth,
        voteOptionTreeDepth,
      },
      unserializedKey.asContractParam(),
      {
        maci: await maci.getAddress(),
        messageAq: topupCreditAddress,
        topupCredit: topupCreditAddress,
      },
    ],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
    libraries: {
      PoseidonT3: poseidonT3Address,
      PoseidonT4: poseidonT4Address,
      PoseidonT5: poseidonT5Address,
      PoseidonT6: poseidonT6Address,
    },
  });

  
};

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployYourContract.tags = ["VkRegistry"];
