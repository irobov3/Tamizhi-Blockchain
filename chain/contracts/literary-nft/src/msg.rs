use cosmwasm_schema::{cw_serde, QueryResponses};

#[cw_serde]
pub struct InstantiateMsg {
    /// x/nft module address for cross-module calls (unused in CosmWasm context — NFT state stored locally)
    pub admin: String,
    /// Mint fee in utmz (optional — 0 means free minting)
    pub mint_fee: u128,
    /// Maximum NFTs per literary work (0 = unlimited)
    pub max_per_work: u64,
}

#[cw_serde]
pub enum ExecuteMsg {
    /// Mint an NFT for a literary work. work_id must exist on-chain.
    MintNFT {
        work_id: String,       // e.g. "thirukkural-001"
        token_id: String,      // unique token ID e.g. "thirukkural-001-0001"
        owner: String,         // recipient address
        metadata_uri: String,  // Arweave/IPFS URI for NFT metadata JSON
    },
    /// Transfer an NFT to a new owner
    TransferNFT {
        token_id: String,
        recipient: String,
    },
    /// Burn an NFT (only owner can burn)
    BurnNFT {
        token_id: String,
    },
    /// Update mint fee (admin only)
    UpdateMintFee {
        new_fee: u128,
    },
    /// Update max per work (admin only)
    UpdateMaxPerWork {
        new_max: u64,
    },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(NftInfoResponse)]
    NftInfo { token_id: String },

    #[returns(OwnerResponse)]
    Owner { token_id: String },

    #[returns(TokensResponse)]
    TokensByWork { work_id: String },

    #[returns(TokensResponse)]
    TokensByOwner { owner: String },

    #[returns(ConfigResponse)]
    Config {},

    #[returns(MintCountResponse)]
    MintCount { work_id: String },
}

#[cw_serde]
pub struct NftInfoResponse {
    pub token_id: String,
    pub work_id: String,
    pub owner: String,
    pub metadata_uri: String,
    pub minted_at: u64,
}

#[cw_serde]
pub struct OwnerResponse {
    pub owner: String,
}

#[cw_serde]
pub struct TokensResponse {
    pub tokens: Vec<String>,
}

#[cw_serde]
pub struct ConfigResponse {
    pub admin: String,
    pub mint_fee: u128,
    pub max_per_work: u64,
}

#[cw_serde]
pub struct MintCountResponse {
    pub count: u64,
}
