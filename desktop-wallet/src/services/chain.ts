import type { Transaction, Validator, Delegation } from '../types'

const REST = 'https://api.tamizhi.ai'
// Fallback not directly usable as variable but kept for documentation
// const FALLBACK = 'http://localhost:1317'

async function apiFetch(path: string): Promise<any> {
  const res = await fetch(`${REST}${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`)
  return res.json()
}

// ── Balance ──────────────────────────────────────────────────────────────────

export async function fetchBalance(address: string): Promise<string> {
  try {
    const data = await apiFetch(`/cosmos/bank/v1beta1/balances/${address}`)
    const coin = (data?.balances ?? []).find((c: any) => c.denom === 'utmz')
    return coin?.amount ?? '0'
  } catch {
    return '0'
  }
}

// ── Transactions ─────────────────────────────────────────────────────────────

function parseTxType(tx: any, address: string): Transaction['type'] {
  const msgs: any[] = tx?.tx?.body?.messages ?? []
  const t = msgs[0]?.['@type']?.toLowerCase() ?? ''
  if (t.includes('msgsend')) {
    const from = msgs[0]?.from_address ?? ''
    return from === address ? 'send' : 'receive'
  }
  if (t.includes('msgdelegate')) return 'delegate'
  if (t.includes('msgundelegate')) return 'undelegate'
  if (t.includes('msgwithdraw')) return 'claim_rewards'
  return 'unknown'
}

function parseTxAmount(tx: any): string {
  const msgs: any[] = tx?.tx?.body?.messages ?? []
  const msg = msgs[0]
  if (!msg) return '0'
  const amount = msg.amount
  if (Array.isArray(amount) && amount.length > 0) return amount[0]?.amount ?? '0'
  if (amount && typeof amount === 'object') return amount.amount ?? '0'
  return '0'
}

export async function fetchTransactions(address: string): Promise<Transaction[]> {
  const events = [
    `message.sender='${address}'`,
    `transfer.recipient='${address}'`,
  ]
  const all: Transaction[] = []
  const seen = new Set<string>()

  for (const ev of events) {
    try {
      const params = new URLSearchParams({
        events: ev,
        order_by: 'ORDER_BY_DESC',
        'pagination.limit': '50',
      })
      const data = await apiFetch(`/cosmos/tx/v1beta1/txs?${params}`)
      const txResponses: any[] = data?.tx_responses ?? []
      for (const t of txResponses) {
        if (seen.has(t.txhash)) continue
        seen.add(t.txhash)
        const type = parseTxType(t, address)
        all.push({
          hash: t.txhash,
          type,
          amount: parseTxAmount(t),
          denom: 'utmz',
          from: t.tx?.body?.messages?.[0]?.from_address ?? address,
          to: t.tx?.body?.messages?.[0]?.to_address,
          timestamp: new Date(t.timestamp).getTime(),
          height: Number(t.height),
          memo: t.tx?.body?.memo ?? '',
          status: t.code === 0 ? 'success' : 'failed',
        })
      }
    } catch {
      // silently skip this event query
    }
  }

  return all.sort((a, b) => b.height - a.height)
}

// ── Validators ───────────────────────────────────────────────────────────────

export async function fetchValidators(): Promise<Validator[]> {
  try {
    const data = await apiFetch(
      '/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=200'
    )
    return (data?.validators ?? []).map((v: any): Validator => ({
      operatorAddress: v.operator_address,
      moniker: v.description?.moniker ?? 'Unknown',
      commission: v.commission?.commission_rates?.rate ?? '0',
      votingPower: v.tokens ?? '0',
      status: v.status === 'BOND_STATUS_BONDED' ? 'BOND_STATUS_BONDED' : 'BOND_STATUS_UNBONDED',
      uptime: 100,
    }))
  } catch {
    return []
  }
}

// ── Delegations ──────────────────────────────────────────────────────────────

export async function fetchDelegations(address: string): Promise<Delegation[]> {
  try {
    const [delData, rewardsData] = await Promise.all([
      apiFetch(`/cosmos/staking/v1beta1/delegations/${address}`),
      apiFetch(`/cosmos/distribution/v1beta1/delegators/${address}/rewards`).catch(() => null),
    ])

    const rewardsByVal: Record<string, string> = {}
    for (const r of rewardsData?.rewards ?? []) {
      const coin = (r.reward ?? []).find((c: any) => c.denom === 'utmz')
      if (coin) rewardsByVal[r.validator_address] = coin.amount.split('.')[0]
    }

    return (delData?.delegation_responses ?? []).map((d: any): Delegation => ({
      validatorAddress: d.delegation?.validator_address ?? '',
      validatorMoniker: d.delegation?.validator_address?.slice(0, 16) ?? 'Validator',
      amount: d.balance?.amount ?? '0',
      rewards: rewardsByVal[d.delegation?.validator_address ?? ''] ?? '0',
    }))
  } catch {
    return []
  }
}

// ── Rewards ──────────────────────────────────────────────────────────────────

export async function fetchRewards(address: string): Promise<string> {
  try {
    const data = await apiFetch(
      `/cosmos/distribution/v1beta1/delegators/${address}/rewards`
    )
    const total: any[] = data?.total ?? []
    const coin = total.find((c: any) => c.denom === 'utmz')
    return coin ? coin.amount.split('.')[0] : '0'
  } catch {
    return '0'
  }
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatTMZ(utmz: string | number): string {
  const val = typeof utmz === 'string' ? parseFloat(utmz) : utmz
  if (isNaN(val)) return '0'
  const tmz = val / 1_000_000
  // Remove trailing zeros but keep at least 2 decimals
  return tmz.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}

export function truncateAddress(addr: string, chars = 8): string {
  if (!addr) return ''
  if (addr.length <= chars * 2 + 3) return addr
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`
}
