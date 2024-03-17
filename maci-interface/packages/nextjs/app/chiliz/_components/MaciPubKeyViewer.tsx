"use client";

import { BigNumber } from "@ethersproject/bignumber";
import { Avatar, Tag, Tooltip } from "antd";
import { Keypair, PrivKey, PubKey } from "maci-domainobjs";

export const r = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");

export function MaciPubKeyViewer({ address }: { address: string }) {
  return (
    <div
    // center horizontally
    >
      <Avatar
        // style={{ border: "1px solid #000000", backgroundColor: "white"}}
        // margin rught 10px
        style={{ marginLeft: "20px", marginBottom: "5px"}}
        size={64}
        src={`https://robohash.org/${address}`}
      ></Avatar>
      <div
        style={{ display: "flex", justifyContent: "center", alignItems: "center" }}

      >
        <Tooltip title={address}>
          <Tag color="blue">{address.slice(7, 13).concat("...").concat(address.slice(-4))}</Tag>
          <br></br>
          {localStorage.getItem("stateIndex") ? (
            <Tag color="green">State Index: {localStorage.getItem("stateIndex")}</Tag>
          ) : (
            <Tag color="red">NotRegistered</Tag>
          )}
        </Tooltip>
      </div>
    </div>
  );
}
