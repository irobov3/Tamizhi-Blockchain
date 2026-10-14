import { SigningStargateClient } from "@cosmjs/stargate";
import type { OfflineSigner } from "@cosmjs/proto-signing";

export const DEFAULT_RPC = "http://localhost:26657";
export const DEFAULT_CHAIN_ID = "tamizhi-1";

export async function connectSigning(
  rpc: string,
  signer: OfflineSigner,
): Promise<SigningStargateClient> {
  return SigningStargateClient.connectWithSigner(rpc, signer);
}
