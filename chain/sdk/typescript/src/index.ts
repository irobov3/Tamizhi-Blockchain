// Types — Coin is re-exported once from rewards; nodes re-exports without Coin.
export * from "./types/rewards";
export type {
  ServiceNode,
  Swarm,
  MsgRegisterNode,
  MsgDeregisterNode,
  MsgClaimNodeReward,
  QueryGetNodeResponse,
  QueryListActiveNodesResponse,
  QueryGetSwarmsResponse,
} from "./types/nodes";
export * from "./types/accesslog";
export * from "./types/security";
export * from "./types/messaging";

// Clients
export { TamizhiQueryClient, TamizhiSigningClient } from "./client/TamizhiClient";
export type { TamizhiClientConfig } from "./client/TamizhiClient";
export { TamizhiGrpcWebClient } from "./grpc-web/TamizhiGrpcClient";

// Constants
export const TAMIZHI_DENOM = "utmz";
export const TAMIZHI_DISPLAY_DENOM = "TMZ";
export const TAMIZHI_EXPONENT = 6; // 1 TMZ = 1,000,000 utmz
export const DEFAULT_GAS_PRICE = "1000utmz";

// Message type URLs
export const MSG_TYPE_URLS = {
  IssueReward: "/tamizhi.rewards.v1.MsgIssueReward",
  CreateRewardRule: "/tamizhi.rewards.v1.MsgCreateRewardRule",
  UpdateRewardRule: "/tamizhi.rewards.v1.MsgUpdateRewardRule",
  RegisterNode: "/tamizhi.nodes.v1.MsgRegisterNode",
  DeregisterNode: "/tamizhi.nodes.v1.MsgDeregisterNode",
  ClaimNodeReward: "/tamizhi.nodes.v1.MsgClaimNodeReward",
  LogAccess: "/tamizhi.accesslog.v1.MsgLogAccess",
  RaiseThreatFlag: "/tamizhi.security.v1.MsgRaiseThreatFlag",
  ResolveThreatFlag: "/tamizhi.security.v1.MsgResolveThreatFlag",
  RegisterSession: "/tamizhi.messaging.v1.MsgRegisterSession",
  CreateGroup: "/tamizhi.messaging.v1.MsgCreateGroup",
} as const;
