use cosmwasm_schema::cw_serde;
use cosmwasm_std::Addr;
use cw_storage_plus::{Item, Map};

use crate::msg::{AccessPolicy, ViolationRecord};

#[cw_serde]
pub struct Config {
    pub admin: Addr,
}

#[cw_serde]
pub struct RoleEntry {
    pub role: String,
    pub department: String,
    pub address: String,
}

/// Global contract configuration
pub const CONFIG: Item<Config> = Item::new("config");

/// Maps address -> RoleEntry
pub const ROLES: Map<&str, RoleEntry> = Map::new("roles");

/// Maps policy_id -> AccessPolicy
pub const POLICIES: Map<&str, AccessPolicy> = Map::new("policies");

/// Maps (address, device_id) -> bool (approved)
pub const APPROVED_DEVICES: Map<(&str, &str), bool> = Map::new("approved_devices");

/// Maps address -> Vec<ViolationRecord>
pub const VIOLATIONS: Map<&str, Vec<ViolationRecord>> = Map::new("violations");
