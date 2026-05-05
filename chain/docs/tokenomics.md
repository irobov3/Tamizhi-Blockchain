# Tamizhi Token (TMZ) — Tokenomics

## 1. TMZ Token

| Property | Value |
|----------|-------|
| Name | Tamizhi Token |
| Symbol | TMZ |
| Base denom (on-chain) | `utmz` (micro-TMZ) |
| Decimals | 6 (1 TMZ = 1,000,000 utmz) |
| Total supply | 1,000,000,000 TMZ (1 billion) |
| Total supply (utmz) | 1,000,000,000,000,000 utmz |
| Chain ID | tamizhi-1 |
| Genesis time | 2026-06-01T00:00:00Z |

TMZ is the native staking and fee token of the Tamizhi blockchain. It serves three roles:

1. **Security** — validators bond TMZ to participate in consensus. Slashing destroys bonded TMZ for misbehaviour.
2. **Fees** — all transactions are priced in `utmz`. A portion of fees is permanently burned.
3. **Governance** — bonded TMZ holders vote on parameter changes and treasury disbursements.

---

## 2. Token Distribution

| Allocation | % | Amount (TMZ) | Vesting / Lock |
|-----------|---|-------------|----------------|
| Community Treasury | 40% | 400,000,000 | No lock. Held in DAO module account; disbursed by governance proposals. |
| Ecosystem & Grants | 25% | 250,000,000 | No lock. Disbursed by multisig grant committee to builders, integrators, and cultural partners. |
| Team | 20% | 200,000,000 | 4-year linear vesting with 1-year cliff. `ContinuousVestingAccount` in genesis, cliff enforced by `DelayedVestingAccount` wrapper. |
| Validators / Staking Rewards | 10% | 100,000,000 | No lock. Seeded into the staking rewards pool at genesis; distributed over time via block rewards. |
| Advisors | 5% | 50,000,000 | 2-year linear vesting. `ContinuousVestingAccount` in genesis with start = genesis time + 0 (no cliff). |
| **Total** | **100%** | **1,000,000,000** | |

### Vesting Schedule Detail

**Team (200M TMZ)**
- Cliff: 12 months from genesis (tokens locked until 2027-06-01)
- After cliff: linear release over remaining 36 months
- End of vesting: 2030-06-01
- Account type: `ContinuousVestingAccount` with `start_time = genesis + 1yr`

**Advisors (50M TMZ)**
- No cliff
- Linear release over 24 months from genesis
- End of vesting: 2028-06-01
- Account type: `ContinuousVestingAccount`

Vested tokens remain staked-eligible. Unvested tokens cannot be transferred but can be delegated.

---

## 3. Fee Model

### Minimum Fee

Every transaction must include at least **1,000 utmz** (0.001 TMZ) in fees. Nodes reject transactions below this threshold via `minimum-gas-prices` configuration.

### Fee Split

| Destination | Share | Description |
|-------------|-------|-------------|
| Burned (permanent) | 20% | Removed from supply by `FeeBurnDecorator` in the ante handler. |
| Validators | ~72% | Distributed to validators proportional to their voting power via the `distribution` module. |
| Community Pool | ~8% | Retained in the community pool (configurable via `distribution.community_tax`). |

The exact validator / community pool split follows the standard Cosmos SDK `distribution` module logic based on the `community_tax` governance parameter (default 8%).

### Deflationary Pressure

At steady-state usage (estimated 100,000 transactions/day at minimum fee):

```
Daily fees collected: 100,000 × 1,000 utmz = 100,000,000 utmz = 100 TMZ
Daily burn:          100 TMZ × 20% = 20 TMZ
Annual burn:         ~7,300 TMZ
```

Higher transaction volume and premium fees (e.g. CosmWasm contract calls) will accelerate the burn rate. This creates long-run deflationary pressure offsetting inflationary staking rewards.

### Fee Governance

The `burn_rate` parameter (`feeburn.burn_rate`) is controlled by on-chain governance. Changing it requires a `MsgUpdateParams` governance proposal with a 7-day voting period and > 2/3 quorum.

---

## 4. Staking & Node Operator Rewards

### Minimum Self-Delegation

Node operators must bond a minimum of **15,000 TMZ** (15,000,000,000 utmz) to their validator. Falling below this threshold after slashing triggers automatic jailing.

### Reward Formula

Node operators earn staking rewards each epoch (configurable, default 100 blocks) based on:

```
EpochReward = UptimeScore × MessagesStored × RewardRate
```

Where:
- `UptimeScore`: integer 0–100, updated by the `nodes` module each block based on signing participation.
- `MessagesStored`: cumulative messages indexed and served by the node in the epoch.
- `RewardRate`: governance parameter (`nodes.reward_rate`), denominated in `utmz` per point.

### Jailing Conditions

| Condition | Penalty | Jail |
|-----------|---------|------|
| `UptimeScore < 20` for 3 consecutive epochs | 1% slash (0.5% burned, 0.5% community pool) | Yes |
| Double-sign evidence submitted | 5% slash (all burned) | Yes, tombstoned |
| Missed > 50% of blocks in signed_blocks_window | 0.1% slash | Yes |

Jailed validators must submit `MsgUnjail` after correcting the issue. Tombstoned validators cannot be unjailed.

### Unbonding Period

14 days. During unbonding, tokens are subject to slashing but earn no rewards.

---

## 5. On-Chain Milestone Rewards (Employee/Contributor Incentives)

The `rewards` module supports configurable milestone-based reward rules. These are intended for contributor incentives and are separate from validator staking rewards.

### How It Works

1. An admin (multisig or governance) creates a `RewardRule` via `MsgCreateRewardRule`:
   - `milestone`: description of the achievement (e.g. "100 literary works submitted")
   - `reward_amount`: amount in `utmz`
   - `eligible_roles`: list of identity roles that can claim
   - `expires_at`: block height after which the rule expires

2. An eligible user claims the reward via `MsgClaimReward{rule_id}`.

3. The `rewards` module:
   - Checks eligibility (role, not already claimed, not expired).
   - Transfers `reward_amount` from the rewards escrow contract to the claimant.
   - Records the claim to prevent double-claiming.

4. Double-claim prevention is enforced both in the keeper (on-chain record) and in the CosmWasm rewards escrow contract (contract-level guard).

### Rewards Escrow Contract

The `contracts/rewards` CosmWasm contract holds the reward pool funds. It can only release funds when called by the `rewards` module keeper (authenticated by the chain's native → contract interface). This prevents direct contract manipulation.

---

## 6. Governance

### Emergency Parameters (3-of-5 Multisig)

The following parameters can be changed by the 3-of-5 multisig admin without a full governance vote, subject to a 48-hour timelock:

- `security.blocklist` additions/removals
- `security.rate_limit` per-address quotas
- `nodes.jail_threshold` (UptimeScore floor)
- `feeburn.burn_rate` (within ±5% of current value)

All multisig actions are recorded on-chain and subject to community veto within the timelock window.

### On-Chain Governance (Major Changes)

Changes to the following require a full on-chain governance proposal:

| Parameter | Min deposit | Voting period | Quorum |
|-----------|-------------|---------------|--------|
| Token supply / vesting | 50,000 TMZ | 14 days | 2/3 |
| Module enable/disable | 10,000 TMZ | 7 days | 2/3 |
| Software upgrades | 10,000 TMZ | 7 days | 2/3 |
| Community treasury spend > 1M TMZ | 25,000 TMZ | 14 days | 2/3 |
| Other parameter changes | 10,000 TMZ | 7 days | > 50% |

### Unbonding

- Standard unbonding: **14 days**
- No instant unbonding. This ensures validator accountability during the unbonding window.

### Voting Power

Voting power is proportional to bonded (staked) TMZ. Delegators inherit their validator's vote unless they override it directly.

---

## 7. Supply Schedule

At genesis, total supply is fixed at 1 billion TMZ. There is no inflation mechanism beyond the staking rewards pool (pre-allocated 10%). Once the staking rewards pool is exhausted, validator rewards are funded entirely by transaction fees.

Estimated staking rewards pool exhaustion (assuming 20% of supply staked and 7% APR):

```
Annual staking rewards = 200M TMZ × 7% = 14M TMZ
Pool exhaustion = 100M TMZ / 14M TMZ ≈ 7 years
```

Post-exhaustion, the community treasury (40%) may vote to allocate additional incentives or adjust the fee model to sustain validator economics.

---

## 8. Treasury & Grant Disbursements

The Community Treasury (400M TMZ) is managed by the governance module. Disbursements require a governance proposal passing with majority. Intended uses:

- **Literary preservation grants**: Fund digitisation and submission of Tamil literary works.
- **Developer grants**: Fund teams building on the Tamizhi ecosystem.
- **Cultural partnerships**: Fund collaborations with Tamil universities and libraries.
- **Protocol maintenance**: Fund core team development beyond the initial team allocation.

The Ecosystem & Grants pool (250M TMZ) is managed by a 3-of-5 multisig grant committee for smaller, faster disbursements (< 500,000 TMZ) without requiring a full governance vote.
