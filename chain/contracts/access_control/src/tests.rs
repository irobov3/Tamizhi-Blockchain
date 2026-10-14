#[cfg(test)]
mod tests {
    use cosmwasm_std::{
        from_json,
        testing::{mock_dependencies, mock_env, mock_info},
    };

    use crate::{
        contract::{execute, instantiate, query},
        msg::{
            AccessPolicy, CheckAccessResponse, ExecuteMsg, GetRoleResponse,
            GetViolationsResponse, InstantiateMsg, IsDeviceApprovedResponse,
            ListPoliciesResponse, QueryMsg,
        },
        error::ContractError,
    };

    const ADMIN:  &str = "tamizhi1admin";
    const ALICE:  &str = "tamizhi1alice";
    const BOB:    &str = "tamizhi1bob";
    const DEVICE: &str = "device_iphone_001";

    fn do_instantiate() -> cosmwasm_std::OwnedDeps<
        cosmwasm_std::MemoryStorage,
        cosmwasm_std::testing::MockApi,
        cosmwasm_std::testing::MockQuerier,
    > {
        let mut deps = mock_dependencies();
        instantiate(
            deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            InstantiateMsg { admin: ADMIN.to_string() },
        ).unwrap();
        deps
    }

    fn dev_policy(resource: &str, roles: Vec<String>, require_device: bool) -> AccessPolicy {
        AccessPolicy {
            policy_id: format!("policy_{resource}"),
            resource: resource.to_string(),
            allowed_roles: roles,
            allowed_departments: vec!["engineering".to_string()],
            require_device_check: require_device,
            work_hours_start: 0,
            work_hours_end: 23,
            max_violations_before_lock: 3,
            active: true,
        }
    }

    // ── Instantiate ──────────────────────────────────────────────────────────

    #[test]
    fn test_instantiate() {
        let deps = do_instantiate();
        let role: GetRoleResponse = from_json(
            query(deps.as_ref(), mock_env(),
                QueryMsg::GetRole { address: ADMIN.to_string() }).unwrap()
        ).unwrap();
        assert!(!role.found); // admin has no role by default
    }

    // ── Grant / revoke role ──────────────────────────────────────────────────

    #[test]
    fn test_grant_role() {
        let mut deps = do_instantiate();

        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::GrantRole {
                address: ALICE.to_string(),
                role: "developer".to_string(),
                department: "engineering".to_string(),
            },
        ).unwrap();

        let role: GetRoleResponse = from_json(
            query(deps.as_ref(), mock_env(),
                QueryMsg::GetRole { address: ALICE.to_string() }).unwrap()
        ).unwrap();
        assert!(role.found);
        assert_eq!(role.role, "developer");
        assert_eq!(role.department, "engineering");
    }

    #[test]
    fn test_revoke_role() {
        let mut deps = do_instantiate();

        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::GrantRole {
                address: ALICE.to_string(),
                role: "developer".to_string(),
                department: "engineering".to_string(),
            },
        ).unwrap();

        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::RevokeRole { address: ALICE.to_string() },
        ).unwrap();

        let role: GetRoleResponse = from_json(
            query(deps.as_ref(), mock_env(),
                QueryMsg::GetRole { address: ALICE.to_string() }).unwrap()
        ).unwrap();
        assert!(!role.found);
    }

    #[test]
    fn test_grant_role_unauthorized() {
        let mut deps = do_instantiate();
        let err = execute(deps.as_mut(), mock_env(), mock_info(BOB, &[]),
            ExecuteMsg::GrantRole {
                address: ALICE.to_string(),
                role: "developer".to_string(),
                department: "engineering".to_string(),
            },
        ).unwrap_err();
        assert!(matches!(err, ContractError::Unauthorized {}));
    }

    // ── Add / update / remove policy ─────────────────────────────────────────

    #[test]
    fn test_add_policy() {
        let mut deps = do_instantiate();
        let policy = dev_policy("blockchain_api", vec!["developer".to_string()], false);

        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::AddPolicy { policy: policy.clone() },
        ).unwrap();

        let list: ListPoliciesResponse = from_json(
            query(deps.as_ref(), mock_env(), QueryMsg::ListPolicies {}).unwrap()
        ).unwrap();
        assert_eq!(list.policies.len(), 1);
        assert_eq!(list.policies[0].resource, "blockchain_api");
    }

    #[test]
    fn test_update_policy() {
        let mut deps = do_instantiate();
        let policy = dev_policy("blockchain_api", vec!["developer".to_string()], false);
        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::AddPolicy { policy: policy.clone() },
        ).unwrap();

        let mut updated = policy.clone();
        updated.max_violations_before_lock = 5;
        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::UpdatePolicy {
                policy_id: "policy_blockchain_api".to_string(),
                policy: updated,
            },
        ).unwrap();

        let list: ListPoliciesResponse = from_json(
            query(deps.as_ref(), mock_env(), QueryMsg::ListPolicies {}).unwrap()
        ).unwrap();
        assert_eq!(list.policies[0].max_violations_before_lock, 5);
    }

    #[test]
    fn test_remove_policy() {
        let mut deps = do_instantiate();
        let policy = dev_policy("blockchain_api", vec!["developer".to_string()], false);
        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::AddPolicy { policy },
        ).unwrap();
        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::RemovePolicy { policy_id: "policy_blockchain_api".to_string() },
        ).unwrap();

        let list: ListPoliciesResponse = from_json(
            query(deps.as_ref(), mock_env(), QueryMsg::ListPolicies {}).unwrap()
        ).unwrap();
        assert!(list.policies.is_empty());
    }

    // ── Check access ─────────────────────────────────────────────────────────

    #[test]
    fn test_check_access_allowed() {
        let mut deps = do_instantiate();

        // Grant Alice a developer role
        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::GrantRole {
                address: ALICE.to_string(),
                role: "developer".to_string(),
                department: "engineering".to_string(),
            },
        ).unwrap();

        // Add policy allowing developers
        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::AddPolicy {
                policy: dev_policy("blockchain_api", vec!["developer".to_string()], false),
            },
        ).unwrap();

        let res: CheckAccessResponse = from_json(
            query(deps.as_ref(), mock_env(), QueryMsg::CheckAccess {
                address: ALICE.to_string(),
                resource: "blockchain_api".to_string(),
                device_id: None,
                hour_utc: Some(10),
            }).unwrap()
        ).unwrap();
        assert!(res.allowed, "Expected access to be allowed: {}", res.reason);
    }

    #[test]
    fn test_check_access_denied_wrong_role() {
        let mut deps = do_instantiate();

        // Bob is a "viewer", policy requires "developer"
        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::GrantRole {
                address: BOB.to_string(),
                role: "viewer".to_string(),
                department: "marketing".to_string(),
            },
        ).unwrap();
        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::AddPolicy {
                policy: dev_policy("blockchain_api", vec!["developer".to_string()], false),
            },
        ).unwrap();

        let res: CheckAccessResponse = from_json(
            query(deps.as_ref(), mock_env(), QueryMsg::CheckAccess {
                address: BOB.to_string(),
                resource: "blockchain_api".to_string(),
                device_id: None,
                hour_utc: None,
            }).unwrap()
        ).unwrap();
        assert!(!res.allowed);
    }

    #[test]
    fn test_check_access_requires_device() {
        let mut deps = do_instantiate();

        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::GrantRole {
                address: ALICE.to_string(),
                role: "developer".to_string(),
                department: "engineering".to_string(),
            },
        ).unwrap();

        // Policy requires device check
        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::AddPolicy {
                policy: dev_policy("admin_panel", vec!["developer".to_string()], true),
            },
        ).unwrap();

        // Without device → denied
        let res: CheckAccessResponse = from_json(
            query(deps.as_ref(), mock_env(), QueryMsg::CheckAccess {
                address: ALICE.to_string(),
                resource: "admin_panel".to_string(),
                device_id: None,
                hour_utc: None,
            }).unwrap()
        ).unwrap();
        assert!(!res.allowed);

        // Approve device
        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::ApproveDevice {
                address: ALICE.to_string(),
                device_id: DEVICE.to_string(),
            },
        ).unwrap();

        // With approved device → allowed (provide hour_utc so work-hours check passes)
        let res2: CheckAccessResponse = from_json(
            query(deps.as_ref(), mock_env(), QueryMsg::CheckAccess {
                address: ALICE.to_string(),
                resource: "admin_panel".to_string(),
                device_id: Some(DEVICE.to_string()),
                hour_utc: Some(10),
            }).unwrap()
        ).unwrap();
        assert!(res2.allowed, "Expected allowed with device: {}", res2.reason);
    }

    // ── Device management ────────────────────────────────────────────────────

    #[test]
    fn test_approve_revoke_device() {
        let mut deps = do_instantiate();

        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::ApproveDevice {
                address: ALICE.to_string(),
                device_id: DEVICE.to_string(),
            },
        ).unwrap();

        let approved: IsDeviceApprovedResponse = from_json(
            query(deps.as_ref(), mock_env(), QueryMsg::IsDeviceApproved {
                address: ALICE.to_string(),
                device_id: DEVICE.to_string(),
            }).unwrap()
        ).unwrap();
        assert!(approved.approved);

        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::RevokeDevice {
                address: ALICE.to_string(),
                device_id: DEVICE.to_string(),
            },
        ).unwrap();

        let revoked: IsDeviceApprovedResponse = from_json(
            query(deps.as_ref(), mock_env(), QueryMsg::IsDeviceApproved {
                address: ALICE.to_string(),
                device_id: DEVICE.to_string(),
            }).unwrap()
        ).unwrap();
        assert!(!revoked.approved);
    }

    // ── Violations ───────────────────────────────────────────────────────────

    #[test]
    fn test_record_violations() {
        let mut deps = do_instantiate();

        // Add the policy first (threshold high enough that 3 violations don't trigger a lock)
        let mut policy = dev_policy("blockchain_api", vec!["developer".to_string()], false);
        policy.max_violations_before_lock = 10;
        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::AddPolicy { policy },
        ).unwrap();

        for i in 0..3 {
            execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
                ExecuteMsg::RecordViolation {
                    address: ALICE.to_string(),
                    policy_id: "policy_blockchain_api".to_string(),
                    reason: format!("unauthorized access attempt {i}"),
                },
            ).unwrap();
        }

        let viols: GetViolationsResponse = from_json(
            query(deps.as_ref(), mock_env(),
                QueryMsg::GetViolations { address: ALICE.to_string() }).unwrap()
        ).unwrap();
        assert_eq!(viols.count, 3);
        assert_eq!(viols.violations.len(), 3);
    }
}
