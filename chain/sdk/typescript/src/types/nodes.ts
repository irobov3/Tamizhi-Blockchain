export interface Coin {
  denom: string;
  amount: string;
}

export interface ServiceNode {
  id: string;
  ownerAddress: string;
  endpoint: string;
  stakedAmount: Coin;
  status: "ACTIVE" | "INACTIVE" | "JAILED";
  swarmId: string;
  registeredAt: number;
  lastRewardAt: number;
  messagesStored: number;
  uptimeScore: number;
}

export interface Swarm {
  id: string;
  nodeIds: string[];
}

export interface MsgRegisterNode {
  owner: string;
  nodeId: string;
  endpoint: string;
  stakedAmount: Coin;
}

export interface MsgDeregisterNode {
  owner: string;
  nodeId: string;
}

export interface MsgClaimNodeReward {
  nodeId: string;
  ownerAddress: string;
}

export interface QueryGetNodeResponse {
  node: ServiceNode;
}

export interface QueryListActiveNodesResponse {
  nodes: ServiceNode[];
}

export interface QueryGetSwarmsResponse {
  swarms: Swarm[];
}
