// Types for the messaging module

export type GroupStatus = "ACTIVE" | "ARCHIVED" | "SUSPENDED";

export interface SessionID {
  walletAddress: string;
  sessionPubKey: string;
  displayName: string;
  avatarIpfs: string;
  createdAt: number;
  lastSeen: number;
  active: boolean;
}

export interface GroupConversation {
  id: string;
  name: string;
  description: string;
  adminAddress: string;
  members: string[];
  encrypted: boolean;
  status: GroupStatus;
  createdAt: number;
}

// Transaction message types
export interface MsgRegisterSession {
  walletAddress: string;
  sessionPubKey: string;
  displayName: string;
  avatarIpfs?: string;
}

export interface MsgRegisterSessionResponse {
  success: boolean;
}

export interface MsgCreateGroup {
  adminAddress: string;
  name: string;
  description: string;
  members: string[];
  encrypted: boolean;
}

export interface MsgCreateGroupResponse {
  groupId: string;
}

export interface MsgAddGroupMember {
  adminAddress: string;
  groupId: string;
  memberAddress: string;
}

export interface MsgAddGroupMemberResponse {
  success: boolean;
}

export interface MsgRemoveGroupMember {
  adminAddress: string;
  groupId: string;
  memberAddress: string;
}

// Query types
export interface QueryGetSessionIDRequest {
  walletAddress: string;
}

export interface QueryGetSessionIDResponse {
  sessionId: SessionID;
}

export interface QueryGetGroupRequest {
  groupId: string;
}

export interface QueryGetGroupResponse {
  group: GroupConversation;
}

export interface QueryListGroupsRequest {
  memberAddress?: string;
}

export interface QueryListGroupsResponse {
  groups: GroupConversation[];
}
