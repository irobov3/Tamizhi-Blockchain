use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized: only admin can perform this action")]
    Unauthorized {},

    #[error("Contract is paused")]
    ContractPaused {},

    #[error("Milestone rule not found: {rule_id}")]
    RuleNotFound { rule_id: String },

    #[error("Employee {employee_id} has already claimed rule {rule_id}")]
    AlreadyClaimed { employee_id: String, rule_id: String },

    #[error("Rule {rule_id} has reached its maximum claims ({max_claims})")]
    MaxClaimsReached { rule_id: String, max_claims: u64 },

    #[error("Insufficient escrow balance: need {needed} but have {available}")]
    InsufficientBalance { needed: String, available: String },

    #[error("Invalid work hash: must be a 64-character hex string")]
    InvalidWorkHash {},

    #[error("Rule {rule_id} is not active")]
    RuleInactive { rule_id: String },

    #[error("Wrong denom: expected {expected}, got {got}")]
    WrongDenom { expected: String, got: String },

    #[error("Deposit must include at least 1 token")]
    EmptyDeposit {},
}
