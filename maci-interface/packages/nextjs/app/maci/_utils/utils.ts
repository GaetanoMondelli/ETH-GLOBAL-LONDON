import type { BigNumberish, FeeData, Network, Signer } from "ethers";
import { Ownable } from "../../../../hardhat/typechain-types";

/**
 * Format a SnarkProof type to an array of strings
 * which can be passed to the Groth16 verifier contract.
 * @param proof the SnarkProof to format
 * @returns an array of strings
 */
export const formatProofForVerifierContract = (proof: any): string[] =>
  [
    proof.pi_a[0],
    proof.pi_a[1],

    proof.pi_b[0][1],
    proof.pi_b[0][0],
    proof.pi_b[1][1],
    proof.pi_b[1][0],

    proof.pi_c[0],
    proof.pi_c[1],
  ].map((x) => x.toString());

/**
 * Pause the thread for n milliseconds
 * @param ms - the amount of time to sleep in milliseconds
 */
export const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

/**
 * The comparision function for Actions based on block number and transaction
 * index.
 * @param actions - the array of actions to sort
 * @returns the sorted array of actions
 */
export function sortActions(actions: any[]): any[] {
  return actions.slice().sort((a, b) => {
    if (a.blockNumber > b.blockNumber) {
      return 1;
    }

    if (a.blockNumber < b.blockNumber) {
      return -1;
    }

    if (a.transactionIndex > b.transactionIndex) {
      return 1;
    }

    if (a.transactionIndex < b.transactionIndex) {
      return -1;
    }

    return 0;
  });
}

/**
 * Print to the console
 * @param msg - the message to print
 * @param quiet - whether to suppress console output
 */
export const log = (msg: string, quiet: boolean): void => {
  if (!quiet) {
    // eslint-disable-next-line no-console
    console.log(msg);
  }
};


/**
 * Convert bignumberish to hex
 *
 * @param value - bignumberish string
 * @returns hex representation of it
 */
export function asHex(value: BigNumberish): string {
  return `0x${BigInt(value).toString(16)}`;
}
