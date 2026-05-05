// Types for the security module

export type ThreatLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ThreatAction = "ALERT" | "WARN" | "BLOCK" | "REVOKE";

export interface ThreatFlag {
  id: number;
  employeeId: string;
  address: string;
  threatType: string;
  level: ThreatLevel;
  description: string;
  action: ThreatAction;
  source: string;
  resolved: boolean;
  resolution: string;
  createdAt: number;
  resolvedAt: number;
  blockHeight: number;
}

export interface SecurityEvent {
  id: number;
  eventType: string;
  address: string;
  details: string;
  severity: ThreatLevel;
  timestamp: number;
  blockHeight: number;
  txHash: string;
}

// Transaction message types
export interface MsgRaiseThreatFlag {
  authority: string;
  employeeId: string;
  address: string;
  threatType: string;
  level: ThreatLevel;
  description: string;
  action?: ThreatAction;
  source?: string;
}

export interface MsgRaiseThreatFlagResponse {
  flagId: number;
}

export interface MsgResolveThreatFlag {
  authority: string;
  flagId: number;
  resolution: string;
}

export interface MsgResolveThreatFlagResponse {
  success: boolean;
}

// Query types
export interface QueryListActiveThreatFlagsResponse {
  flags: ThreatFlag[];
}

export interface QueryIsBlockedRequest {
  address: string;
}

export interface QueryIsBlockedResponse {
  blocked: boolean;
  reason: string;
}

export interface QueryGetThreatFlagRequest {
  flagId: number;
}

export interface QueryGetThreatFlagResponse {
  flag: ThreatFlag;
}
