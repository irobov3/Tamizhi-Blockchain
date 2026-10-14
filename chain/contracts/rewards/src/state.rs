use cosmwasm_schema::cw_serde;
use cosmwasm_std::Uint128;
use cw_storage_plus::{Item, Map};

#[cw_serde]
pub struct Config {
    pub admin: String,
    pub denom: String,
    pub paused: bool,
    pub total_claimed: Uint128,
}

#[cw_serde]
pub struct StoredMilestoneRule {
    pub amount_per_claim: Uint128,
    pub max_claims: u64,
    pub current_claims: u64,
    pub description: String,
    pub active: bool,
}

#[cw_serde]
pub struct ClaimRecord {
    pub claimed_at: u64, // block height
    pub work_hash: String,
}

pub const CONFIG: Item<Config> = Item::new("config");

/// Map: rule_id -> StoredMilestoneRule
pub const MILESTONE_RULES: Map<&str, StoredMilestoneRule> = Map::new("rules");

/// Map: (employee_id, rule_id) -> ClaimRecord
/// Key: composite key "employeeId:ruleId"
pub const CLAIMS: Map<(&str, &str), ClaimRecord> = Map::new("claims");
