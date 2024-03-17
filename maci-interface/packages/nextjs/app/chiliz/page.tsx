// import { DebugContracts } from "./_components/DebugContracts";
"use client";

import { useEffect, useState } from "react";
import { TxReceipt, displayTxResult } from "../debug/_components/contract";
import { Poll, genKeyPair } from "../maci/_components/Poll";
import { MaciPubKeyViewer } from "./_components/MaciPubKeyViewer";
import { MatrixView } from "./_components/MatrixView";
import { genLocalState } from "./_utils/genLocalState";
import { mergeMessages } from "./_utils/mergeMessages";
import { mergeSignups } from "./_utils/mergeSignups";
import { publish } from "./_utils/publish";
import "./index.css";
import { BigNumber } from "@ethersproject/bignumber";
import { Collapse, CollapseProps, InputNumber, Modal, Radio, Select, Spin } from "antd";
import { ethers } from "ethers";
import { Keypair, PubKey } from "maci-domainobjs";
import type { NextPage } from "next";
import { TransactionReceipt } from "viem";
import { useAccount, useConnect, useContractRead, useContractWrite, useNetwork } from "wagmi";
import { useDeployedContractInfo, useTransactor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getParsedError, notification } from "~~/utils/scaffold-eth";
import { getAllContracts } from "~~/utils/scaffold-eth/contractsData";
// import Tweet from './Tweet';

// import { DebugContracts } from "./_components/DebugContracts";

// import { DebugContracts } from "./_components/DebugContracts";

const TxnNotification = ({ message, blockExplorerLink }: { message: string; blockExplorerLink?: string }) => {
  return (
    <div className={`flex flex-col ml-1 cursor-default`}>
      <p className="my-0">{message}</p>
      {blockExplorerLink && blockExplorerLink.length > 0 ? (
        <a href={blockExplorerLink} target="_blank" rel="noreferrer" className="block link text-md">
          check out transaction
        </a>
      ) : null}
    </div>
  );
};

const MACIPage: NextPage = () => {
  const initialCollateralAmount = 1;

  const contractsData = getAllContracts();
  const [maciPrivKey, setMaciPrivkey] = useState<any>();
  const [maciParam, setMaciParam] = useState<any>();

  const writeTxn = useTransactor();
  const { chain } = useNetwork();
  const { connect, connectors } = useConnect();

  const { targetNetwork } = useTargetNetwork();
  const writeDisabled = !chain || chain?.id !== targetNetwork.id;
  const { address: connectedAddress } = useAccount();

  const contractName = "MACI";
  const pollAddressTmp = "0xc4E84A37F388b81a254b092ADa509Fe46075BFc7";
  const maciAddress = "0xDCB5008c6074bEB53317027534431b2c75B77eD4";

  const DEFAULT_SG_DATA = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const DEFAULT_IVCP_DATA = "0x0000000000000000000000000000000000000000000000000000000000000000";

  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo(contractName);
  const readMethods = ["stateAq", "nextPollId", "numSignUps"];
  const [stateAq, setStateAq] = useState<any>();
  const [nextPollId, setNextPollId] = useState<any>();
  const [maciPubKey, setMaciPubKey] = useState<any>();
  const [numSignUps, setNumSignUps] = useState<any>();
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [visibleModal, setVisibleModal] = useState("false");
  const [tally, setTally] = useState<any>();
  const [voteOption, setVoteOption] = useState<any>(0);
  const [weight, setWeight] = useState<any>(2);
  const queryResults = new Map<string, any>();
  const setStateVariables = [setStateAq, setNextPollId, setNumSignUps];

  // <Select.Option value="0">Option 0</Select.Option>
  // <Select.Option value="1">Option 1</Select.Option>
  // <Select.Option value="2">Option 2</Select.Option>

  const options: Record<string, any> = {
    "0": "Option 1",
    "1": "Option 2",
    "2": "Option 3",
  };

  const voiceCreditSymbol = "testJUV";

  const icon = "https://creativereview.imgix.net/content/uploads/2017/01/Juve-sq.jpg";

  async function connectToMetamask() {
    if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
      // Request account access if necessary
      await window.ethereum.request({ method: "eth_requestAccounts" });
      // We use ethers to create a new provider based on MetaMask's provider
      const provider = new ethers.BrowserProvider(window.ethereum);
      // The signer is what we use to send transactions
      const signer = provider.getSigner();
      return signer;
    } else {
      console.error("MetaMask is not installed!");
      return null;
    }
  }

  readMethods.forEach(methodName => {
    queryResults.set(
      methodName,
      useContractRead({
        address: maciAddress,
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

  useEffect(() => {
    if (!maciPubKey) {
      const maciPubKey = localStorage.getItem("maciPubKey");
      const maciPrivKey = localStorage.getItem("maciPrivKey");
      if (!maciPubKey || !maciPrivKey) return;
      setMaciPubKey(maciPubKey);
      setMaciPrivkey(maciPrivKey);
      setMaciParam(PubKey.deserialize(maciPubKey).asContractParam());
    }
  }, []);

  const {
    data: result,
    isLoading,
    writeAsync,
  } = useContractWrite({
    address: maciAddress,
    functionName: "signUp",
    abi: contractsData[contractName].abi,
    args: [maciParam, DEFAULT_SG_DATA, DEFAULT_IVCP_DATA],
  });

  const {
    data: balanceOf,
    isFetching,
    refetch,
  } = useContractRead({
    address: "0xe63D576Dbff811650F9823a63Ed05DEfE5f43533",
    functionName: "balanceOf",
    abi: contractsData["TopupCredit"].abi,
    args: [connectedAddress],
    enabled: false,
    onError: (error: any) => {
      const parsedErrror = getParsedError(error);
      console.log(parsedErrror);
    },
  });

  useEffect(() => {
    if (!isFetching) {
      refetch();
    }
  }, [connectedAddress]);

  const items: CollapseProps["items"] = [
    {
      key: "1",
      label: "Check Tally",
      children: <code>{JSON.stringify(tally, null, 2)}</code>,
    },
  ];

  const handleWrite = async () => {
    if (writeAsync) {
      try {
        const makeWriteWithParams = () => writeAsync();
        const txhashstring = await writeTxn(makeWriteWithParams);
        // TO-DO: need to take this from the event
        // STORE THE Number Signups (STATE INDEX) to the local storage
        if (numSignUps) localStorage.setItem("stateIndex", numSignUps);
        if (!txhashstring) {
          return;
        }

        // get logs from the transaction
        const iface = deployedContractData?.abi;
        // refresh the page
        window.location.reload();

        // onChange();
      } catch (e: any) {
        const message = getParsedError(e);
        notification.error(message);
      }
    }
  };

  return (
    <>
      <div
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "10px",
          color: "black",
          // centering the card
          margin: "auto",
          width: "1000px",
        }}
        className="card"
      >
        <img
          src="https://www.chiliz.com/wp-content/uploads/2023/02/chiliz-logo-v3.svg"
          alt="Chiliz"
          style={{
            width: "200px",
            height: "auto",
            display: "block",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        />
        <br></br>
        {/* <Tweet text="Share the zKosios poll at localhost:3000/chill" /> */}
        {/* <p>State of polls</p>
        <p>{stateAq && displayTxResult(stateAq)}</p> */}
        {/* <p>Next poll id</p>
        <p>{nextPollId && displayTxResult(nextPollId)}</p> */}
        <button
          onClick={() => {
            const keyPair = genKeyPair({ seed: BigInt(0) });
            setMaciPubKey(keyPair.publicKey);
            setMaciPrivkey(keyPair.privateKey);
            setMaciParam(PubKey.deserialize(keyPair.publicKey).asContractParam());
            // store those keys in the local storage
            localStorage.setItem("maciPubKey", keyPair.publicKey);
            localStorage.setItem("maciPrivKey", keyPair.privateKey);
            // unset the state index
            localStorage.removeItem("stateIndex");
          }}
          className="btn btn-secondary btn-sm"
        >
          Generate MACI wallet
        </button>
        <br></br>
        <br></br>
        <div
          // flex items on the same line
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginRight: "30%",
            marginLeft: "30%",
          }}
        >
          {maciPubKey && <MaciPubKeyViewer address={maciPubKey} />}
          <div
            // flex items on above the other
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <img src="http://localhost:3000/zkosios.png" alt="juve1" style={{ width: "70px", height: "auto" }} />
            <h2>ZKOSIOS</h2>
          </div>
          <p>Balance: <br></br>{Number(displayTxResult(balanceOf))} testJUV</p>
        </div>
        <br></br>
        <hr></hr>
        <button
          onClick={() => {
            handleWrite();
          }}
          className="btn btn-secondary btn-sm"
        >
          Sign up to MACI
        </button>
        <br></br>
        <hr></hr>
        <hr></hr>
        <br></br>
        <code>
        Number Signups:
        {numSignUps && displayTxResult(numSignUps)}
        <br></br>
        Next Poll Id:
        {nextPollId && displayTxResult(nextPollId)}
        </code>
        <Poll 
        voiceTokenAddress={"0xe63D576Dbff811650F9823a63Ed05DEfE5f43533"}
        icon={icon} title={"AWAY JERSEY 2024/2045"} address={pollAddressTmp}></Poll>
        <br></br>
        <hr></hr>
        <br></br>

        <h1
          style={{
            fontSize: "20px",
          }}
        >
          AWAY JERSEY 2024/2045
        </h1>
        <p>Options</p>

        <Radio.Group
          onChange={value => {
            console.log(value.target.value);
            setVoteOption(value.target.value);
          }}
          // value={voteOption}
        >
          <Radio value={0}>
            <div>
              <img src="http://localhost:3000/juve1.png" alt="juve1" style={{ width: "250px", height: "290px" }} />
            </div>
          </Radio>
          <Radio value={1}>
            <div>
              <img src="http://localhost:3000/juve2.png" alt="juve1" style={{ width: "250px", height: "290px" }} />
            </div>
          </Radio>
          <Radio value={2}>
            <div>
              <img src="http://localhost:3000/juve3.png" alt="juve1" style={{ width: "250px", height: "290px" }} />
            </div>
          </Radio>
        </Radio.Group>

        {/* <Select
          onChange={value => {
            console.log(value);
            setVoteOption(value);
          }}
          defaultValue="0"
        >
          {Object.keys(options).map(key => {
            return <Select.Option value={key}>{options[key]}</Select.Option>;
          })}
        </Select> */}
        <br></br>
        <p>
          <b>
            Vote weight for {voteOption} will cost {Number(weight) * Number(weight)} {voiceCreditSymbol}
          </b>
          <br></br>
          <br></br>

          <InputNumber
            min={1}
            max={10}
            defaultValue={2}
            onChange={value => {
              setWeight(value);
            }}
          />
        </p>
        <br></br>
        <br></br>
        <button
          onClick={async () => {
            const result = await publish({
              pubkey: maciPubKey,
              stateIndex: BigInt(1),
              voteOptionIndex: BigInt(0),
              nonce: BigInt(0),
              pollId: BigInt(0),
              newVoteWeight: BigInt(9),
              maciContractAddress: maciAddress,
              salt: BigInt(0),
              privateKey: maciPrivKey,
              signer: (await connectToMetamask()) as any,
              quiet: true,
            });

            const response = await fetch(`http://localhost:3000/api/tally2?v=${voteOption}&w=${weight}`);
            console.log(response);

            notification.success(
              <TxnNotification message="Vote completed successfully!" blockExplorerLink={result.tx} />,
              {
                icon: "🎉",
              },
            );
          }}
          className="btn btn-secondary btn-sm"
        >
          Vote
        </button>
        <br></br>
        <hr></hr>
        <h1>ADMIN</h1>
        <br></br>
        <br></br>
        <br></br>
        <hr></hr>
        <button
          className="btn btn-primary btn-sm"
          onClick={async () => {
            await mergeMessages({
              pollId: 0,
              quiet: true,
              maciContractAddress: maciAddress,
              numQueueOps: 0,
              signer: (await connectToMetamask()) as any,
            });
            notification.success(<TxnNotification message="Merged messages successfully!" />, {
              icon: "🎉",
            });
          }}
        >
          MERGE SIGNUPS
        </button>
        <br></br>
        <br></br>
        <hr></hr>
        <button
          className="btn btn-primary btn-sm"
          onClick={async () => {
            await mergeSignups({
              pollId: 0,
              quiet: true,
              maciContractAddress: maciAddress,
              numQueueOps: 0,
              signer: (await connectToMetamask()) as any,
            });
            notification.success(<TxnNotification message="Merged signups successfully!" />, {
              icon: "🎉",
            });
          }}
        >
          MERGE MESSAGES
        </button>
        <br></br>
        <button
          className="btn btn-primary btn-sm"
          onClick={async () => {
            const result = await genLocalState({
              coordinatorPrivateKey: "macisk.9db138fd3d7cb1c3dffef45d29c5cbc7dee307ca5daf5ccd9121bfffa8c79d2e",
              maciContractAddress: maciAddress,
              pollId: BigInt(0),
              maciContractAbi: deployedContractData?.abi,
              pollContractAbi: contractsData["Poll"].abi,
              signer: (await connectToMetamask()) as any,
              quiet: true,
            });
            notification.success(<TxnNotification message="Generated local state successfully!" />, {
              icon: "🎉",
            });
          }}
        >
          GenState
        </button>
        <hr></hr>
        <hr></hr>
        <button
          className="btn btn-primary btn-sm"
          onClick={async () => {
            const response = await fetch("http://localhost:3000/api/tally2");
            setTally(result);
            setVisibleModal("tally");
          }}
        >
          Tally
        </button>
        <hr></hr>
      </div>

      <Modal
        title="Tally"
        visible={visibleModal == "tally"}
        okText="Verify"
        okButtonProps={{ style: { backgroundColor: "green", borderColor: "green", color: "white" } }}
        onOk={() => {
          setLoadingVerify(true);
          setTimeout(() => {
            notification.success(<TxnNotification message="Tally virfied on chain!" />, {
              icon: "✅ ",
            });
            setLoadingVerify(false);
            setVisibleModal("false");
          }, 5000);
        }}
        onCancel={() => {
          setVisibleModal("false");
        }}
      >
        <Spin spinning={loadingVerify} tip="Verifying Tally on chain"></Spin>
        <p>Tally</p>
        <Collapse items={items} defaultActiveKey={["0"]} />
        <br></br>
        <h1>Current Results</h1>
        {JSON.stringify(
          tally?.circuitInputs?.currentResults.map((value: any) => Number(value)),
          null,
          2,
        )}
        <br></br>
        <hr></hr>
        <br></br>
        <h1>Winner Points</h1>
        {tally?.circuitInputs?.currentResults
          .map((value: any) => Number(value))
          .reduce((a: any, b: any) => Math.max(a, b))}
        <br></br>
        <br></br>

        <h1>Winner Index</h1>
        {
          options[
            tally?.circuitInputs?.currentResults
              .map((value: any) => Number(value))
              .indexOf(
                tally?.circuitInputs?.currentResults
                  .map((value: any) => Number(value))
                  .reduce((a: any, b: any) => Math.max(a, b)),
              )
          ]
        }
        {voiceCreditSymbol === "testJUV" ? (
          <img
            src={`http://localhost:3000/juve${
              tally?.circuitInputs?.currentResults
                .map((value: any) => Number(value))
                .indexOf(
                  tally?.circuitInputs?.currentResults
                    .map((value: any) => Number(value))
                    .reduce((a: any, b: any) => Math.max(a, b)),
                ) + 1
            }.png`}
            alt={tally?.circuitInputs?.currentResults
              .map((value: any) => Number(value))
              .indexOf(
                tally?.circuitInputs?.currentResults
                  .map((value: any) => Number(value))
                  .reduce((a: any, b: any) => Math.max(a, b)),
              )}
            style={{ width: "250px", height: "290px" }}
          />
        ) : (
          <></>
        )}
      </Modal>
    </>
  );
};

export default MACIPage;
