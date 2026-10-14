#[cfg(test)]
mod tests {
    use cosmwasm_std::{
        coins, from_json,
        testing::{mock_dependencies, mock_env, mock_info},
        Addr, BankMsg, CosmosMsg, Uint128,
    };

    use crate::{
        contract::{execute, instantiate, query},
        msg::{
            AllRecipientsResponse, ConfigResponse, ExecuteMsg, InstantiateMsg,
            PaymentHistoryResponse, QueryMsg, RecipientResponse,
        },
        error::ContractError,
    };

    const DENOM:  &str = "utmz";
    const ADMIN:  &str = "tamizhi1admin";
    const ALICE:  &str = "tamizhi1alice";
    const BOB:    &str = "tamizhi1bob";

    fn do_instantiate(admin: &str) -> cosmwasm_std::OwnedDeps<
        cosmwasm_std::MemoryStorage,
        cosmwasm_std::testing::MockApi,
        cosmwasm_std::testing::MockQuerier,
    > {
        let mut deps = mock_dependencies();
        let msg = InstantiateMsg {
            admin: admin.to_string(),
            denom: DENOM.to_string(),
        };
        instantiate(deps.as_mut(), mock_env(), mock_info(admin, &[]), msg).unwrap();
        deps
    }

    // ── Instantiate ──────────────────────────────────────────────────────────

    #[test]
    fn test_instantiate() {
        let deps = do_instantiate(ADMIN);
        let res: ConfigResponse =
            from_json(query(deps.as_ref(), mock_env(), QueryMsg::Config {}).unwrap()).unwrap();
        assert_eq!(res.admin, ADMIN);
        assert_eq!(res.denom, DENOM);
        assert_eq!(res.total_paid, Uint128::zero());
    }

    // ── Register recipient ───────────────────────────────────────────────────

    #[test]
    fn test_register_recipient() {
        let mut deps = do_instantiate(ADMIN);

        let msg = ExecuteMsg::RegisterRecipient {
            employee_id: "emp001".to_string(),
            address: ALICE.to_string(),
        };
        let res = execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]), msg).unwrap();
        assert_eq!(res.attributes[0].value, "register_recipient");

        let r: RecipientResponse = from_json(
            query(deps.as_ref(), mock_env(),
                QueryMsg::Recipient { employee_id: "emp001".to_string() }).unwrap()
        ).unwrap();
        assert_eq!(r.address, ALICE);
        assert_eq!(r.total_received, Uint128::zero());
    }

    #[test]
    fn test_register_duplicate_fails() {
        let mut deps = do_instantiate(ADMIN);
        let msg = ExecuteMsg::RegisterRecipient {
            employee_id: "emp001".to_string(),
            address: ALICE.to_string(),
        };
        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]), msg.clone()).unwrap();
        let err = execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]), msg).unwrap_err();
        assert!(matches!(err, ContractError::RecipientAlreadyExists { .. }));
    }

    #[test]
    fn test_register_unauthorized() {
        let mut deps = do_instantiate(ADMIN);
        let msg = ExecuteMsg::RegisterRecipient {
            employee_id: "emp001".to_string(),
            address: ALICE.to_string(),
        };
        let err = execute(deps.as_mut(), mock_env(), mock_info(BOB, &[]), msg).unwrap_err();
        assert!(matches!(err, ContractError::Unauthorized {}));
    }

    // ── Pay employee ─────────────────────────────────────────────────────────

    #[test]
    fn test_pay_employee() {
        let mut deps = do_instantiate(ADMIN);

        // Register Alice
        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::RegisterRecipient {
                employee_id: "emp001".to_string(),
                address: ALICE.to_string(),
            },
        ).unwrap();

        // Pay Alice 500 utmz
        let pay_msg = ExecuteMsg::PayEmployee {
            employee_id: "emp001".to_string(),
            memo: Some("March salary".to_string()),
        };
        let res = execute(
            deps.as_mut(), mock_env(),
            mock_info(ADMIN, &coins(500, DENOM)),
            pay_msg,
        ).unwrap();

        // Check BankMsg::Send was emitted
        assert_eq!(res.messages.len(), 1);
        if let CosmosMsg::Bank(BankMsg::Send { to_address, amount }) = &res.messages[0].msg {
            assert_eq!(to_address, ALICE);
            assert_eq!(amount[0].amount, Uint128::new(500));
        } else {
            panic!("Expected BankMsg::Send");
        }

        // Check config total_paid updated
        let cfg: ConfigResponse =
            from_json(query(deps.as_ref(), mock_env(), QueryMsg::Config {}).unwrap()).unwrap();
        assert_eq!(cfg.total_paid, Uint128::new(500));
    }

    #[test]
    fn test_pay_nonexistent_employee_fails() {
        let mut deps = do_instantiate(ADMIN);
        let err = execute(
            deps.as_mut(), mock_env(),
            mock_info(ADMIN, &coins(100, DENOM)),
            ExecuteMsg::PayEmployee {
                employee_id: "ghost".to_string(),
                memo: None,
            },
        ).unwrap_err();
        assert!(matches!(err, ContractError::RecipientNotFound { .. }));
    }

    // ── Remove recipient ─────────────────────────────────────────────────────

    #[test]
    fn test_remove_recipient() {
        let mut deps = do_instantiate(ADMIN);

        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::RegisterRecipient {
                employee_id: "emp001".to_string(),
                address: ALICE.to_string(),
            },
        ).unwrap();

        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::RemoveRecipient { employee_id: "emp001".to_string() },
        ).unwrap();

        // Query should fail now
        let err = query(
            deps.as_ref(), mock_env(),
            QueryMsg::Recipient { employee_id: "emp001".to_string() },
        ).unwrap_err();
        assert!(err.to_string().contains("not found") || format!("{err:?}").contains("NotFound"));
    }

    // ── Deposit & withdraw ───────────────────────────────────────────────────

    #[test]
    fn test_deposit() {
        let mut deps = do_instantiate(ADMIN);
        let res = execute(
            deps.as_mut(), mock_env(),
            mock_info(BOB, &coins(1000, DENOM)),
            ExecuteMsg::Deposit {},
        ).unwrap();
        assert!(res.attributes.iter().any(|a| a.key == "amount" && a.value == "1000"));
    }

    #[test]
    fn test_withdraw() {
        let mut deps = do_instantiate(ADMIN);
        let res = execute(
            deps.as_mut(), mock_env(),
            mock_info(ADMIN, &[]),
            ExecuteMsg::Withdraw {
                to: BOB.to_string(),
                amount: Uint128::new(200),
            },
        ).unwrap();
        if let CosmosMsg::Bank(BankMsg::Send { to_address, amount }) = &res.messages[0].msg {
            assert_eq!(to_address, BOB);
            assert_eq!(amount[0].amount, Uint128::new(200));
        } else {
            panic!("Expected BankMsg::Send");
        }
    }

    // ── Payment history ──────────────────────────────────────────────────────

    #[test]
    fn test_payment_history() {
        let mut deps = do_instantiate(ADMIN);

        execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
            ExecuteMsg::RegisterRecipient {
                employee_id: "emp001".to_string(),
                address: ALICE.to_string(),
            },
        ).unwrap();

        for i in 1u128..=3 {
            execute(deps.as_mut(), mock_env(),
                mock_info(ADMIN, &coins(100 * i, DENOM)),
                ExecuteMsg::PayEmployee {
                    employee_id: "emp001".to_string(),
                    memo: Some(format!("payment {i}")),
                },
            ).unwrap();
        }

        let hist: PaymentHistoryResponse = from_json(
            query(deps.as_ref(), mock_env(),
                QueryMsg::PaymentHistory { employee_id: "emp001".to_string() }).unwrap()
        ).unwrap();
        assert_eq!(hist.payments.len(), 3);
    }

    // ── AllRecipients query ──────────────────────────────────────────────────

    #[test]
    fn test_all_recipients() {
        let mut deps = do_instantiate(ADMIN);

        for i in 0..5u32 {
            execute(deps.as_mut(), mock_env(), mock_info(ADMIN, &[]),
                ExecuteMsg::RegisterRecipient {
                    employee_id: format!("emp{i:03}"),
                    address: format!("tamizhi1user{i}"),
                },
            ).unwrap();
        }

        let resp: AllRecipientsResponse = from_json(
            query(deps.as_ref(), mock_env(),
                QueryMsg::AllRecipients { start_after: None, limit: None }).unwrap()
        ).unwrap();
        assert_eq!(resp.recipients.len(), 5);
    }
}
