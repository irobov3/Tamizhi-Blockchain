import { create } from 'zustand'
import type { Transaction, Validator, Delegation } from './types'

// ── Demo seed data ────────────────────────────────────────────────────────────

const DEMO_ADDRESS = 'tamizhi1demo9xk2j5p4q6r7s8t0u1v2w3x4y5z6a7'
const DEMO_MNEMONIC = 'word word word word word word word word word word word word'

const now = Date.now()
const day = 86_400_000

const DEMO_TRANSACTIONS: Transaction[] = [
  {
    hash: 'A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2',
    type: 'receive',
    amount: '10000000',
    denom: 'utmz',
    from: 'tamizhi1faucet000000000000000000000000000000',
    to: DEMO_ADDRESS,
    timestamp: now - 1 * day,
    height: 12480,
    memo: 'faucet drop',
    status: 'success',
  },
  {
    hash: 'B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3',
    type: 'send',
    amount: '2000000',
    denom: 'utmz',
    from: DEMO_ADDRESS,
    to: 'tamizhi1recipient0000000000000000000000000000',
    timestamp: now - 2 * day,
    height: 12200,
    memo: 'payment',
    status: 'success',
  },
  {
    hash: 'C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4',
    type: 'delegate',
    amount: '5000000',
    denom: 'utmz',
    from: DEMO_ADDRESS,
    timestamp: now - 3 * day,
    height: 11900,
    memo: '',
    status: 'success',
  },
  {
    hash: 'D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5',
    type: 'receive',
    amount: '3500000',
    denom: 'utmz',
    from: 'tamizhi1alice000000000000000000000000000000000',
    to: DEMO_ADDRESS,
    timestamp: now - 4 * day,
    height: 11600,
    memo: 'hello',
    status: 'success',
  },
  {
    hash: 'E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6',
    type: 'claim_rewards',
    amount: '125000',
    denom: 'utmz',
    from: DEMO_ADDRESS,
    timestamp: now - 5 * day,
    height: 11300,
    memo: '',
    status: 'success',
  },
  {
    hash: 'F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1',
    type: 'send',
    amount: '1000000',
    denom: 'utmz',
    from: DEMO_ADDRESS,
    to: 'tamizhi1bob0000000000000000000000000000000000',
    timestamp: now - 6 * day,
    height: 11000,
    memo: 'test tx',
    status: 'failed',
  },
  {
    hash: 'A2B3C4D5E6F7A2B3C4D5E6F7A2B3C4D5E6F7A2B3C4D5E6F7A2B3C4D5E6F7A2B3',
    type: 'delegate',
    amount: '8000000',
    denom: 'utmz',
    from: DEMO_ADDRESS,
    timestamp: now - 7 * day,
    height: 10700,
    memo: '',
    status: 'success',
  },
  {
    hash: 'B3C4D5E6F7A2B3C4D5E6F7A2B3C4D5E6F7A2B3C4D5E6F7A2B3C4D5E6F7A2B3C4',
    type: 'undelegate',
    amount: '2000000',
    denom: 'utmz',
    from: DEMO_ADDRESS,
    timestamp: now - 8 * day,
    height: 10400,
    memo: '',
    status: 'success',
  },
]

const DEMO_VALIDATORS: Validator[] = [
  {
    operatorAddress: 'tamilvaloper1aaa000000000000000000000000000000000000',
    moniker: 'TamilNode',
    commission: '0.05',
    votingPower: '12500000000',
    status: 'BOND_STATUS_BONDED',
    uptime: 99.8,
  },
  {
    operatorAddress: 'tamilvaloper1bbb000000000000000000000000000000000000',
    moniker: 'SangamStake',
    commission: '0.08',
    votingPower: '9800000000',
    status: 'BOND_STATUS_BONDED',
    uptime: 99.5,
  },
  {
    operatorAddress: 'tamilvaloper1ccc000000000000000000000000000000000000',
    moniker: 'KuralValidator',
    commission: '0.03',
    votingPower: '7200000000',
    status: 'BOND_STATUS_BONDED',
    uptime: 100.0,
  },
  {
    operatorAddress: 'tamilvaloper1ddd000000000000000000000000000000000000',
    moniker: 'ChennaiHub',
    commission: '0.10',
    votingPower: '4500000000',
    status: 'BOND_STATUS_BONDED',
    uptime: 98.2,
  },
  {
    operatorAddress: 'tamilvaloper1eee000000000000000000000000000000000000',
    moniker: 'ThirukkuralNodes',
    commission: '0.06',
    votingPower: '3100000000',
    status: 'BOND_STATUS_BONDED',
    uptime: 99.1,
  },
]

const DEMO_DELEGATIONS: Delegation[] = [
  {
    validatorAddress: 'tamilvaloper1aaa000000000000000000000000000000000000',
    validatorMoniker: 'TamilNode',
    amount: '5000000',
    rewards: '87500',
  },
  {
    validatorAddress: 'tamilvaloper1ccc000000000000000000000000000000000000',
    validatorMoniker: 'KuralValidator',
    amount: '8000000',
    rewards: '112000',
  },
]

// ── Store interface ───────────────────────────────────────────────────────────

type PageId = 'dashboard' | 'send' | 'receive' | 'staking' | 'history' | 'literature' | 'settings'

interface WalletStore {
  // Wallet state
  address: string
  mnemonic: string
  balance: string        // in utmz
  isUnlocked: boolean

  // Data
  transactions: Transaction[]
  validators: Validator[]
  delegations: Delegation[]
  totalRewards: string

  // UI state
  activePage: PageId
  isLoading: boolean

  // Actions
  setAddress: (a: string) => void
  setBalance: (b: string) => void
  setUnlocked: (u: boolean) => void
  setActivePage: (p: string) => void
  setTransactions: (txs: Transaction[]) => void
  setValidators: (vs: Validator[]) => void
  setDelegations: (ds: Delegation[]) => void
  setLoading: (b: boolean) => void
}

export const useDemoStore = create<WalletStore>((set) => ({
  // Wallet state
  address: DEMO_ADDRESS,
  mnemonic: DEMO_MNEMONIC,
  balance: '42500000',   // 42.5 TMZ
  isUnlocked: true,

  // Data
  transactions: DEMO_TRANSACTIONS,
  validators: DEMO_VALIDATORS,
  delegations: DEMO_DELEGATIONS,
  totalRewards: '199500', // total of both delegation rewards

  // UI state
  activePage: 'dashboard',
  isLoading: false,

  // Actions
  setAddress: (address) => set({ address }),
  setBalance: (balance) => set({ balance }),
  setUnlocked: (isUnlocked) => set({ isUnlocked }),
  setActivePage: (p) => set({ activePage: p as PageId }),
  setTransactions: (transactions) => set({ transactions }),
  setValidators: (validators) => set({ validators }),
  setDelegations: (delegations) => set({ delegations }),
  setLoading: (isLoading) => set({ isLoading }),
}))
