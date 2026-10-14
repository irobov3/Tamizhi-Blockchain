import { SigningStargateClient, GasPrice, MsgWithdrawDelegatorRewardEncodeObject } from "@cosmjs/stargate";
import type { OfflineDirectSigner } from "@cosmjs/proto-signing";
import type { NetworkConfig } from "../store/network";

export async function connectSigning(
  net: NetworkConfig,
  signer: OfflineDirectSigner
): Promise<SigningStargateClient> {
  return SigningStargateClient.connectWithSigner(net.rpc, signer, {
    gasPrice: GasPrice.fromString(`0.025${net.denom}`),
  });
}

export async function sendTokens(
  client: SigningStargateClient,
  from: string,
  to: string,
  amount: string,
  denom: string,
  memo = ""
) {
  return client.sendTokens(
    from,
    to,
    [{ denom, amount }],
    "auto",
    memo
  );
}

export async function delegate(
  client: SigningStargateClient,
  delegator: string,
  validator: string,
  amount: string,
  denom: string
) {
  return client.delegateTokens(delegator, validator, { denom, amount }, "auto");
}

export async function undelegate(
  client: SigningStargateClient,
  delegator: string,
  validator: string,
  amount: string,
  denom: string
) {
  return client.undelegateTokens(delegator, validator, { denom, amount }, "auto");
}

export async function withdrawRewards(
  client: SigningStargateClient,
  delegator: string,
  validators: string[]
) {
  if (validators.length === 0) {
    throw new Error("No validators to claim from");
  }
  const msgs: MsgWithdrawDelegatorRewardEncodeObject[] = validators.map((v) => ({
    typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
    value: { delegatorAddress: delegator, validatorAddress: v },
  }));
  return client.signAndBroadcast(delegator, msgs, "auto");
}
