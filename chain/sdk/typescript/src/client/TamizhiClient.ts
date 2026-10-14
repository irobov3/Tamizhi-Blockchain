import {
  SigningStargateClient,
  StargateClient,
  DeliverTxResponse,
  GasPrice,
} from "@cosmjs/stargate";
import { DirectSecp256k1HdWallet, OfflineSigner } from "@cosmjs/proto-signing";
import { RewardRule, RewardRecord } from "../types/rewards";
import { ServiceNode, Swarm } from "../types/nodes";

export interface TamizhiClientConfig {
  rpcEndpoint: string;
  restEndpoint: string;
  chainId: string;
  gasPrice?: GasPrice;
}

/**
 * Read-only query client for the Tamizhi blockchain.
 * Uses the REST API for queries.
 */
export class TamizhiQueryClient {
  private readonly restEndpoint: string;

  constructor(config: TamizhiClientConfig) {
    this.restEndpoint = config.restEndpoint.replace(/\/$/, "");
  }

  private async get<T>(path: string): Promise<T> {
    const url = `${this.restEndpoint}${path}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    return response.json() as Promise<T>;
  }

  // -- Rewards ---------------------------------------------------------------
  async listRewardRules(): Promise<RewardRule[]> {
    const data = await this.get<{ rules: RewardRule[] }>(
      "/tamizhi/rewards/v1/rules"
    );
    return data.rules ?? [];
  }

  async getRewardRule(ruleId: string): Promise<RewardRule> {
    const data = await this.get<{ rule: RewardRule }>(
      `/tamizhi/rewards/v1/rules/${ruleId}`
    );
    return data.rule;
  }

  async getRewardRecords(employeeId: string): Promise<RewardRecord[]> {
    const data = await this.get<{ records: RewardRecord[] }>(
      `/tamizhi/rewards/v1/records/${employeeId}`
    );
    return data.records ?? [];
  }

  // -- Nodes -----------------------------------------------------------------
  async getNode(nodeId: string): Promise<ServiceNode> {
    const data = await this.get<{ node: ServiceNode }>(
      `/tamizhi/nodes/v1/nodes/${nodeId}`
    );
    return data.node;
  }

  async listActiveNodes(): Promise<ServiceNode[]> {
    const data = await this.get<{ nodes: ServiceNode[] }>(
      "/tamizhi/nodes/v1/nodes"
    );
    return data.nodes ?? [];
  }

  async getSwarms(): Promise<Swarm[]> {
    const data = await this.get<{ swarms: Swarm[] }>(
      "/tamizhi/nodes/v1/swarms"
    );
    return data.swarms ?? [];
  }

  // -- Security --------------------------------------------------------------
  async isBlocked(address: string): Promise<{ blocked: boolean; reason: string }> {
    return this.get(`/tamizhi/security/v1/blocked/${address}`);
  }

  async listActiveThreatFlags(): Promise<unknown[]> {
    const data = await this.get<{ flags: unknown[] }>(
      "/tamizhi/security/v1/threats/active"
    );
    return data.flags ?? [];
  }

  // -- Messaging -------------------------------------------------------------
  async getSessionID(walletAddress: string): Promise<unknown> {
    const data = await this.get<{ session_id: unknown }>(
      `/tamizhi/messaging/v1/sessions/${walletAddress}`
    );
    return data.session_id;
  }

  async getGroup(groupId: string): Promise<unknown> {
    const data = await this.get<{ group: unknown }>(
      `/tamizhi/messaging/v1/groups/${groupId}`
    );
    return data.group;
  }
}

/**
 * Signing client for broadcasting transactions to the Tamizhi blockchain.
 */
export class TamizhiSigningClient {
  private readonly client: SigningStargateClient;
  private readonly signer: OfflineSigner;
  private readonly chainId: string;

  private constructor(
    client: SigningStargateClient,
    signer: OfflineSigner,
    chainId: string
  ) {
    this.client = client;
    this.signer = signer;
    this.chainId = chainId;
  }

  static async connect(
    config: TamizhiClientConfig,
    signer: OfflineSigner
  ): Promise<TamizhiSigningClient> {
    const gasPrice = config.gasPrice ?? GasPrice.fromString("1000utmz");
    const client = await SigningStargateClient.connectWithSigner(
      config.rpcEndpoint,
      signer,
      { gasPrice }
    );
    return new TamizhiSigningClient(client, signer, config.chainId);
  }

  /**
   * Create a wallet from a mnemonic.
   */
  static async walletFromMnemonic(mnemonic: string): Promise<DirectSecp256k1HdWallet> {
    return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: "tamizhi",
    });
  }

  /**
   * Issue a reward to an employee.
   * Note: Uses a custom message type. The typeUrl must match the proto registration.
   */
  async issueReward(
    authority: string,
    employeeId: string,
    ruleId: string,
    memo: string,
    fee: { amount: Array<{ denom: string; amount: string }>; gas: string }
  ): Promise<DeliverTxResponse> {
    const msg = {
      typeUrl: "/tamizhi.rewards.v1.MsgIssueReward",
      value: {
        authority,
        employeeId,
        ruleId,
        memo,
      },
    };
    return this.client.signAndBroadcast(authority, [msg], fee, memo);
  }

  /**
   * Register a service node.
   */
  async registerNode(
    owner: string,
    nodeId: string,
    endpoint: string,
    stakedAmount: { denom: string; amount: string },
    fee: { amount: Array<{ denom: string; amount: string }>; gas: string }
  ): Promise<DeliverTxResponse> {
    const msg = {
      typeUrl: "/tamizhi.nodes.v1.MsgRegisterNode",
      value: { owner, nodeId, endpoint, stakedAmount },
    };
    return this.client.signAndBroadcast(owner, [msg], fee);
  }

  /**
   * Log a file access event.
   */
  async logAccess(
    employeeId: string,
    address: string,
    fileHash: string,
    fileName: string,
    action: string,
    ipfsCid: string,
    fee: { amount: Array<{ denom: string; amount: string }>; gas: string }
  ): Promise<DeliverTxResponse> {
    const msg = {
      typeUrl: "/tamizhi.accesslog.v1.MsgLogAccess",
      value: { employeeId, address, fileHash, fileName, action, ipfsCid },
    };
    return this.client.signAndBroadcast(address, [msg], fee);
  }

  /**
   * Raise a security threat flag.
   */
  async raiseThreatFlag(
    authority: string,
    employeeId: string,
    address: string,
    threatType: string,
    level: string,
    description: string,
    fee: { amount: Array<{ denom: string; amount: string }>; gas: string }
  ): Promise<DeliverTxResponse> {
    const msg = {
      typeUrl: "/tamizhi.security.v1.MsgRaiseThreatFlag",
      value: { authority, employeeId, address, threatType, level, description },
    };
    return this.client.signAndBroadcast(authority, [msg], fee);
  }

  /**
   * Register a messaging session identity.
   */
  async registerSession(
    walletAddress: string,
    sessionPubKey: string,
    displayName: string,
    fee: { amount: Array<{ denom: string; amount: string }>; gas: string }
  ): Promise<DeliverTxResponse> {
    const msg = {
      typeUrl: "/tamizhi.messaging.v1.MsgRegisterSession",
      value: { walletAddress, sessionPubKey, displayName },
    };
    return this.client.signAndBroadcast(walletAddress, [msg], fee);
  }

  getStargateClient(): SigningStargateClient {
    return this.client;
  }
}
