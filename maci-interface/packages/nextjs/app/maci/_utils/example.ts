// # node build/ts/index.js genProofs \
// #     -sk $COORDINATOR_PRIVATE_KEY \
// #     -o 0 \
// #     -t tally.json \
// #     -f proofs \
// #     -zp ../../../../hardhat/zkeys/ProcessMessages_10-2-1-2_test/ProcessMessages_10-2-1-2_test.0.zkey \
// #     -zt ../../../../hardhat/zkeys/TallyVotes_10-1-2_test/TallyVotes_10-1-2_test.0.zkey \
// #     -tw ../../../../hardhat/zkeys/TallyVotes_10-1-2_test/TallyVotes_10-1-2_test_js/TallyVotes_10-1-2_test.wasm \
// #     -pw ../../../../hardhat/zkeys/ProcessMessages_10-2-1-2_test/ProcessMessages_10-2-1-2_test_js/ProcessMessages_10-2-1-2_test.wasm \
// #     -w true \
// npx ts-node /Users/gaetano/dev/maci/maci-interface/packages/nextjs/app/maci/_utils/example.ts
const { GenProofsArg, mergeSignups, mergeMessages } = require("maci-cli");
const { genProofs } = require("./genProofs");

// const genProofs = async ({
//     outputDir,
//     tallyFile,
//     tallyZkey,
//     processZkey,
//     pollId,
//     subsidyFile,
//     subsidyZkey,
//     rapidsnark,
//     processWitgen,
//     processDatFile,
//     tallyWitgen,
//     tallyDatFile,
//     subsidyWitgen,
//     subsidyDatFile,
//     coordinatorPrivKey,
//     maciAddress,
//     transactionHash,
//     processWasm,
//     tallyWasm,
//     subsidyWasm,
//     useWasm,
//     stateFile,
//     startBlock,
//     blocksPerBatch,
//     endBlock,
//     signer,
//     tallyAddress,
//     useQuadraticVoting = true,
//     quiet = true,
//   }: GenProofsArgs): Promise<TallyData> => {

// export const mergeSignups = async ({
//     pollId,
//     maciContractAddress,
//     numQueueOps,
//     signer,
//     quiet = true,

// export const mergeMessages = async ({
//     pollId,
//     quiet = true,
//     maciContractAddress,
//     numQueueOps,
//     signer,

const { ethers, JsonRpcProvider, Wallet } = require("ethers");

const provider = new JsonRpcProvider("http://127.0.0.1:8545");

const skaffoldDeployerKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const signer = new ethers.Wallet(skaffoldDeployerKey, provider);

async function moveDeadlineForward(seconds: number, provider: any) {
  await provider.send("evm_increaseTime", [seconds]);
  await provider.send("evm_mine", []);
}

async function main() {
  //   await moveDeadlineForward(120000, provider);
  console.log("mergeMessages");

  const userPub = "macipk.f61e0aa75073f94c681cc495990cee21027208348598d65638696a1a3754f29b";
  const userPri = "macisk.48674bb3cff1761affd1d5b25edfe2cd58963561010c0b1a1f52c4bd16315b5c";
  
  
  


  await mergeMessages({
    pollId: 0,
    maciContractAddress: "0x9A676e781A523b5d0C0e43731313A708CB607508",
    numQueueOps: 1,
    signer,
  });

  await mergeSignups({
    pollId: 0,
    maciContractAddress: "0x9A676e781A523b5d0C0e43731313A708CB607508",
    numQueueOps: 1,
    signer,
  });

  await genProofs({
    outputDir: "/Users/gaetano/dev/maci/maci-interface/packages/nextjs/app/maci/_utils/path",
    tallyFile: "/Users/gaetano/dev/maci/maci-interface/packages/nextjs/app/maci/_utils/path/tally.json",
    tallyZkey:
      "/Users/gaetano/dev/maci/maci-interface/packages/hardhat/zkeys/TallyVotes_10-1-2_test/TallyVotes_10-1-2_test.0.zkey",
    processZkey:
      "/Users/gaetano/dev/maci/maci-interface/packages/hardhat/zkeys/ProcessMessages_10-2-1-2_test/ProcessMessages_10-2-1-2_test.0.zkey",
    pollId: 0,
    maciAddress: "0x9A676e781A523b5d0C0e43731313A708CB607508",
    coordinatorPrivKey: "macisk.9db138fd3d7cb1c3dffef45d29c5cbc7dee307ca5daf5ccd9121bfffa8c79d2e",
    processWasm:
      "/Users/gaetano/dev/maci/maci-interface/packages/hardhat/zkeys/ProcessMessages_10-2-1-2_test/ProcessMessages_10-2-1-2_test_js/ProcessMessages_10-2-1-2_test.wasm",
    tallyWasm:
      "/Users/gaetano/dev/maci/maci-interface/packages/hardhat/zkeys/TallyVotes_10-1-2_test/TallyVotes_10-1-2_test_js/TallyVotes_10-1-2_test.wasm",
    ethereumProvider: "http://127.0.0.1:8545",
    useWasm: true,
    signer,
  });
}
// /Users/gaetano/dev/maci/maci-interface/packages/hardhat/zkeys
main();
