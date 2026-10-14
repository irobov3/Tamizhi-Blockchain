use cosmwasm_schema::cw_serde;
use cosmwasm_std::Uint128;
use cw_storage_plus::{Item, Map};

#[cw_serde]
pub struct Config {
    pub admin: String,
    pub denom: String,
    pub total_paid: Uint128,
}

#[cw_serde]
pub struct Recipient {
    pub employee_id: String,
    pub address: String,
    pub total_received: Uint128,
}

#[cw_serde]
pub struct Payment {
    pub employee_id: String,
    pub amount: Uint128,
    pub memo: Option<String>,
    pub timestamp: u64,
}

pub const CONFIG: Item<Config> = Item::new("config");
pub const RECIPIENTS: Map<&str, Recipient> = Map::new("recipients");
pub const PAYMENT_HISTORY: Map<(&str, u64), Payment> = Map::new("payment_history");
pub const PAYMENT_COUNTER: Map<&str, u64> = Map::new("pay_counter");
