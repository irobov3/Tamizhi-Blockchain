#[cfg(test)]
mod tests {
    use cosmwasm_std::{
        coins, from_json,
        testing::{mock_dependencies, mock_env, mock_info},
        BankMsg, CosmosMsg, Uint128,
    };

    use crate::{
        contract::{execute, instantiate, query},
        msg::{
            Activity, AllRulesResponse, ConfigResponse, EmployeeResponse,
            ExecuteMsg, InstantiateMsg, QueryMsg, RewardHistoryResponse, RewardRule,
        },
        error::ContractError,
    };

    const DENOM: &str = "utmz";
    const ADMIN: &str = "tamizhi1admin";
    const ALICE: &str = "tamizhi1alice";
    const BOB:   &str = "tamizhi1bob";

    fn login_rule(active: bool, max_per_day: u64) -> RewardRule {
        RewardRule {
            rule_id:     "login_reward".to_string(),
            activity:    Activity::Login,
            amount:      Uint128::new(100),
            description: "Daily login reward".to_string(),
            active,
            max_per_day,
        }
    }

    fn do_instantiate() -> cosmwasm_std::OwnedDeps<
        cosmwasm_std::MemoryStorage,
        cosmwasm_std::testing::MockApi,
        cosmwasm_std::testing::MockQuerier,
    > {
        let mut deps = mock_dependencies();
        instantiate(
            deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            InstantiateMsg {
                admin: ADMIN.to_string(),
                denom: DENOM.to_string(),
                initial_rules: vec![login_rule(true, 1)],
            },
        ).unwrap();
        deps
    }

    // ── Instantiate ──────────────────────────────────────────────────────────

    #[test]
    fn test_instantiate_with_rules() {
        let deps = do_instantiate();
        let cfg: ConfigResponse =
            from_json(query(deps.as_ref(), mock_env(), QueryMsg::Config {}).unwrap()).unwrap();
        assert_eq!(cfg.admin, ADMIN);
        assert_eq!(cfg.denom, DENOM);

        let rules: AllRulesResponse =
            from_json(query(deps.as_ref(), mock_env(), QueryMsg::AllRules {}).unwrap()).unwrap();
        assert_eq!(rules.rules.len(), 1);
        assert_eq!(rules.rules[0].rule_id, "login_reward");
    }

    // ── Create / update rule ─────────────────────────────────────────────────

    #[test]
    fn test_create_rule() {
        let mut deps = do_instantiate();
        execute(
            deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::CreateRule {
                rule: RewardRule {
                    rule_id:     "upload_reward".to_string(),
                    activity:    Activity::FileUpload,
                    amount:      Uint128::new(500),
                    description: "File upload reward".to_string(),
                    active:      true,
                    max_per_day: 5,
                },
            },
        ).unwrap();

        let rules: AllRulesResponse =
            from_json(query(deps.as_ref(), mock_env(), QueryMsg::AllRules {}).unwrap()).unwrap();
        assert_eq!(rules.rules.len(), 2);
    }

    #[test]
    fn test_update_rule() {
        let mut deps = do_instantiate();
        let mut updated = login_rule(false, 0); // disable it
        updated.amount = Uint128::new(200);

        execute(
            deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::UpdateRule { rule: updated },
        ).unwrap();

        let rules: AllRulesResponse =
            from_json(query(deps.as_ref(), mock_env(), QueryMsg::AllRules {}).unwrap()).unwrap();
        assert!(!rules.rules[0].active);
        assert_eq!(rules.rules[0].amount, Uint128::new(200));
    }

    #[test]
    fn test_create_duplicate_rule_fails() {
        let mut deps = do_instantiate();
        let err = execute(
            deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::CreateRule { rule: login_rule(true, 1) },
        ).unwrap_err();
        assert!(matches!(err, ContractError::RuleAlreadyExists { .. }));
    }

    // ── Register employee ────────────────────────────────────────────────────

    #[test]
    fn test_register_employee() {
        let mut deps = do_instantiate();
        execute(
            deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::RegisterEmployee {
                employee_id: "emp001".to_string(),
                address: ALICE.to_string(),
            },
        ).unwrap();

        let emp: EmployeeResponse = from_json(
            query(deps.as_ref(), mock_env(),
                QueryMsg::GetEmployee { employee_id: "emp001".to_string() }).unwrap()
        ).unwrap();
        assert_eq!(emp.address, ALICE);
    }

    // ── Issue reward ─────────────────────────────────────────────────────────

    #[test]
    fn test_issue_reward() {
        let mut deps = do_instantiate();

        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::RegisterEmployee {
                employee_id: "emp001".to_string(),
                address: ALICE.to_string(),
            },
        ).unwrap();

        let res = execute(
            deps.as_mut(), mock_env(),
            mock_info(ADMIN, &coins(100, DENOM)),
            ExecuteMsg::IssueReward {
                employee_id: "emp001".to_string(),
                address: ALICE.to_string(),
                rule_id: "login_reward".to_string(),
                memo: Some("Login bonus".to_string()),
            },
        ).unwrap();

        // Bank send should be emitted
        assert_eq!(res.messages.len(), 1);
        if let CosmosMsg::Bank(BankMsg::Send { to_address, amount }) = &res.messages[0].msg {
            assert_eq!(to_address, ALICE);
            assert_eq!(amount[0].amount, Uint128::new(100));
        } else {
            panic!("Expected BankMsg::Send");
        }

        // Config total_issued updated
        let cfg: ConfigResponse =
            from_json(query(deps.as_ref(), mock_env(), QueryMsg::Config {}).unwrap()).unwrap();
        assert_eq!(cfg.total_issued, Uint128::new(100));
    }

    #[test]
    fn test_daily_limit_enforced() {
        let mut deps = do_instantiate(); // max_per_day = 1

        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::RegisterEmployee {
                employee_id: "emp001".to_string(),
                address: ALICE.to_string(),
            },
        ).unwrap();

        // First reward succeeds
        execute(deps.as_mut(), mock_env(),
            mock_info(ADMIN, &coins(100, DENOM)),
            ExecuteMsg::IssueReward {
                employee_id: "emp001".to_string(),
                address: ALICE.to_string(),
                rule_id: "login_reward".to_string(),
                memo: None,
            },
        ).unwrap();

        // Second reward same day fails
        let err = execute(deps.as_mut(), mock_env(),
            mock_info(ADMIN, &coins(100, DENOM)),
            ExecuteMsg::IssueReward {
                employee_id: "emp001".to_string(),
                address: ALICE.to_string(),
                rule_id: "login_reward".to_string(),
                memo: None,
            },
        ).unwrap_err();
        assert!(matches!(err, ContractError::DailyLimitReached { .. }));
    }

    #[test]
    fn test_inactive_rule_fails() {
        let mut deps = do_instantiate();

        // Disable the rule
        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::UpdateRule { rule: login_rule(false, 1) },
        ).unwrap();

        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::RegisterEmployee {
                employee_id: "emp001".to_string(),
                address: ALICE.to_string(),
            },
        ).unwrap();

        let err = execute(deps.as_mut(), mock_env(),
            mock_info(ADMIN, &coins(100, DENOM)),
            ExecuteMsg::IssueReward {
                employee_id: "emp001".to_string(),
                address: ALICE.to_string(),
                rule_id: "login_reward".to_string(),
                memo: None,
            },
        ).unwrap_err();
        assert!(matches!(err, ContractError::RuleInactive { .. }));
    }

    #[test]
    fn test_reward_history() {
        let mut deps = do_instantiate();

        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::RegisterEmployee {
                employee_id: "emp001".to_string(),
                address: ALICE.to_string(),
            },
        ).unwrap();

        // Create an extra rule with no daily limit so we can issue 3 rewards
        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::CreateRule {
                rule: RewardRule {
                    rule_id: "upload_reward".to_string(),
                    activity: Activity::FileUpload,
                    amount: Uint128::new(50),
                    description: "Upload".to_string(),
                    active: true,
                    max_per_day: 0, // unlimited
                },
            },
        ).unwrap();

        for _ in 0..3 {
            execute(deps.as_mut(), mock_env(),
                mock_info(ADMIN, &coins(50, DENOM)),
                ExecuteMsg::IssueReward {
                    employee_id: "emp001".to_string(),
                    address: ALICE.to_string(),
                    rule_id: "upload_reward".to_string(),
                    memo: None,
                },
            ).unwrap();
        }

        let hist: RewardHistoryResponse = from_json(
            query(deps.as_ref(), mock_env(),
                QueryMsg::RewardHistory { employee_id: "emp001".to_string(), limit: None }).unwrap()
        ).unwrap();
        assert_eq!(hist.records.len(), 3);
    }

    #[test]
    fn test_fund_and_withdraw() {
        let mut deps = do_instantiate();

        execute(deps.as_mut(), mock_env(),
            mock_info(BOB, &coins(5000, DENOM)),
            ExecuteMsg::Fund {},
        ).unwrap();

        let res = execute(deps.as_mut(), mock_env(),
            mock_info(ADMIN, &[]),
            ExecuteMsg::Withdraw { to: BOB.to_string(), amount: Uint128::new(500) },
        ).unwrap();

        if let CosmosMsg::Bank(BankMsg::Send { to_address, .. }) = &res.messages[0].msg {
            assert_eq!(to_address, BOB);
        } else {
            panic!("Expected BankMsg::Send");
        }
    }
}
