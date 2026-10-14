use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::Uint128;

#[cw_serde]
pub struct InstantiateMsg {
    /// Admin who can manage allowed recipients
    pub admin: String,
    /// Native denom used for payments (e.g. "utmc")
    pub denom: String,
}

#[cw_serde]
pub enum ExecuteMsg {
    /// Pay a registered employee by their employee ID
    PayEmployee {
        employee_id: String,
        memo: Option<String>,
    },
    /// Register a payment recipient (admin only)
    RegisterRecipient {
        employee_id: String,
        address: String,
    },
    /// Remove a recipient (admin only)
    RemoveRecipient { employee_id: String },
    /// Deposit TMC into this contract
    Deposit {},
    /// Withdraw remaining balance (admin only)
    Withdraw { to: String, amount: Uint128 },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(ConfigResponse)]
    Config {},
    #[returns(RecipientResponse)]
    Recipient { employee_id: String },
    #[returns(AllRecipientsResponse)]
    AllRecipients {
        start_after: Option<String>,
        limit: Option<u32>,
    },
    #[returns(BalanceResponse)]
    Balance {},
    #[returns(PaymentHistoryResponse)]
    PaymentHistory { employee_id: String },
}

#[cw_serde]
pub struct ConfigResponse {
    pub admin: String,
    pub denom: String,
    pub total_paid: Uint128,
}

#[cw_serde]
pub struct RecipientResponse {
    pub employee_id: String,
    pub address: String,
    pub total_received: Uint128,
}

#[cw_serde]
pub struct AllRecipientsResponse {
    pub recipients: Vec<RecipientResponse>,
}

#[cw_serde]
pub struct BalanceResponse {
    pub balance: Uint128,
}

#[cw_serde]
pub struct PaymentRecord {
    pub employee_id: String,
    pub amount: Uint128,
    pub memo: Option<String>,
    pub timestamp: u64,
}

#[cw_serde]
pub struct PaymentHistoryResponse {
    pub payments: Vec<PaymentRecord>,
}
