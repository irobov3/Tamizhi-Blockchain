// Types for the accesslog module

export interface AccessLogEntry {
  id: number;
  employeeId: string;
  fileHash: string;
  fileName: string;
  action: string;
  ipfsCid: string;
  timestamp: number;
  blockHeight: number;
  txHash: string;
}

// Transaction message types
export interface MsgLogAccess {
  employeeId: string;
  address: string;
  fileHash: string;
  fileName: string;
  action: string;
  ipfsCid: string;
}

export interface MsgLogAccessResponse {
  id: number;
}

// Query types
export interface QueryGetLogRequest {
  id: number;
}

export interface QueryGetLogResponse {
  entry: AccessLogEntry;
}

export interface QueryGetLogsByEmployeeRequest {
  employeeId: string;
}

export interface QueryGetLogsByEmployeeResponse {
  entries: AccessLogEntry[];
}
