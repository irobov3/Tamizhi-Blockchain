#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{
    to_json_binary, BankMsg, Binary, Coin, Deps, DepsMut, Env, MessageInfo,
    Order, Response, StdResult, Uint128,
};
use cw_storage_plus::Bound;

use crate::error::ContractError;
use crate::msg::{
    BalanceResponse, ClaimStatusResponse, ConfigResponse, ExecuteMsg, InstantiateMsg,
    ListMilestoneRulesResponse, MilestoneRule, MilestoneRuleResponse, QueryMsg,
};
use crate::state::{ClaimRecord, Config, StoredMilestoneRule, CLAIMS, CONFIG, MILESTONE_RULES};

const MAX_LIMIT: u32 = 100;
const DEFAULT_LIMIT: u32 = 30;

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    let admin = deps.api.addr_validate(&msg.admin)?;
    let config = Config {
        admin: admin.to_string(),
        denom: msg.denom,
        paused: false,
        total_claimed: Uint128::zero(),
    };
    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("admin", config.admin))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::SetMilestoneRule {
            rule_id,
            amount_per_claim,
            max_claims,
            description,
        } => execute_set_rule(deps, info, rule_id, amount_per_claim, max_claims, description),
        ExecuteMsg::DepositFunds {} => execute_deposit(deps, info),
        ExecuteMsg::ClaimMilestone {
            employee_id,
            rule_id,
            work_hash,
            recipient,
        } => execute_claim(deps, env, info, employee_id, rule_id, work_hash, recipient),
        ExecuteMsg::SetPaused { paused } => execute_set_paused(deps, info, paused),
        ExecuteMsg::TransferAdmin { new_admin } => execute_transfer_admin(deps, info, new_admin),
        ExecuteMsg::WithdrawFunds { amount, recipient } => {
            execute_withdraw(deps, env, info, amount, recipient)
        }
    }
}

fn assert_admin(deps: &DepsMut, info: &MessageInfo) -> Result<Config, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    if info.sender.to_string() != config.admin {
        return Err(ContractError::Unauthorized {});
    }
    Ok(config)
}

fn execute_set_rule(
    deps: DepsMut,
    info: MessageInfo,
    rule_id: String,
    amount_per_claim: Uint128,
    max_claims: u64,
    description: String,
) -> Result<Response, ContractError> {
    assert_admin(&deps, &info)?;

    let existing = MILESTONE_RULES.may_load(deps.storage, &rule_id)?;
    let rule = StoredMilestoneRule {
        amount_per_claim,
        max_claims,
        current_claims: existing.map(|r| r.current_claims).unwrap_or(0),
        description: description.clone(),
        active: true,
    };
    MILESTONE_RULES.save(deps.storage, &rule_id, &rule)?;

    Ok(Response::new()
        .add_attribute("action", "set_milestone_rule")
        .add_attribute("rule_id", rule_id)
        .add_attribute("amount_per_claim", amount_per_claim.to_string())
        .add_attribute("max_claims", max_claims.to_string()))
}

fn execute_deposit(deps: DepsMut, info: MessageInfo) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    if info.funds.is_empty() {
        return Err(ContractError::EmptyDeposit {});
    }
    // Verify only the correct denom is sent
    for coin in &info.funds {
        if coin.denom != config.denom {
            return Err(ContractError::WrongDenom {
                expected: config.denom.clone(),
                got: coin.denom.clone(),
            });
        }
    }
    let total: Uint128 = info.funds.iter().map(|c| c.amount).sum();

    Ok(Response::new()
        .add_attribute("action", "deposit_funds")
        .add_attribute("depositor", info.sender)
        .add_attribute("amount", total.to_string()))
}

fn execute_claim(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    employee_id: String,
    rule_id: String,
    work_hash: String,
    recipient: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    if config.paused {
        return Err(ContractError::ContractPaused {});
    }

    // Validate work_hash is 64-char hex
    if work_hash.len() != 64 || !work_hash.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ContractError::InvalidWorkHash {});
    }

    // Load rule
    let mut rule = MILESTONE_RULES
        .load(deps.storage, &rule_id)
        .map_err(|_| ContractError::RuleNotFound { rule_id: rule_id.clone() })?;

    if !rule.active {
        return Err(ContractError::RuleInactive { rule_id: rule_id.clone() });
    }
    if rule.current_claims >= rule.max_claims {
        return Err(ContractError::MaxClaimsReached {
            rule_id: rule_id.clone(),
            max_claims: rule.max_claims,
        });
    }

    // Check not already claimed
    if CLAIMS
        .may_load(deps.storage, (&employee_id, &rule_id))?
        .is_some()
    {
        return Err(ContractError::AlreadyClaimed {
            employee_id: employee_id.clone(),
            rule_id: rule_id.clone(),
        });
    }

    // Check balance
    let contract_balance = deps
        .querier
        .query_balance(&env.contract.address, &config.denom)?;
    if contract_balance.amount < rule.amount_per_claim {
        return Err(ContractError::InsufficientBalance {
            needed: rule.amount_per_claim.to_string(),
            available: contract_balance.amount.to_string(),
        });
    }

    // Record the claim
    CLAIMS.save(
        deps.storage,
        (&employee_id, &rule_id),
        &ClaimRecord {
            claimed_at: env.block.height,
            work_hash: work_hash.clone(),
        },
    )?;

    // Update rule claim count
    rule.current_claims += 1;
    MILESTONE_RULES.save(deps.storage, &rule_id, &rule)?;

    // Update config total_claimed
    CONFIG.update(deps.storage, |mut cfg| -> StdResult<_> {
        cfg.total_claimed += rule.amount_per_claim;
        Ok(cfg)
    })?;

    // Validate recipient address
    let recipient_addr = deps.api.addr_validate(&recipient)?;

    // Send reward
    let send_msg = BankMsg::Send {
        to_address: recipient_addr.to_string(),
        amount: vec![Coin {
            denom: config.denom.clone(),
            amount: rule.amount_per_claim,
        }],
    };

    Ok(Response::new()
        .add_message(send_msg)
        .add_attribute("action", "claim_milestone")
        .add_attribute("employee_id", employee_id)
        .add_attribute("rule_id", rule_id)
        .add_attribute("work_hash", work_hash)
        .add_attribute("recipient", recipient_addr)
        .add_attribute("amount", rule.amount_per_claim.to_string()))
}

fn execute_set_paused(
    deps: DepsMut,
    info: MessageInfo,
    paused: bool,
) -> Result<Response, ContractError> {
    assert_admin(&deps, &info)?;
    CONFIG.update(deps.storage, |mut cfg| -> StdResult<_> {
        cfg.paused = paused;
        Ok(cfg)
    })?;
    Ok(Response::new()
        .add_attribute("action", "set_paused")
        .add_attribute("paused", paused.to_string()))
}

fn execute_transfer_admin(
    deps: DepsMut,
    info: MessageInfo,
    new_admin: String,
) -> Result<Response, ContractError> {
    assert_admin(&deps, &info)?;
    let new_admin_addr = deps.api.addr_validate(&new_admin)?;
    CONFIG.update(deps.storage, |mut cfg| -> StdResult<_> {
        cfg.admin = new_admin_addr.to_string();
        Ok(cfg)
    })?;
    Ok(Response::new()
        .add_attribute("action", "transfer_admin")
        .add_attribute("new_admin", new_admin))
}

fn execute_withdraw(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    amount: Uint128,
    recipient: String,
) -> Result<Response, ContractError> {
    let config = assert_admin(&deps, &info)?;
    let recipient_addr = deps.api.addr_validate(&recipient)?;

    let balance = deps
        .querier
        .query_balance(&env.contract.address, &config.denom)?;
    if balance.amount < amount {
        return Err(ContractError::InsufficientBalance {
            needed: amount.to_string(),
            available: balance.amount.to_string(),
        });
    }

    let send_msg = BankMsg::Send {
        to_address: recipient_addr.to_string(),
        amount: vec![Coin {
            denom: config.denom,
            amount,
        }],
    };

    Ok(Response::new()
        .add_message(send_msg)
        .add_attribute("action", "withdraw_funds")
        .add_attribute("amount", amount.to_string())
        .add_attribute("recipient", recipient))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Config {} => to_json_binary(&query_config(deps)?),
        QueryMsg::GetMilestoneRule { rule_id } => {
            to_json_binary(&query_get_rule(deps, rule_id)?)
        }
        QueryMsg::ListMilestoneRules { start_after, limit } => {
            to_json_binary(&query_list_rules(deps, start_after, limit)?)
        }
        QueryMsg::ClaimStatus {
            employee_id,
            rule_id,
        } => to_json_binary(&query_claim_status(deps, employee_id, rule_id)?),
        QueryMsg::Balance {} => to_json_binary(&query_balance(deps, env)?),
    }
}

fn query_config(deps: Deps) -> StdResult<ConfigResponse> {
    let config = CONFIG.load(deps.storage)?;
    Ok(ConfigResponse {
        admin: config.admin,
        denom: config.denom,
        paused: config.paused,
        total_claimed: config.total_claimed,
    })
}

fn query_get_rule(deps: Deps, rule_id: String) -> StdResult<MilestoneRuleResponse> {
    let rule = MILESTONE_RULES.load(deps.storage, &rule_id)?;
    Ok(MilestoneRuleResponse {
        rule: MilestoneRule {
            rule_id,
            amount_per_claim: rule.amount_per_claim,
            max_claims: rule.max_claims,
            current_claims: rule.current_claims,
            description: rule.description,
            active: rule.active,
        },
    })
}

fn query_list_rules(
    deps: Deps,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<ListMilestoneRulesResponse> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
    let start = start_after
        .as_deref()
        .map(Bound::exclusive);

    let rules: StdResult<Vec<_>> = MILESTONE_RULES
        .range(deps.storage, start, None, Order::Ascending)
        .take(limit)
        .map(|item| {
            let (rule_id, rule) = item?;
            Ok(MilestoneRule {
                rule_id,
                amount_per_claim: rule.amount_per_claim,
                max_claims: rule.max_claims,
                current_claims: rule.current_claims,
                description: rule.description,
                active: rule.active,
            })
        })
        .collect();

    Ok(ListMilestoneRulesResponse { rules: rules? })
}

fn query_claim_status(
    deps: Deps,
    employee_id: String,
    rule_id: String,
) -> StdResult<ClaimStatusResponse> {
    let record = CLAIMS.may_load(deps.storage, (&employee_id, &rule_id))?;
    Ok(ClaimStatusResponse {
        claimed: record.is_some(),
        claimed_at: record.as_ref().map(|r| r.claimed_at),
        work_hash: record.map(|r| r.work_hash),
    })
}

fn query_balance(deps: Deps, env: Env) -> StdResult<BalanceResponse> {
    let config = CONFIG.load(deps.storage)?;
    let balance = deps
        .querier
        .query_balance(&env.contract.address, &config.denom)?;
    Ok(BalanceResponse {
        balance: balance.amount,
        denom: config.denom,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::Uint128;

    const ADMIN: &str = "cosmos1admin000000000000000000000000000";
    const EMPLOYEE: &str = "emp001";
    const RECIPIENT: &str = "cosmos1recipient000000000000000000000000";

    fn valid_hash() -> String {
        "a".repeat(64)
    }

    fn do_instantiate(deps: DepsMut) {
        let msg = InstantiateMsg {
            admin: ADMIN.to_string(),
            denom: "utmz".to_string(),
        };
        let info = mock_info(ADMIN, &[]);
        instantiate(deps, mock_env(), info, msg).unwrap();
    }

    #[test]
    fn test_instantiate() {
        let mut deps = mock_dependencies();
        do_instantiate(deps.as_mut());
        let config = CONFIG.load(&deps.storage).unwrap();
        assert_eq!(config.admin, ADMIN);
        assert_eq!(config.denom, "utmz");
        assert!(!config.paused);
        assert_eq!(config.total_claimed, Uint128::zero());
    }

    #[test]
    fn test_set_milestone_rule() {
        let mut deps = mock_dependencies();
        do_instantiate(deps.as_mut());

        let info = mock_info(ADMIN, &[]);
        let msg = ExecuteMsg::SetMilestoneRule {
            rule_id: "rule1".to_string(),
            amount_per_claim: Uint128::new(1_000_000),
            max_claims: 100,
            description: "Test rule".to_string(),
        };
        execute(deps.as_mut(), mock_env(), info, msg).unwrap();

        let rule = MILESTONE_RULES.load(&deps.storage, "rule1").unwrap();
        assert_eq!(rule.amount_per_claim, Uint128::new(1_000_000));
        assert_eq!(rule.max_claims, 100);
        assert_eq!(rule.current_claims, 0);
    }

    #[test]
    fn test_set_rule_unauthorized() {
        let mut deps = mock_dependencies();
        do_instantiate(deps.as_mut());

        let info = mock_info("not_admin", &[]);
        let msg = ExecuteMsg::SetMilestoneRule {
            rule_id: "rule1".to_string(),
            amount_per_claim: Uint128::new(1_000_000),
            max_claims: 100,
            description: "Test".to_string(),
        };
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();
        assert!(matches!(err, ContractError::Unauthorized {}));
    }

    #[test]
    fn test_claim_invalid_work_hash() {
        let mut deps = mock_dependencies();
        do_instantiate(deps.as_mut());

        // Set rule first
        let info = mock_info(ADMIN, &[]);
        execute(
            deps.as_mut(),
            mock_env(),
            info,
            ExecuteMsg::SetMilestoneRule {
                rule_id: "r1".to_string(),
                amount_per_claim: Uint128::new(1_000_000),
                max_claims: 10,
                description: "d".to_string(),
            },
        )
        .unwrap();

        let info = mock_info(EMPLOYEE, &[]);
        let err = execute(
            deps.as_mut(),
            mock_env(),
            info,
            ExecuteMsg::ClaimMilestone {
                employee_id: EMPLOYEE.to_string(),
                rule_id: "r1".to_string(),
                work_hash: "short".to_string(), // invalid
                recipient: RECIPIENT.to_string(),
            },
        )
        .unwrap_err();
        assert!(matches!(err, ContractError::InvalidWorkHash {}));
    }

    #[test]
    fn test_pause_prevents_claim() {
        let mut deps = mock_dependencies();
        do_instantiate(deps.as_mut());

        // Pause
        let info = mock_info(ADMIN, &[]);
        execute(
            deps.as_mut(),
            mock_env(),
            info,
            ExecuteMsg::SetPaused { paused: true },
        )
        .unwrap();

        // Try to claim
        let info = mock_info(EMPLOYEE, &[]);
        let err = execute(
            deps.as_mut(),
            mock_env(),
            info,
            ExecuteMsg::ClaimMilestone {
                employee_id: EMPLOYEE.to_string(),
                rule_id: "r1".to_string(),
                work_hash: valid_hash(),
                recipient: RECIPIENT.to_string(),
            },
        )
        .unwrap_err();
        assert!(matches!(err, ContractError::ContractPaused {}));
    }
}
