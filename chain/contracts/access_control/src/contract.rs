#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{
    to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Order, Response, StdResult,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::{
    AccessPolicy, CheckAccessResponse, ExecuteMsg, GetPolicyResponse, GetRoleResponse,
    GetViolationsResponse, InstantiateMsg, IsDeviceApprovedResponse, ListPoliciesResponse,
    QueryMsg, ViolationRecord,
};
use crate::state::{Config, RoleEntry, APPROVED_DEVICES, CONFIG, POLICIES, ROLES, VIOLATIONS};

const CONTRACT_NAME: &str = "crates.io:access_control";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

// ────────────────────────────────────────────────────────────────────────────
// Instantiate
// ────────────────────────────────────────────────────────────────────────────

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    let admin = deps.api.addr_validate(&msg.admin)?;
    CONFIG.save(deps.storage, &Config { admin: admin.clone() })?;
    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("admin", admin))
}

// ────────────────────────────────────────────────────────────────────────────
// Execute
// ────────────────────────────────────────────────────────────────────────────

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::GrantRole {
            address,
            role,
            department,
        } => execute_grant_role(deps, info, address, role, department),
        ExecuteMsg::RevokeRole { address } => execute_revoke_role(deps, info, address),
        ExecuteMsg::AddPolicy { policy } => execute_add_policy(deps, info, policy),
        ExecuteMsg::UpdatePolicy { policy_id, policy } => {
            execute_update_policy(deps, info, policy_id, policy)
        }
        ExecuteMsg::RemovePolicy { policy_id } => execute_remove_policy(deps, info, policy_id),
        ExecuteMsg::ApproveDevice { address, device_id } => {
            execute_approve_device(deps, info, address, device_id)
        }
        ExecuteMsg::RevokeDevice { address, device_id } => {
            execute_revoke_device(deps, info, address, device_id)
        }
        ExecuteMsg::RecordViolation {
            address,
            policy_id,
            reason,
        } => execute_record_violation(deps, env, info, address, policy_id, reason),
    }
}

fn only_admin(deps: &Deps, info: &MessageInfo) -> Result<(), ContractError> {
    let cfg = CONFIG.load(deps.storage)?;
    if info.sender != cfg.admin {
        return Err(ContractError::Unauthorized {});
    }
    Ok(())
}

fn execute_grant_role(
    deps: DepsMut,
    info: MessageInfo,
    address: String,
    role: String,
    department: String,
) -> Result<Response, ContractError> {
    only_admin(&deps.as_ref(), &info)?;
    let addr = deps.api.addr_validate(&address)?;
    let entry = RoleEntry {
        role: role.clone(),
        department: department.clone(),
        address: addr.to_string(),
    };
    ROLES.save(deps.storage, addr.as_str(), &entry)?;
    Ok(Response::new()
        .add_attribute("action", "grant_role")
        .add_attribute("address", addr)
        .add_attribute("role", role)
        .add_attribute("department", department))
}

fn execute_revoke_role(
    deps: DepsMut,
    info: MessageInfo,
    address: String,
) -> Result<Response, ContractError> {
    only_admin(&deps.as_ref(), &info)?;
    let addr = deps.api.addr_validate(&address)?;
    ROLES.remove(deps.storage, addr.as_str());
    Ok(Response::new()
        .add_attribute("action", "revoke_role")
        .add_attribute("address", addr))
}

fn execute_add_policy(
    deps: DepsMut,
    info: MessageInfo,
    policy: AccessPolicy,
) -> Result<Response, ContractError> {
    only_admin(&deps.as_ref(), &info)?;
    if POLICIES
        .may_load(deps.storage, &policy.policy_id)?
        .is_some()
    {
        return Err(ContractError::PolicyAlreadyExists {
            policy_id: policy.policy_id.clone(),
        });
    }
    if policy.work_hours_start != policy.work_hours_end
        && policy.work_hours_start > policy.work_hours_end
    {
        return Err(ContractError::InvalidTimeRange {
            start: policy.work_hours_start,
            end: policy.work_hours_end,
        });
    }
    let policy_id = policy.policy_id.clone();
    POLICIES.save(deps.storage, &policy_id, &policy)?;
    Ok(Response::new()
        .add_attribute("action", "add_policy")
        .add_attribute("policy_id", policy_id))
}

fn execute_update_policy(
    deps: DepsMut,
    info: MessageInfo,
    policy_id: String,
    policy: AccessPolicy,
) -> Result<Response, ContractError> {
    only_admin(&deps.as_ref(), &info)?;
    if POLICIES.may_load(deps.storage, &policy_id)?.is_none() {
        return Err(ContractError::PolicyNotFound {
            policy_id: policy_id.clone(),
        });
    }
    if policy.work_hours_start != policy.work_hours_end
        && policy.work_hours_start > policy.work_hours_end
    {
        return Err(ContractError::InvalidTimeRange {
            start: policy.work_hours_start,
            end: policy.work_hours_end,
        });
    }
    POLICIES.save(deps.storage, &policy_id, &policy)?;
    Ok(Response::new()
        .add_attribute("action", "update_policy")
        .add_attribute("policy_id", policy_id))
}

fn execute_remove_policy(
    deps: DepsMut,
    info: MessageInfo,
    policy_id: String,
) -> Result<Response, ContractError> {
    only_admin(&deps.as_ref(), &info)?;
    if POLICIES.may_load(deps.storage, &policy_id)?.is_none() {
        return Err(ContractError::PolicyNotFound {
            policy_id: policy_id.clone(),
        });
    }
    POLICIES.remove(deps.storage, &policy_id);
    Ok(Response::new()
        .add_attribute("action", "remove_policy")
        .add_attribute("policy_id", policy_id))
}

fn execute_approve_device(
    deps: DepsMut,
    info: MessageInfo,
    address: String,
    device_id: String,
) -> Result<Response, ContractError> {
    only_admin(&deps.as_ref(), &info)?;
    let addr = deps.api.addr_validate(&address)?;
    APPROVED_DEVICES.save(deps.storage, (addr.as_str(), device_id.as_str()), &true)?;
    Ok(Response::new()
        .add_attribute("action", "approve_device")
        .add_attribute("address", addr)
        .add_attribute("device_id", device_id))
}

fn execute_revoke_device(
    deps: DepsMut,
    info: MessageInfo,
    address: String,
    device_id: String,
) -> Result<Response, ContractError> {
    only_admin(&deps.as_ref(), &info)?;
    let addr = deps.api.addr_validate(&address)?;
    APPROVED_DEVICES.remove(deps.storage, (addr.as_str(), device_id.as_str()));
    Ok(Response::new()
        .add_attribute("action", "revoke_device")
        .add_attribute("address", addr)
        .add_attribute("device_id", device_id))
}

fn execute_record_violation(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    address: String,
    policy_id: String,
    reason: String,
) -> Result<Response, ContractError> {
    only_admin(&deps.as_ref(), &info)?;

    // Look up the policy to get the max_violations_before_lock threshold
    let policy = POLICIES
        .may_load(deps.storage, &policy_id)?
        .ok_or_else(|| ContractError::PolicyNotFound {
            policy_id: policy_id.clone(),
        })?;

    let addr = deps.api.addr_validate(&address)?;
    let timestamp = env.block.time.seconds();

    let new_record = ViolationRecord {
        timestamp,
        policy_id: policy_id.clone(),
        reason: reason.clone(),
    };

    let mut records: Vec<ViolationRecord> = VIOLATIONS
        .may_load(deps.storage, addr.as_str())?
        .unwrap_or_default();

    records.push(new_record);
    let count = records.len() as u32;
    VIOLATIONS.save(deps.storage, addr.as_str(), &records)?;

    if policy.max_violations_before_lock > 0 && count >= policy.max_violations_before_lock {
        return Err(ContractError::MaxViolationsExceeded {
            address: addr.to_string(),
            count,
        });
    }

    Ok(Response::new()
        .add_attribute("action", "record_violation")
        .add_attribute("address", addr)
        .add_attribute("policy_id", policy_id)
        .add_attribute("violation_count", count.to_string())
        .add_attribute("reason", reason))
}

// ────────────────────────────────────────────────────────────────────────────
// Query
// ────────────────────────────────────────────────────────────────────────────

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::CheckAccess {
            address,
            resource,
            device_id,
            hour_utc,
        } => to_json_binary(&query_check_access(
            deps, address, resource, device_id, hour_utc,
        )?),
        QueryMsg::GetRole { address } => to_json_binary(&query_get_role(deps, address)?),
        QueryMsg::GetPolicy { policy_id } => to_json_binary(&query_get_policy(deps, policy_id)?),
        QueryMsg::ListPolicies {} => to_json_binary(&query_list_policies(deps)?),
        QueryMsg::GetViolations { address } => {
            to_json_binary(&query_get_violations(deps, address)?)
        }
        QueryMsg::IsDeviceApproved { address, device_id } => {
            to_json_binary(&query_is_device_approved(deps, address, device_id)?)
        }
    }
}

fn find_policy_for_resource(deps: Deps, resource: &str) -> StdResult<Option<AccessPolicy>> {
    let result = POLICIES
        .range(deps.storage, None, None, Order::Ascending)
        .find(|item| {
            if let Ok((_, policy)) = item {
                policy.resource == resource && policy.active
            } else {
                false
            }
        });

    match result {
        Some(Ok((_, policy))) => Ok(Some(policy)),
        Some(Err(e)) => Err(e),
        None => Ok(None),
    }
}

fn query_check_access(
    deps: Deps,
    address: String,
    resource: String,
    device_id: Option<String>,
    hour_utc: Option<u32>,
) -> StdResult<CheckAccessResponse> {
    // 1. Find matching active policy for the resource
    let policy = match find_policy_for_resource(deps, &resource)? {
        Some(p) => p,
        None => {
            return Ok(CheckAccessResponse {
                allowed: false,
                reason: format!("No active policy found for resource '{}'", resource),
            });
        }
    };

    // 2. Load the role entry for the address
    let role_entry = match ROLES.may_load(deps.storage, &address)? {
        Some(r) => r,
        None => {
            return Ok(CheckAccessResponse {
                allowed: false,
                reason: format!("No role assigned to address '{}'", address),
            });
        }
    };

    // 3. Check allowed roles OR allowed departments
    let role_allowed = policy.allowed_roles.contains(&role_entry.role);
    let dept_allowed = policy.allowed_departments.contains(&role_entry.department);
    if !role_allowed && !dept_allowed {
        return Ok(CheckAccessResponse {
            allowed: false,
            reason: format!(
                "Role '{}' in department '{}' is not permitted to access resource '{}'",
                role_entry.role, role_entry.department, resource
            ),
        });
    }

    // 4. Device check
    if policy.require_device_check {
        match &device_id {
            Some(did) => {
                let approved = APPROVED_DEVICES
                    .may_load(deps.storage, (&address, did.as_str()))?
                    .unwrap_or(false);
                if !approved {
                    return Ok(CheckAccessResponse {
                        allowed: false,
                        reason: format!(
                            "Device '{}' is not approved for address '{}'",
                            did, address
                        ),
                    });
                }
            }
            None => {
                return Ok(CheckAccessResponse {
                    allowed: false,
                    reason: "Device check required but no device_id provided".to_string(),
                });
            }
        }
    }

    // 5. Working hours check (only enforced when start != end)
    if policy.work_hours_start != policy.work_hours_end {
        match hour_utc {
            Some(hour) => {
                let in_window = if policy.work_hours_start <= policy.work_hours_end {
                    hour >= policy.work_hours_start && hour <= policy.work_hours_end
                } else {
                    // wraps midnight: e.g. 22:00 – 06:00
                    hour >= policy.work_hours_start || hour <= policy.work_hours_end
                };
                if !in_window {
                    return Ok(CheckAccessResponse {
                        allowed: false,
                        reason: format!(
                            "Access attempt at hour {} UTC is outside allowed window {}:00–{}:00 UTC",
                            hour, policy.work_hours_start, policy.work_hours_end
                        ),
                    });
                }
            }
            None => {
                return Ok(CheckAccessResponse {
                    allowed: false,
                    reason: "Working hours restriction is active but no hour_utc provided"
                        .to_string(),
                });
            }
        }
    }

    Ok(CheckAccessResponse {
        allowed: true,
        reason: format!(
            "Access granted to resource '{}' for address '{}' with role '{}'",
            resource, address, role_entry.role
        ),
    })
}

fn query_get_role(deps: Deps, address: String) -> StdResult<GetRoleResponse> {
    match ROLES.may_load(deps.storage, &address)? {
        Some(entry) => Ok(GetRoleResponse {
            role: entry.role,
            department: entry.department,
            found: true,
        }),
        None => Ok(GetRoleResponse {
            role: String::new(),
            department: String::new(),
            found: false,
        }),
    }
}

fn query_get_policy(deps: Deps, policy_id: String) -> StdResult<GetPolicyResponse> {
    let policy = POLICIES.may_load(deps.storage, &policy_id)?;
    Ok(GetPolicyResponse { policy })
}

fn query_list_policies(deps: Deps) -> StdResult<ListPoliciesResponse> {
    let policies: StdResult<Vec<AccessPolicy>> = POLICIES
        .range(deps.storage, None, None, Order::Ascending)
        .map(|item| {
            let (_, policy) = item?;
            Ok(policy)
        })
        .collect();
    Ok(ListPoliciesResponse {
        policies: policies?,
    })
}

fn query_get_violations(deps: Deps, address: String) -> StdResult<GetViolationsResponse> {
    let violations = VIOLATIONS
        .may_load(deps.storage, &address)?
        .unwrap_or_default();
    let count = violations.len() as u32;
    Ok(GetViolationsResponse { count, violations })
}

fn query_is_device_approved(
    deps: Deps,
    address: String,
    device_id: String,
) -> StdResult<IsDeviceApprovedResponse> {
    let approved = APPROVED_DEVICES
        .may_load(deps.storage, (&address, device_id.as_str()))?
        .unwrap_or(false);
    Ok(IsDeviceApprovedResponse { approved })
}
