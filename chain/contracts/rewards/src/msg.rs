use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::Uint128;

/// Instantiation message
#[cw_serde]
pub struct InstantiateMsg {
    /// The admin who can configure rules and deposit funds
    pub admin: String,
    /// Denomination of the reward token (e.g., "utmz")
    pub denom: String,
}

/// Execute messages
#[cw_serde]
pub enum ExecuteMsg {
    /// Admin: Configure or update a milestone rule
    SetMilestoneRule {
        rule_id: String,
        /// Amount per claim in the configured denom
        amount_per_claim: Uint128,
        /// Maximum number of total claims allowed for this rule
        max_claims: u64,
        /// Human-readable description
        description: String,
    },
    /// Admin: Deposit funds into the escrow pool
    DepositFunds {},
    /// Employee: Claim a milestone bonus
    ClaimMilestone {
        /// Employee's identifier (matches the on-chain identity)
        employee_id: String,
        /// The milestone rule ID being claimed
        rule_id: String,
        /// Hash of the work product (SHA-256 hex) — proof of completion
        work_hash: String,
        /// Recipient address to receive the reward
        recipient: String,
    },
    /// Admin: Pause/unpause claiming
    SetPaused { paused: bool },
    /// Admin: Transfer admin role
    TransferAdmin { new_admin: String },
    /// Admin: Withdraw unclaimed funds (emergency use)
    WithdrawFunds {
        amount: Uint128,
        recipient: String,
    },
}

/// Query messages
#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    /// Get contract configuration
    #[returns(ConfigResponse)]
    Config {},
    /// Get a milestone rule by ID
    #[returns(MilestoneRuleResponse)]
    GetMilestoneRule { rule_id: String },
    /// List all milestone rules
    #[returns(ListMilestoneRulesResponse)]
    ListMilestoneRules {
        start_after: Option<String>,
        limit: Option<u32>,
    },
    /// Check if an employee has already claimed a specific rule
    #[returns(ClaimStatusResponse)]
    ClaimStatus {
        employee_id: String,
        rule_id: String,
    },
    /// Get escrow balance
    #[returns(BalanceResponse)]
    Balance {},
}

#[cw_serde]
pub struct ConfigResponse {
    pub admin: String,
    pub denom: String,
    pub paused: bool,
    pub total_claimed: Uint128,
}

#[cw_serde]
pub struct MilestoneRule {
    pub rule_id: String,
    pub amount_per_claim: Uint128,
    pub max_claims: u64,
    pub current_claims: u64,
    pub description: String,
    pub active: bool,
}

#[cw_serde]
pub struct MilestoneRuleResponse {
    pub rule: MilestoneRule,
}

#[cw_serde]
pub struct ListMilestoneRulesResponse {
    pub rules: Vec<MilestoneRule>,
}

#[cw_serde]
pub struct ClaimStatusResponse {
    pub claimed: bool,
    pub claimed_at: Option<u64>, // block height when claimed
    pub work_hash: Option<String>,
}

#[cw_serde]
pub struct BalanceResponse {
    pub balance: Uint128,
    pub denom: String,
}
