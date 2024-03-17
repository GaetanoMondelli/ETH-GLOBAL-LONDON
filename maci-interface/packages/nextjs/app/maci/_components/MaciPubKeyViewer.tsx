"use client";

import { BigNumber } from "@ethersproject/bignumber";
import { Avatar, Tag, Tooltip } from "antd";
import { Keypair, PrivKey, PubKey } from "maci-domainobjs";

export const r = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");

export function MaciPubKeyViewer({ address }: { address: string }) {
  return (
    <div>
      {/* https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=mkci */}
      <Avatar 
        // style={{ border: "1px solid #000000", backgroundColor: "white"}}
      // size={64} src={`https://robohash.org/${address}`}></Avatar>
      size={64} src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${address}`}></Avatar>

      <p>
        <Tooltip title={address}>
          <Tag color="blue">{address.slice(7, 11).concat("...").concat(address.slice(-4))}</Tag>
        </Tooltip>
      </p>
    </div>
  );
}
