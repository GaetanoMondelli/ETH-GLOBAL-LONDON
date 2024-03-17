#!/bin/bash

# Navigate to the directory
# cd /Users/gaetano/dev/maci/cli

GAETANO_PUBLIC_KEY=macipk.f61e0aa75073f94c681cc495990cee21027208348598d65638696a1a3754f29b
GAETANO_PRIVATE_KEY=macisk.48674bb3cff1761affd1d5b25edfe2cd58963561010c0b1a1f52c4bd16315b5c


MIKE_PUBLIC_KEY=macipk.6d353a6ca0ca73d5c3a2e8ffe4346eff2296dac87675cfec3be46ee0cbab35a2
MIKE_PRIVATE_KEY=macisk.984e4f56a8ef50d6aee6a3bcb1df6058c0d336ed9aff26a7aff7879943e203e6

COORDINATOR_PUBLIC_KEY=macipk.21d4940747c489b5cfb650e18137275fed6d1f6011bc443faed02099dd9aa5aa
COORDINATOR_PRIVATE_KEY=macisk.9db138fd3d7cb1c3dffef45d29c5cbc7dee307ca5daf5ccd9121bfffa8c79d2e

# rm -rf proofs
# rm localState.json
# rm tally.json
# rm tally2.json
# rm tally3.json



# make sure to have the hardhat node running on 127..0.0.1:8545 sometimes does not match localhsot:8545
echo 'Running Hardhat node'
npm run chain &


echo "Deploying VK Registry"

VK_REGISTRY_ADDRESS=$(node build/ts/index.js deployVkRegistry | grep -o "0x[0-9a-fA-F]*")

echo "VK Registry deployed at: $VK_REGISTRY_ADDRESS"

echo "Verifying VK Keys"

node build/ts/index.js setVerifyingKeys \
    -s 10 -i 1 -m 2 -v 2 -b 1 \
    -p ./zkeys/ProcessMessages_10-2-1-2_test/ProcessMessages_10-2-1-2_test.0.zkey \
    -t ./zkeys/TallyVotes_10-1-2_test/TallyVotes_10-1-2_test.0.zkey \


echo "Creating MACI instance"

MACI_ADDRESS=$(node build/ts/index.js create -s 10 | grep -o "0x[0-9a-fA-F]*")

echo "MACI instance created at: $MACI_ADDRESS"

echo "Deploying Poll"

node build/ts/index.js deployPoll -t 300 -i 1 -m 2 -b 1 -v 2 -pk $COORDINATOR_PUBLIC_KEY


echo "Gaetano Signing up"

node build/ts/index.js signup -p $GAETANO_PUBLIC_KEY

# echo "Mike Signing up"

# node build/ts/index.js signup -p $MIKE_PUBLIC_KEY

echo "Gaetano Submitting vote"

node build/ts/index.js publish \
    -p $GAETANO_PUBLIC_KEY \
    -sk $GAETANO_PRIVATE_KEY \
    -i 1 -v 0 -w 9 -n 1 -o 0

# node build/ts/index.js publish \
#     -p $GAETANO_PUBLIC_KEY \
#     -sk $GAETANO_PRIVATE_KEY \
#     -i 1 -v 0 -w 7 -n 1 -o 0

# echo "Mike Submitting vote"

# node build/ts/index.js publish \
#     -p $MIKE_PUBLIC_KEY \
#     -sk $MIKE_PRIVATE_KEY \
#     -i 2 -v 1 -w 9 -n 1 -o 0

echo "Let's fast forward time to the end of the poll"

node build/ts/index.js timeTravel -s 300

echo "Merge State Tree for signups"

node build/ts/index.js mergeSignups -o 0

echo "Merge State Tree for votes (messages as they can also include topups)"

node build/ts/index.js mergeMessages -o 0

# OFF CHAIN

echo "generate MACI state off chain"

node build/ts/index.js genLocalState -p 0 -o localState33.json -sk $COORDINATOR_PRIVATE_KEY -bb 50


# echo "generate proofs C++ witness parameters"

# node build/ts/index.js genProofs -x $MACI_ADDRESS \
#     -sk $COORDINATOR_PRIVATE_KEY \
#     -o 0 \
#     -t tally.json \
#     -f proofs \
#     -r ~/rapidsnark/build/prover \
#     -wp ./zkeys/ProcessMessages_10-2-1-2_test/ProcessMessages_10-2-1-2_test_cpp/ProcessMessages_10-2-1-2_test \
#     -wt ./zkeys/TallyVotes_10-1-2_test/TallyVotes_10-1-2_test_cpp/TallyVotes_10-1-2_test \
#     -zp ./zkeys/ProcessMessages_10-2-1-2_test/ProcessMessages_10-2-1-2_test.0.zkey \
#     -zt ./zkeys/TallyVotes_10-1-2_test/TallyVotes_10-1-2_test.0.zkey \

# echo "WASM Parameters"

node build/ts/index.js genProofs \
    -sk $COORDINATOR_PRIVATE_KEY \
    -o 0 \
    -t tally33.json \
    -f proofs \
    -zp ./zkeys/ProcessMessages_10-2-1-2_test/ProcessMessages_10-2-1-2_test.0.zkey \
    -zt ./zkeys/TallyVotes_10-1-2_test/TallyVotes_10-1-2_test.0.zkey \
    -tw ./zkeys/TallyVotes_10-1-2_test/TallyVotes_10-1-2_test_js/TallyVotes_10-1-2_test.wasm \
    -pw ./zkeys/ProcessMessages_10-2-1-2_test/ProcessMessages_10-2-1-2_test_js/ProcessMessages_10-2-1-2_test.wasm \
    -w true \

# echo "Non quadratic voting"

# node build/ts/index.js genProofs \
#     -sk  $COORDINATOR_PRIVATE_KEY \
#     -o 0 \
#     -t tally3.json \
#     -f proofs \
#     -zp ./zkeys/ProcessMessagesNonQv_10-2-1-2_test/ProcessMessagesNonQv_10-2-1-2_test.0.zkey \
#     -zt ./zkeys/TallyVotesNonQv_10-1-2_test/TallyVotesNonQv_10-1-2_test.0.zkey \
#     -tw ./zkeys/TallyVotesNonQv_10-1-2_test/TallyVotesNonQv_10-1-2_test_js/TallyVotesNonQv_10-1-2_test.wasm \
#     -pw ./zkeys/ProcessMessagesNonQv_10-2-1-2_test/ProcessMessagesNonQv_10-2-1-2_test_js/ProcessMessagesNonQv_10-2-1-2_test.wasm \
#     -w true \
#     -uq false

echo "Prove on chain"

node build/ts/index.js proveOnChain -o 0 -f proofs/

#  Verify on chain

echo "Verify on chain"

node build/ts/index.js verify \
    -o 0 \
    -t tally3.json \