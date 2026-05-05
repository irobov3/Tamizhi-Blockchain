use cosmwasm_std::{
    entry_point, to_json_binary, BankMsg, Binary, Deps, DepsMut, Env, MessageInfo, Response,
    StdResult,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::*;
use crate::state::*;

const CONTRACT_NAME: &str = "crates.io:tamizhi-literary-nft";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    let admin = deps.api.addr_validate(&msg.admin)?;
    CONFIG.save(
        deps.storage,
        &Config {
            admin,
            mint_fee: msg.mint_fee,
            max_per_work: msg.max_per_work,
        },
    )?;
    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("admin", msg.admin))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::MintNFT { work_id, token_id, owner, metadata_uri } => {
            execute_mint(deps, env, info, work_id, token_id, owner, metadata_uri)
        }
        ExecuteMsg::TransferNFT { token_id, recipient } => {
            execute_transfer(deps, info, token_id, recipient)
        }
        ExecuteMsg::BurnNFT { token_id } => execute_burn(deps, info, token_id),
        ExecuteMsg::UpdateMintFee { new_fee } => execute_update_mint_fee(deps, info, new_fee),
        ExecuteMsg::UpdateMaxPerWork { new_max } => {
            execute_update_max_per_work(deps, info, new_max)
        }
    }
}

fn execute_mint(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    work_id: String,
    token_id: String,
    owner: String,
    metadata_uri: String,
) -> Result<Response, ContractError> {
    if work_id.is_empty() {
        return Err(ContractError::EmptyWorkId {});
    }
    if token_id.is_empty() {
        return Err(ContractError::EmptyTokenId {});
    }

    let config = CONFIG.load(deps.storage)?;

    // Check mint fee
    if config.mint_fee > 0 {
        let sent = info
            .funds
            .iter()
            .find(|c| c.denom == "utmz")
            .map(|c| c.amount.u128())
            .unwrap_or(0);
        if sent < config.mint_fee {
            return Err(ContractError::InsufficientMintFee {
                required: config.mint_fee,
                sent,
            });
        }
    }

    // Check max per work
    if config.max_per_work > 0 {
        let count = MINT_COUNT.may_load(deps.storage, &work_id)?.unwrap_or(0);
        if count >= config.max_per_work {
            return Err(ContractError::MaxPerWorkReached {
                max: config.max_per_work,
            });
        }
    }

    // Check token doesn't already exist
    if TOKENS.may_load(deps.storage, &token_id)?.is_some() {
        return Err(ContractError::TokenExists {
            token_id,
        });
    }

    let owner_addr = deps.api.addr_validate(&owner)?;

    // Store token
    let token = NftToken {
        token_id: token_id.clone(),
        work_id: work_id.clone(),
        owner: owner_addr.clone(),
        metadata_uri: metadata_uri.clone(),
        minted_at: env.block.time.seconds(),
    };
    TOKENS.save(deps.storage, &token_id, &token)?;

    // Update work_tokens index
    let mut work_tokens = WORK_TOKENS
        .may_load(deps.storage, &work_id)?
        .unwrap_or_default();
    work_tokens.push(token_id.clone());
    WORK_TOKENS.save(deps.storage, &work_id, &work_tokens)?;

    // Update owner_tokens index
    let owner_key = owner_addr.as_str();
    let mut owner_tokens = OWNER_TOKENS
        .may_load(deps.storage, owner_key)?
        .unwrap_or_default();
    owner_tokens.push(token_id.clone());
    OWNER_TOKENS.save(deps.storage, owner_key, &owner_tokens)?;

    // Update mint count
    let count = MINT_COUNT.may_load(deps.storage, &work_id)?.unwrap_or(0);
    MINT_COUNT.save(deps.storage, &work_id, &(count + 1))?;

    // If mint fee collected, send to admin
    let mut msgs = vec![];
    if config.mint_fee > 0 {
        let sent = info.funds.iter().find(|c| c.denom == "utmz").cloned();
        if let Some(fee_coin) = sent {
            msgs.push(cosmwasm_std::CosmosMsg::Bank(BankMsg::Send {
                to_address: config.admin.to_string(),
                amount: vec![fee_coin],
            }));
        }
    }

    Ok(Response::new()
        .add_messages(msgs)
        .add_attribute("action", "mint_nft")
        .add_attribute("token_id", token_id)
        .add_attribute("work_id", work_id)
        .add_attribute("owner", owner))
}

fn execute_transfer(
    deps: DepsMut,
    info: MessageInfo,
    token_id: String,
    recipient: String,
) -> Result<Response, ContractError> {
    let mut token = TOKENS
        .load(deps.storage, &token_id)
        .map_err(|_| ContractError::TokenNotFound { token_id: token_id.clone() })?;

    if token.owner != info.sender {
        return Err(ContractError::Unauthorized {});
    }

    let new_owner = deps.api.addr_validate(&recipient)?;

    // Remove from old owner index
    let old_key = token.owner.as_str();
    let mut old_tokens = OWNER_TOKENS
        .may_load(deps.storage, old_key)?
        .unwrap_or_default();
    old_tokens.retain(|t| t != &token_id);
    OWNER_TOKENS.save(deps.storage, old_key, &old_tokens)?;

    // Add to new owner index
    let new_key = new_owner.as_str();
    let mut new_tokens = OWNER_TOKENS
        .may_load(deps.storage, new_key)?
        .unwrap_or_default();
    new_tokens.push(token_id.clone());
    OWNER_TOKENS.save(deps.storage, new_key, &new_tokens)?;

    token.owner = new_owner.clone();
    TOKENS.save(deps.storage, &token_id, &token)?;

    Ok(Response::new()
        .add_attribute("action", "transfer_nft")
        .add_attribute("token_id", token_id)
        .add_attribute("recipient", recipient))
}

fn execute_burn(
    deps: DepsMut,
    info: MessageInfo,
    token_id: String,
) -> Result<Response, ContractError> {
    let token = TOKENS
        .load(deps.storage, &token_id)
        .map_err(|_| ContractError::TokenNotFound { token_id: token_id.clone() })?;
    if token.owner != info.sender {
        return Err(ContractError::Unauthorized {});
    }

    TOKENS.remove(deps.storage, &token_id);

    let mut work_tokens = WORK_TOKENS
        .may_load(deps.storage, &token.work_id)?
        .unwrap_or_default();
    work_tokens.retain(|t| t != &token_id);
    WORK_TOKENS.save(deps.storage, &token.work_id, &work_tokens)?;

    let owner_key = token.owner.as_str();
    let mut owner_tokens = OWNER_TOKENS
        .may_load(deps.storage, owner_key)?
        .unwrap_or_default();
    owner_tokens.retain(|t| t != &token_id);
    OWNER_TOKENS.save(deps.storage, owner_key, &owner_tokens)?;

    Ok(Response::new()
        .add_attribute("action", "burn_nft")
        .add_attribute("token_id", token_id))
}

fn execute_update_mint_fee(
    deps: DepsMut,
    info: MessageInfo,
    new_fee: u128,
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;
    if info.sender != config.admin {
        return Err(ContractError::Unauthorized {});
    }
    config.mint_fee = new_fee;
    CONFIG.save(deps.storage, &config)?;
    Ok(Response::new()
        .add_attribute("action", "update_mint_fee")
        .add_attribute("new_fee", new_fee.to_string()))
}

fn execute_update_max_per_work(
    deps: DepsMut,
    info: MessageInfo,
    new_max: u64,
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;
    if info.sender != config.admin {
        return Err(ContractError::Unauthorized {});
    }
    config.max_per_work = new_max;
    CONFIG.save(deps.storage, &config)?;
    Ok(Response::new().add_attribute("action", "update_max_per_work"))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::NftInfo { token_id } => {
            let t = TOKENS.load(deps.storage, &token_id)?;
            to_json_binary(&NftInfoResponse {
                token_id: t.token_id,
                work_id: t.work_id,
                owner: t.owner.to_string(),
                metadata_uri: t.metadata_uri,
                minted_at: t.minted_at,
            })
        }
        QueryMsg::Owner { token_id } => {
            let t = TOKENS.load(deps.storage, &token_id)?;
            to_json_binary(&OwnerResponse {
                owner: t.owner.to_string(),
            })
        }
        QueryMsg::TokensByWork { work_id } => {
            let tokens = WORK_TOKENS
                .may_load(deps.storage, &work_id)?
                .unwrap_or_default();
            to_json_binary(&TokensResponse { tokens })
        }
        QueryMsg::TokensByOwner { owner } => {
            let addr = deps.api.addr_validate(&owner)?;
            let tokens = OWNER_TOKENS
                .may_load(deps.storage, addr.as_str())?
                .unwrap_or_default();
            to_json_binary(&TokensResponse { tokens })
        }
        QueryMsg::Config {} => {
            let c = CONFIG.load(deps.storage)?;
            to_json_binary(&ConfigResponse {
                admin: c.admin.to_string(),
                mint_fee: c.mint_fee,
                max_per_work: c.max_per_work,
            })
        }
        QueryMsg::MintCount { work_id } => {
            let count = MINT_COUNT
                .may_load(deps.storage, &work_id)?
                .unwrap_or(0);
            to_json_binary(&MintCountResponse { count })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::{coins, from_json, Uint128};

    const ADMIN: &str = "cosmos1admin000000000000000000000000000000001";
    const USER1: &str = "cosmos1user1000000000000000000000000000000001";
    const USER2: &str = "cosmos1user2000000000000000000000000000000001";

    fn do_instantiate(deps: DepsMut, mint_fee: u128, max_per_work: u64) {
        let msg = InstantiateMsg {
            admin: ADMIN.to_string(),
            mint_fee,
            max_per_work,
        };
        let info = mock_info(ADMIN, &[]);
        instantiate(deps, mock_env(), info, msg).unwrap();
    }

    fn do_mint(
        deps: DepsMut,
        sender: &str,
        work_id: &str,
        token_id: &str,
        owner: &str,
        funds: &[cosmwasm_std::Coin],
    ) -> Result<Response, ContractError> {
        let msg = ExecuteMsg::MintNFT {
            work_id: work_id.to_string(),
            token_id: token_id.to_string(),
            owner: owner.to_string(),
            metadata_uri: format!("ipfs://meta/{token_id}"),
        };
        let info = mock_info(sender, funds);
        execute(deps, mock_env(), info, msg)
    }

    #[test]
    fn test_instantiate() {
        let mut deps = mock_dependencies();
        do_instantiate(deps.as_mut(), 0, 0);

        let res: ConfigResponse =
            from_json(query(deps.as_ref(), mock_env(), QueryMsg::Config {}).unwrap()).unwrap();
        assert_eq!(res.admin, ADMIN);
        assert_eq!(res.mint_fee, 0);
        assert_eq!(res.max_per_work, 0);
    }

    #[test]
    fn test_mint_nft() {
        let mut deps = mock_dependencies();
        do_instantiate(deps.as_mut(), 0, 0);

        do_mint(deps.as_mut(), USER1, "thirukkural-001", "tkl-001-0001", USER1, &[]).unwrap();

        // query by work
        let res: TokensResponse = from_json(
            query(
                deps.as_ref(),
                mock_env(),
                QueryMsg::TokensByWork { work_id: "thirukkural-001".to_string() },
            )
            .unwrap(),
        )
        .unwrap();
        assert_eq!(res.tokens, vec!["tkl-001-0001".to_string()]);

        // query by owner
        let res: TokensResponse = from_json(
            query(
                deps.as_ref(),
                mock_env(),
                QueryMsg::TokensByOwner { owner: USER1.to_string() },
            )
            .unwrap(),
        )
        .unwrap();
        assert_eq!(res.tokens, vec!["tkl-001-0001".to_string()]);

        // query nft info
        let info_res: NftInfoResponse = from_json(
            query(
                deps.as_ref(),
                mock_env(),
                QueryMsg::NftInfo { token_id: "tkl-001-0001".to_string() },
            )
            .unwrap(),
        )
        .unwrap();
        assert_eq!(info_res.work_id, "thirukkural-001");
        assert_eq!(info_res.owner, USER1);
    }

    #[test]
    fn test_mint_duplicate_fails() {
        let mut deps = mock_dependencies();
        do_instantiate(deps.as_mut(), 0, 0);

        do_mint(deps.as_mut(), USER1, "thirukkural-001", "tkl-001-0001", USER1, &[]).unwrap();

        let err =
            do_mint(deps.as_mut(), USER1, "thirukkural-001", "tkl-001-0001", USER1, &[]).unwrap_err();
        assert!(matches!(err, ContractError::TokenExists { .. }));
    }

    #[test]
    fn test_max_per_work() {
        let mut deps = mock_dependencies();
        do_instantiate(deps.as_mut(), 0, 2); // max 2 per work

        do_mint(deps.as_mut(), USER1, "work-001", "work-001-0001", USER1, &[]).unwrap();
        do_mint(deps.as_mut(), USER1, "work-001", "work-001-0002", USER1, &[]).unwrap();

        let err =
            do_mint(deps.as_mut(), USER1, "work-001", "work-001-0003", USER1, &[]).unwrap_err();
        assert!(matches!(err, ContractError::MaxPerWorkReached { max: 2 }));
    }

    #[test]
    fn test_mint_fee_required() {
        let mut deps = mock_dependencies();
        do_instantiate(deps.as_mut(), 1_000_000, 0); // 1 TMZ fee

        // Mint without fee — should fail
        let err =
            do_mint(deps.as_mut(), USER1, "work-001", "work-001-0001", USER1, &[]).unwrap_err();
        assert!(matches!(err, ContractError::InsufficientMintFee { .. }));

        // Mint with fee — should succeed
        do_mint(
            deps.as_mut(),
            USER1,
            "work-001",
            "work-001-0001",
            USER1,
            &coins(1_000_000, "utmz"),
        )
        .unwrap();
    }

    #[test]
    fn test_transfer_nft() {
        let mut deps = mock_dependencies();
        do_instantiate(deps.as_mut(), 0, 0);

        do_mint(deps.as_mut(), USER1, "work-001", "work-001-0001", USER1, &[]).unwrap();

        // Transfer from USER1 to USER2
        let msg = ExecuteMsg::TransferNFT {
            token_id: "work-001-0001".to_string(),
            recipient: USER2.to_string(),
        };
        let info = mock_info(USER1, &[]);
        execute(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Check new owner
        let res: OwnerResponse = from_json(
            query(
                deps.as_ref(),
                mock_env(),
                QueryMsg::Owner { token_id: "work-001-0001".to_string() },
            )
            .unwrap(),
        )
        .unwrap();
        assert_eq!(res.owner, USER2);

        // USER1 should have no tokens; USER2 should have the token
        let user1_tokens: TokensResponse = from_json(
            query(
                deps.as_ref(),
                mock_env(),
                QueryMsg::TokensByOwner { owner: USER1.to_string() },
            )
            .unwrap(),
        )
        .unwrap();
        assert!(user1_tokens.tokens.is_empty());

        let user2_tokens: TokensResponse = from_json(
            query(
                deps.as_ref(),
                mock_env(),
                QueryMsg::TokensByOwner { owner: USER2.to_string() },
            )
            .unwrap(),
        )
        .unwrap();
        assert_eq!(user2_tokens.tokens, vec!["work-001-0001".to_string()]);
    }

    #[test]
    fn test_transfer_unauthorized() {
        let mut deps = mock_dependencies();
        do_instantiate(deps.as_mut(), 0, 0);

        do_mint(deps.as_mut(), USER1, "work-001", "work-001-0001", USER1, &[]).unwrap();

        // USER2 attempts to transfer USER1's token
        let msg = ExecuteMsg::TransferNFT {
            token_id: "work-001-0001".to_string(),
            recipient: USER2.to_string(),
        };
        let info = mock_info(USER2, &[]);
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();
        assert!(matches!(err, ContractError::Unauthorized {}));
    }

    #[test]
    fn test_burn_nft() {
        let mut deps = mock_dependencies();
        do_instantiate(deps.as_mut(), 0, 0);

        do_mint(deps.as_mut(), USER1, "work-001", "work-001-0001", USER1, &[]).unwrap();

        // Burn the token
        let msg = ExecuteMsg::BurnNFT { token_id: "work-001-0001".to_string() };
        let info = mock_info(USER1, &[]);
        execute(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Token should be gone — NftInfo should fail
        let err =
            query(deps.as_ref(), mock_env(), QueryMsg::NftInfo { token_id: "work-001-0001".to_string() })
                .unwrap_err();
        // Expect a not-found StdError
        assert!(err.to_string().contains("not found") || err.to_string().contains("work-001-0001"));

        // work_tokens index should be empty
        let res: TokensResponse = from_json(
            query(
                deps.as_ref(),
                mock_env(),
                QueryMsg::TokensByWork { work_id: "work-001".to_string() },
            )
            .unwrap(),
        )
        .unwrap();
        assert!(res.tokens.is_empty());

        // owner_tokens index should be empty
        let res: TokensResponse = from_json(
            query(
                deps.as_ref(),
                mock_env(),
                QueryMsg::TokensByOwner { owner: USER1.to_string() },
            )
            .unwrap(),
        )
        .unwrap();
        assert!(res.tokens.is_empty());
    }

    #[test]
    fn test_burn_unauthorized() {
        let mut deps = mock_dependencies();
        do_instantiate(deps.as_mut(), 0, 0);

        do_mint(deps.as_mut(), USER1, "work-001", "work-001-0001", USER1, &[]).unwrap();

        // USER2 attempts to burn USER1's token
        let msg = ExecuteMsg::BurnNFT { token_id: "work-001-0001".to_string() };
        let info = mock_info(USER2, &[]);
        let err = execute(deps.as_mut(), mock_env(), info, msg).unwrap_err();
        assert!(matches!(err, ContractError::Unauthorized {}));
    }
}
