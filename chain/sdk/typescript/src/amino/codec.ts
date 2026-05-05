// Amino codec registration for Keplr/Leap wallet support.
// These map the proto typeUrls to Amino type names.

import { AminoMsg } from "@cosmjs/amino";

export interface AminoMsgIssueReward extends AminoMsg {
  readonly type: "tamizhi/MsgIssueReward";
  readonly value: {
    authority: string;
    employee_id: string;
    rule_id: string;
    memo: string;
  };
}

export interface AminoMsgRegisterNode extends AminoMsg {
  readonly type: "tamizhi/MsgRegisterNode";
  readonly value: {
    owner: string;
    node_id: string;
    endpoint: string;
    staked_amount: { denom: string; amount: string };
  };
}

// Amino codec map: proto typeUrl -> Amino type + converter
export const tamizhiAminoTypes = {
  "/tamizhi.rewards.v1.MsgIssueReward": {
    aminoType: "tamizhi/MsgIssueReward",
    toAmino: (value: { authority: string; employeeId: string; ruleId: string; memo: string }) => ({
      authority: value.authority,
      employee_id: value.employeeId,
      rule_id: value.ruleId,
      memo: value.memo,
    }),
    fromAmino: (value: { authority: string; employee_id: string; rule_id: string; memo: string }) => ({
      authority: value.authority,
      employeeId: value.employee_id,
      ruleId: value.rule_id,
      memo: value.memo,
    }),
  },
  "/tamizhi.rewards.v1.MsgCreateRewardRule": {
    aminoType: "tamizhi/MsgCreateRewardRule",
    toAmino: (value: unknown) => value,
    fromAmino: (value: unknown) => value,
  },
  "/tamizhi.nodes.v1.MsgRegisterNode": {
    aminoType: "tamizhi/MsgRegisterNode",
    toAmino: (value: { owner: string; nodeId: string; endpoint: string; stakedAmount: { denom: string; amount: string } }) => ({
      owner: value.owner,
      node_id: value.nodeId,
      endpoint: value.endpoint,
      staked_amount: value.stakedAmount,
    }),
    fromAmino: (value: { owner: string; node_id: string; endpoint: string; staked_amount: { denom: string; amount: string } }) => ({
      owner: value.owner,
      nodeId: value.node_id,
      endpoint: value.endpoint,
      stakedAmount: value.staked_amount,
    }),
  },
  "/tamizhi.accesslog.v1.MsgLogAccess": {
    aminoType: "tamizhi/MsgLogAccess",
    toAmino: (value: unknown) => value,
    fromAmino: (value: unknown) => value,
  },
  "/tamizhi.security.v1.MsgRaiseThreatFlag": {
    aminoType: "tamizhi/MsgRaiseThreatFlag",
    toAmino: (value: unknown) => value,
    fromAmino: (value: unknown) => value,
  },
  "/tamizhi.messaging.v1.MsgRegisterSession": {
    aminoType: "tamizhi/MsgRegisterSession",
    toAmino: (value: unknown) => value,
    fromAmino: (value: unknown) => value,
  },
} as const;
