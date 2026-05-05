use cosmwasm_std::Addr;
use cw_storage_plus::{Item, Map};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Config {
    pub admin: Addr,
    pub mint_fee: u128,
    pub max_per_work: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NftToken {
    pub token_id: String,
    pub work_id: String,
    pub owner: Addr,
    pub metadata_uri: String,
    pub minted_at: u64, // block timestamp
}

// token_id → NftToken
pub const TOKENS: Map<&str, NftToken> = Map::new("tokens");

// work_id → list of token_ids (stored as JSON vec)
pub const WORK_TOKENS: Map<&str, Vec<String>> = Map::new("work_tokens");

// owner → list of token_ids
pub const OWNER_TOKENS: Map<&str, Vec<String>> = Map::new("owner_tokens");

// work_id → mint count
pub const MINT_COUNT: Map<&str, u64> = Map::new("mint_count");

pub const CONFIG: Item<Config> = Item::new("config");
