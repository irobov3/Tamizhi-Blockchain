export interface Token {
  denom: string
  amount: string
  displayAmount: string  // human readable (divide by 1_000_000)
  symbol: string         // "TMZ"
}

export interface Transaction {
  hash: string
  type: 'send' | 'receive' | 'delegate' | 'undelegate' | 'claim_rewards' | 'unknown'
  amount: string
  denom: string
  from: string
  to?: string
  timestamp: number
  height: number
  memo: string
  status: 'success' | 'failed'
}

export interface Validator {
  operatorAddress: string
  moniker: string
  commission: string
  votingPower: string
  status: 'BOND_STATUS_BONDED' | 'BOND_STATUS_UNBONDED'
  uptime: number
}

export interface Delegation {
  validatorAddress: string
  validatorMoniker: string
  amount: string
  rewards: string
}
