import {
  SigningStargateClient,
  GasPrice,
  StdFee,
  DeliverTxResponse,
  defaultRegistryTypes,
} from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { stringToPath } from '@cosmjs/crypto';
import { MsgDelegate } from 'cosmjs-types/cosmos/staking/v1beta1/tx';
import { MsgWithdrawDelegatorReward } from 'cosmjs-types/cosmos/distribution/v1beta1/tx';

const BECH32_PREFIX = 'tamizhi';
const DEFAULT_HD_PATH = "m/44'/118'/0'/0/0";
const DEFAULT_GAS_PRICE = GasPrice.fromString('0.025utmz');

/** Build a SigningStargateClient connected to the given RPC, using mnemonic. */
export async function getSigningClient(
  rpcUrl: string,
  mnemonic: string,
): Promise<{ client: SigningStargateClient; address: string }> {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: BECH32_PREFIX,
    hdPaths: [stringToPath(DEFAULT_HD_PATH)],
  });
  const [account] = await wallet.getAccounts();
  const client = await SigningStargateClient.connectWithSigner(rpcUrl, wallet, {
    gasPrice: DEFAULT_GAS_PRICE,
  });
  return { client, address: account.address };
}

function autoFee(gas: number = 200_000): StdFee {
  // amount = gas * gasPrice (rounded up); 200_000 * 0.025 = 5000 utmz
  const amount = Math.ceil(gas * 0.025);
  return {
    amount: [{ denom: 'utmz', amount: amount.toString() }],
    gas: gas.toString(),
  };
}

/** Send TMZ tokens. Amount is in utmz (integer string). */
export async function sendTokens(
  client: SigningStargateClient,
  fromAddr: string,
  toAddr: string,
  amount: string,
  denom: string = 'utmz',
  memo: string = '',
): Promise<DeliverTxResponse> {
  return await client.sendTokens(
    fromAddr,
    toAddr,
    [{ denom, amount }],
    autoFee(200_000),
    memo,
  );
}

/** Delegate to a validator. Amount is in utmz. */
export async function delegate(
  client: SigningStargateClient,
  delegator: string,
  validator: string,
  amount: string,
  denom: string = 'utmz',
  memo: string = '',
): Promise<DeliverTxResponse> {
  const msg = {
    typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
    value: MsgDelegate.fromPartial({
      delegatorAddress: delegator,
      validatorAddress: validator,
      amount: { denom, amount },
    }),
  };
  return await client.signAndBroadcast(delegator, [msg], autoFee(250_000), memo);
}

/** Withdraw rewards from a validator. */
export async function claimRewards(
  client: SigningStargateClient,
  delegator: string,
  validator: string,
  memo: string = '',
): Promise<DeliverTxResponse> {
  const msg = {
    typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
    value: MsgWithdrawDelegatorReward.fromPartial({
      delegatorAddress: delegator,
      validatorAddress: validator,
    }),
  };
  return await client.signAndBroadcast(delegator, [msg], autoFee(200_000), memo);
}

/** Claim rewards from many validators in a single tx. */
export async function claimAllRewards(
  client: SigningStargateClient,
  delegator: string,
  validators: string[],
  memo: string = '',
): Promise<DeliverTxResponse> {
  const msgs = validators.map((v) => ({
    typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
    value: MsgWithdrawDelegatorReward.fromPartial({
      delegatorAddress: delegator,
      validatorAddress: v,
    }),
  }));
  const gas = 150_000 + 50_000 * validators.length;
  return await client.signAndBroadcast(delegator, msgs, autoFee(gas), memo);
}

export { defaultRegistryTypes };
