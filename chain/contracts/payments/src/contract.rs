#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{
    to_json_binary, BankMsg, Binary, Coin, CosmosMsg, Deps, DepsMut, Env, MessageInfo,
    Order, Response, StdResult, Uint128,
};
use cw2::set_contract_version;
use cw_storage_plus::Bound;

use crate::error::ContractError;
use crate::msg::*;
use crate::state::*;

const CONTRACT_NAME: &str = "crates.io:tamizhi-payments";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");
const DEFAULT_LIMIT: u32 = 30;
const MAX_LIMIT: u32 = 100;

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    let admin = deps.api.addr_validate(&msg.admin)?;
    CONFIG.save(
        deps.storage,
        &Config {
            admin: admin.to_string(),
            denom: msg.denom.clone(),
            total_paid: Uint128::zero(),
        },
    )?;

    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("admin", admin)
        .add_attribute("denom", msg.denom))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::PayEmployee { employee_id, memo } => {
            execute_pay(deps, env, info, employee_id, memo)
        }
        ExecuteMsg::RegisterRecipient { employee_id, address } => {
            execute_register(deps, info, employee_id, address)
        }
        ExecuteMsg::RemoveRecipient { employee_id } => {
            execute_remove(deps, info, employee_id)
        }
        ExecuteMsg::Deposit {} => execute_deposit(deps, info),
        ExecuteMsg::Withdraw { to, amount } => execute_withdraw(deps, info, to, amount),
    }
}

fn execute_pay(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    employee_id: String,
    memo: Option<String>,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // Only admin or governance can initiate payments
    if info.sender.to_string() != config.admin {
        return Err(ContractError::Unauthorized {});
    }

    let recipient = RECIPIENTS
        .may_load(deps.storage, &employee_id)?
        .ok_or(ContractError::RecipientNotFound {
            employee_id: employee_id.clone(),
        })?;

    // Exactly one coin must be sent specifying the amount to pay
    let pay_coin = info
        .funds
        .iter()
        .find(|c| c.denom == config.denom)
        .ok_or(ContractError::InvalidDenom {
            expected: config.denom.clone(),
            got: "none".to_string(),
        })?
        .clone();

    // Update recipient total
    RECIPIENTS.update(deps.storage, &employee_id, |r| -> StdResult<_> {
        let mut rec = r.unwrap();
        rec.total_received += pay_coin.amount;
        Ok(rec)
    })?;

    // Update config total paid
    CONFIG.update(deps.storage, |mut cfg| -> StdResult<_> {
        cfg.total_paid += pay_coin.amount;
        Ok(cfg)
    })?;

    // Record history
    let counter = PAYMENT_COUNTER
        .may_load(deps.storage, &employee_id)?
        .unwrap_or(0)
        + 1;
    PAYMENT_COUNTER.save(deps.storage, &employee_id, &counter)?;
    PAYMENT_HISTORY.save(
        deps.storage,
        (&employee_id, counter),
        &Payment {
            employee_id: employee_id.clone(),
            amount: pay_coin.amount,
            memo: memo.clone(),
            timestamp: env.block.time.seconds(),
        },
    )?;

    let send_msg = CosmosMsg::Bank(BankMsg::Send {
        to_address: recipient.address.clone(),
        amount: vec![pay_coin.clone()],
    });

    Ok(Response::new()
        .add_message(send_msg)
        .add_attribute("action", "pay_employee")
        .add_attribute("employee_id", employee_id)
        .add_attribute("recipient", recipient.address)
        .add_attribute("amount", pay_coin.amount))
}

fn execute_register(
    deps: DepsMut,
    info: MessageInfo,
    employee_id: String,
    address: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    if info.sender.to_string() != config.admin {
        return Err(ContractError::Unauthorized {});
    }

    if RECIPIENTS.has(deps.storage, &employee_id) {
        return Err(ContractError::RecipientAlreadyExists {
            employee_id: employee_id.clone(),
        });
    }

    let addr = deps.api.addr_validate(&address)?;
    RECIPIENTS.save(
        deps.storage,
        &employee_id,
        &Recipient {
            employee_id: employee_id.clone(),
            address: addr.to_string(),
            total_received: Uint128::zero(),
        },
    )?;

    Ok(Response::new()
        .add_attribute("action", "register_recipient")
        .add_attribute("employee_id", employee_id)
        .add_attribute("address", addr))
}

fn execute_remove(
    deps: DepsMut,
    info: MessageInfo,
    employee_id: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    if info.sender.to_string() != config.admin {
        return Err(ContractError::Unauthorized {});
    }
    RECIPIENTS.remove(deps.storage, &employee_id);
    Ok(Response::new()
        .add_attribute("action", "remove_recipient")
        .add_attribute("employee_id", employee_id))
}

fn execute_deposit(deps: DepsMut, info: MessageInfo) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let deposited = info
        .funds
        .iter()
        .find(|c| c.denom == config.denom)
        .map(|c| c.amount)
        .unwrap_or(Uint128::zero());

    Ok(Response::new()
        .add_attribute("action", "deposit")
        .add_attribute("from", info.sender)
        .add_attribute("amount", deposited))
}

fn execute_withdraw(
    deps: DepsMut,
    info: MessageInfo,
    to: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    if info.sender.to_string() != config.admin {
        return Err(ContractError::Unauthorized {});
    }
    let to_addr = deps.api.addr_validate(&to)?;
    let send_msg = CosmosMsg::Bank(BankMsg::Send {
        to_address: to_addr.to_string(),
        amount: vec![Coin {
            denom: config.denom,
            amount,
        }],
    });
    Ok(Response::new()
        .add_message(send_msg)
        .add_attribute("action", "withdraw")
        .add_attribute("to", to_addr)
        .add_attribute("amount", amount))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Config {} => {
            let cfg = CONFIG.load(deps.storage)?;
            to_json_binary(&ConfigResponse {
                admin: cfg.admin,
                denom: cfg.denom,
                total_paid: cfg.total_paid,
            })
        }
        QueryMsg::Recipient { employee_id } => {
            let r = RECIPIENTS.load(deps.storage, &employee_id)?;
            to_json_binary(&RecipientResponse {
                employee_id: r.employee_id,
                address: r.address,
                total_received: r.total_received,
            })
        }
        QueryMsg::AllRecipients { start_after, limit } => {
            let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
            let start = start_after.as_deref().map(Bound::exclusive);
            let recipients: StdResult<Vec<RecipientResponse>> = RECIPIENTS
                .range(deps.storage, start, None, Order::Ascending)
                .take(limit)
                .map(|item| {
                    let (_, r) = item?;
                    Ok(RecipientResponse {
                        employee_id: r.employee_id,
                        address: r.address,
                        total_received: r.total_received,
                    })
                })
                .collect();
            to_json_binary(&AllRecipientsResponse {
                recipients: recipients?,
            })
        }
        QueryMsg::Balance {} => {
            // Balance is queried from bank module; return placeholder
            to_json_binary(&BalanceResponse {
                balance: Uint128::zero(),
            })
        }
        QueryMsg::PaymentHistory { employee_id } => {
            let payments: StdResult<Vec<PaymentRecord>> = PAYMENT_HISTORY
                .prefix(&employee_id)
                .range(deps.storage, None, None, Order::Descending)
                .take(50)
                .map(|item| {
                    let (_, p) = item?;
                    Ok(PaymentRecord {
                        employee_id: p.employee_id,
                        amount: p.amount,
                        memo: p.memo,
                        timestamp: p.timestamp,
                    })
                })
                .collect();
            to_json_binary(&PaymentHistoryResponse {
                payments: payments?,
            })
        }
    }
}
