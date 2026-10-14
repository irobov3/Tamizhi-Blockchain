use cosmwasm_schema::{cw_serde, QueryResponses};

#[cw_serde]
pub struct InstantiateMsg {
    pub admin: String,
}

#[cw_serde]
pub struct AccessPolicy {
    pub policy_id: String,
    pub resource: String,
    pub allowed_roles: Vec<String>,
    pub allowed_departments: Vec<String>,
    pub require_device_check: bool,
    /// UTC hour 0–23 at which access window opens (inclusive)
    pub work_hours_start: u32,
    /// UTC hour 0–23 at which access window closes (inclusive)
    pub work_hours_end: u32,
    pub max_violations_before_lock: u32,
    pub active: bool,
}

#[cw_serde]
pub struct ViolationRecord {
    pub timestamp: u64,
    pub policy_id: String,
    pub reason: String,
}

#[cw_serde]
pub enum ExecuteMsg {
    GrantRole {
        address: String,
        role: String,
        department: String,
    },
    RevokeRole {
        address: String,
    },
    AddPolicy {
        policy: AccessPolicy,
    },
    UpdatePolicy {
        policy_id: String,
        policy: AccessPolicy,
    },
    RemovePolicy {
        policy_id: String,
    },
    ApproveDevice {
        address: String,
        device_id: String,
    },
    RevokeDevice {
        address: String,
        device_id: String,
    },
    RecordViolation {
        address: String,
        policy_id: String,
        reason: String,
    },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(CheckAccessResponse)]
    CheckAccess {
        address: String,
        resource: String,
        device_id: Option<String>,
        hour_utc: Option<u32>,
    },
    #[returns(GetRoleResponse)]
    GetRole { address: String },
    #[returns(GetPolicyResponse)]
    GetPolicy { policy_id: String },
    #[returns(ListPoliciesResponse)]
    ListPolicies {},
    #[returns(GetViolationsResponse)]
    GetViolations { address: String },
    #[returns(IsDeviceApprovedResponse)]
    IsDeviceApproved { address: String, device_id: String },
}

#[cw_serde]
pub struct CheckAccessResponse {
    pub allowed: bool,
    pub reason: String,
}

#[cw_serde]
pub struct GetRoleResponse {
    pub role: String,
    pub department: String,
    pub found: bool,
}

#[cw_serde]
pub struct GetPolicyResponse {
    pub policy: Option<AccessPolicy>,
}

#[cw_serde]
pub struct ListPoliciesResponse {
    pub policies: Vec<AccessPolicy>,
}

#[cw_serde]
pub struct GetViolationsResponse {
    pub count: u32,
    pub violations: Vec<ViolationRecord>,
}

#[cw_serde]
pub struct IsDeviceApprovedResponse {
    pub approved: bool,
}
