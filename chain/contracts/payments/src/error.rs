use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Recipient not found: {employee_id}")]
    RecipientNotFound { employee_id: String },

    #[error("Recipient already registered: {employee_id}")]
    RecipientAlreadyExists { employee_id: String },

    #[error("Insufficient contract balance")]
    InsufficientBalance {},

    #[error("Invalid denom: expected {expected}, got {got}")]
    InvalidDenom { expected: String, got: String },
}
