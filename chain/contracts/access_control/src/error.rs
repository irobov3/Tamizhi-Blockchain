use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized: caller is not the admin")]
    Unauthorized {},

    #[error("Role not found for address {address}")]
    RoleNotFound { address: String },

    #[error("Policy not found: {policy_id}")]
    PolicyNotFound { policy_id: String },

    #[error("Device not approved: device {device_id} for address {address}")]
    DeviceNotApproved { address: String, device_id: String },

    #[error("Access denied: outside allowed working hours ({start}:00 - {end}:00 UTC)")]
    OutsideWorkingHours { start: u32, end: u32 },

    #[error("Max violations exceeded for address {address}: {count} violations recorded, account should be locked")]
    MaxViolationsExceeded { address: String, count: u32 },

    #[error("Policy already exists: {policy_id}")]
    PolicyAlreadyExists { policy_id: String },

    #[error("Invalid time range: start hour {start} must be less than end hour {end}")]
    InvalidTimeRange { start: u32, end: u32 },
}
