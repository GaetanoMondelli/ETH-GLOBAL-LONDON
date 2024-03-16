"use client";

import React, { use, useEffect, useState } from "react";
import { MaciPubKeyViewer } from "./MaciPubKeyViewer";
import { BigNumber } from "@ethersproject/bignumber";
import { Tag } from "antd";
import { Keypair, PrivKey, PubKey } from "maci-domainobjs";
import { useAccount, useContractRead, useContractWrite, useNetwork } from "wagmi";
import { displayTxResult } from "~~/app/debug/_components/contract";
import { useDeployedContractInfo, useTransactor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getParsedError, notification } from "~~/utils/scaffold-eth";
import { getAllContracts } from "~~/utils/scaffold-eth/contractsData";

export const r = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");

export const genKeyPair = ({ seed, quiet = true }: any): { publicKey: string; privateKey: string } => {
  // create the new random keypair if there is no seed value
  const keypair = new Keypair(seed ? new PrivKey(seed % r) : undefined);

  // serialize both private and public keys
  const serializedPubKey = keypair.pubKey.serialize();
  const serializedPrivKey = keypair.privKey.serialize();

  return {
    publicKey: serializedPubKey,
    privateKey: serializedPrivKey,
  };
};

export function Poll({
  address,
  icon,
  title,
  voiceTokenAddress,
  symbol,
}: {
  address: string;
  icon?: string;
  title?: string;
  symbol?: string;
  voiceTokenAddress?: string;
}) {
  const writeTxn = useTransactor();
  const { chain } = useNetwork();
  const { address: connectedAddress } = useAccount();

  const { targetNetwork } = useTargetNetwork();

  const contractsData = getAllContracts();

  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo("Poll");
  const readMethods = ["numMessages", "numSignups", "coordinatorPubKey", "finished"];
  const [numMsg, setNumMsg] = useState<any>();
  const [numSignups, setNumSignups] = useState<any>();
  const [finished, setFinished] = useState<any>();
  const [coordinatorPubKey, setCoordinatorPubKey] = useState<any>();
  const queryResults = new Map<string, any>();
  const setStateVariables = [setNumMsg, setNumSignups, setCoordinatorPubKey, setFinished];

  // get state index from local storage

  const stateIndex = localStorage.getItem("stateIndex");


  const {
    data: appr,
    isLoading: isApproveLoading,
    writeAsync: approveAsync,
  } = useContractWrite({
    address: voiceTokenAddress,
    functionName: "approve",
    abi: contractsData["TopupCredit"].abi,
    args: [address, "10000"],
  });

  const handleApprove = async () => {
    if (approveAsync) {
      try {
        const makeWriteWithParams = () => approveAsync();
        await writeTxn(makeWriteWithParams);
        // onChange();
      } catch (e: any) {
        const message = getParsedError(e);
        notification.error(message);
      }
    }
  };

  const {
    data: topp,
    isLoading: isTopLoading,
    writeAsync: topupAsync,
  } = useContractWrite({
    address: address,
    functionName: "topup",
    abi: contractsData["Poll"].abi,
    args: [stateIndex, "10"],
  });

  const handleTopup = async () => {
    if (topupAsync) {
      try {
        const makeWriteWithParams = () => topupAsync();
        await writeTxn(makeWriteWithParams);
        // onChange();
      } catch (e: any) {
        const message = getParsedError(e);
        notification.error(message);
      }
    }
  };

  const {
    data: fini,
    isLoading: isFinishedLoading,
    writeAsync: finishAsync,
  } = useContractWrite({
    address: address,
    functionName: "setFinish",
    abi: contractsData["Poll"].abi,
    args: [true],
  });

  const handleFinish = async () => {
    if (finishAsync) {
      try {
        const makeWriteWithParams = () => finishAsync();
        await writeTxn(makeWriteWithParams);
        // onChange();
      } catch (e: any) {
        const message = getParsedError(e);
        notification.error(message);
      }
    }
  };

  readMethods.forEach(methodName => {
    queryResults.set(
      methodName,
      useContractRead({
        address: address,
        functionName: methodName,
        abi: deployedContractData?.abi as any,
        args: [],
        enabled: false,
        onError: (error: any) => {
          const parsedErrror = getParsedError(error);
          console.log(parsedErrror);
        },
      }),
    );
  });

  useEffect(() => {
    async function fetchData(isFetching: any, refetch: any, setData: any) {
      if (isFetching) {
        return;
      }
      if (refetch) {
        const { data } = await refetch();
        console.log("ciao key", data);
        setData(data);
      }
    }

    readMethods.map((value, key) => {
      fetchData(queryResults.get(value).isFetching, queryResults.get(value).refetch, setStateVariables[key]);
    });
  }, [deployedContractData]);

  return (
    <div
      className="card"
      style={{
        padding: 20,
        margin: 20,
        width: 800,
        // textAlign: "center",
      }}
    >
      {title && (
        <>
          <img src={icon} style={{ width: 50, height: 50 }} />
          <h1
            style={{
              textAlign: "center",
              fontSize: 20,
            }}
          >
            {title}
          </h1>
        </>
      )}
      <h1>Poll Id 0</h1>
      <br></br>

      {/* <h1>State</h1>
      <p>{displayTxResult(finished)}</p> */}
      <button
        onClick={() => {
          handleFinish();
        }}
        className="btn btn-secondary btn-sm"
      >
        TIME-MACHINE
      </button>
      <br></br>

      <h1>
        Topup for{" "}
        {stateIndex ? <Tag color="green">Stateindex: {stateIndex}</Tag> : <Tag color="red">NotRegistered</Tag>}
      </h1>
        <br></br>

      <button
        onClick={() => {
          handleApprove();
        }}
        className="btn btn-secondary btn-sm"
      >
        Approve
      </button>




      <br></br>
      <button
        onClick={() => {
          handleTopup();
        }}
        className="btn btn-secondary btn-sm"
      >
        Topup
      </button>
      <br></br>
      <br></br>
      <hr></hr>
      <br></br>
      <br></br>

      <h1>Num Messages</h1>
      <p>{numMsg && displayTxResult(numMsg)}</p>
      <h1>Num Signups (when completed)</h1>
      <p>{numSignups && displayTxResult(numSignups)}</p>
      <h1>Coordinator Public Key</h1>
      {coordinatorPubKey && <MaciPubKeyViewer address={new PubKey(coordinatorPubKey).serialize()} />}
      {coordinatorPubKey && (
        <>
          <p>
            Part1:
            {BigInt(coordinatorPubKey[0]).toString()}
          </p>
          <p>
            Part2:
            {BigInt(coordinatorPubKey[1]).toString()}
          </p>
        </>
      )}

      <br></br>
      <br></br>
    </div>
  );
}
