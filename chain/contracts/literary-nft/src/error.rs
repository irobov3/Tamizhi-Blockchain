use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),
    #[error("Unauthorized")]
    Unauthorized {},
    #[error("Token {token_id} already exists")]
    TokenExists { token_id: String },
    #[error("Token {token_id} not found")]
    TokenNotFound { token_id: String },
    #[error("Max NFTs per work reached ({max})")]
    MaxPerWorkReached { max: u64 },
    #[error("Insufficient mint fee: required {required}utmz, sent {sent}utmz")]
    InsufficientMintFee { required: u128, sent: u128 },
    #[error("Work ID cannot be empty")]
    EmptyWorkId {},
    #[error("Token ID cannot be empty")]
    EmptyTokenId {},
}
