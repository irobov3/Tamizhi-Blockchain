// Types for the rewards module
export interface Coin {
  denom: string;
  amount: string;
}

export interface RewardRule {
  id: string;
  activity: string;
  amount: Coin;
  description: string;
  active: boolean;
  maxPerDay: number;
}

export interface RewardRecord {
  id: number;
  employeeId: string;
  address: string;
  ruleId: string;
  activity: string;
  amount: Coin;
  memo: string;
  timestamp: number;
  blockHeight: number;
}

// Transaction message types
export interface MsgIssueReward {
  authority: string;
  employeeId: string;
  ruleId: string;
  memo: string;
}

export interface MsgIssueRewardResponse {
  recordId: number;
}

export interface MsgCreateRewardRule {
  authority: string;
  rule: RewardRule;
}

export interface MsgUpdateRewardRule {
  authority: string;
  rule: RewardRule;
}

// Query types
export interface QueryListRewardRulesResponse {
  rules: RewardRule[];
}

export interface QueryGetRewardRecordsResponse {
  records: RewardRecord[];
}
