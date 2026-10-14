#!/usr/bin/env bash
# Creates a fresh testnet-1 genesis file with proper configuration.
# Run this once to generate the initial genesis for the testnet.
#
# Usage:
#   ./create-testnet-genesis.sh
#   BINARY=/custom/path/tamizhi ./create-testnet-genesis.sh
#
# Prerequisites:
#   - tamizhi binary installed and on PATH (or set BINARY env var)
#   - python3 available
#   - jq (optional, for pretty-printing)
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHAIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BINARY="${BINARY:-tamizhi}"
if ! command -v "$BINARY" &>/dev/null; then
  if [ -f "$CHAIN_DIR/build/tamizhi" ]; then
    BINARY="$CHAIN_DIR/build/tamizhi"
  elif [ -f "$CHAIN_DIR/tamizhi" ]; then
    BINARY="$CHAIN_DIR/tamizhi"
  fi
fi
CHAIN_ID="tamizhi-testnet-1"
DENOM="utmz"
HOME_DIR="$(mktemp -d -t tamizhi-genesis-XXXXXX)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENESIS_OUT_DIR="${SCRIPT_DIR}/../genesis/testnet-1"

# Total supply: 1,000,000,000 TMZ = 1_000_000_000_000_000 utmz
TOTAL_SUPPLY="1000000000000000"

# Allocation breakdown (utmz)
COMMUNITY_AMOUNT="400000000000000"   # 40%
TEAM_AMOUNT="250000000000000"        # 25%
ECOSYSTEM_AMOUNT="200000000000000"   # 20%
PUBLICSALE_AMOUNT="100000000000000"  # 10%
VALIDATORS_AMOUNT="50000000000000"   # 5%

# Vesting schedule for team (unix timestamps)
# Cliff: 2027-06-01 = 1875398400
# End:   2030-06-01 = 1906934400
VEST_START="1875398400"
VEST_END="1906934400"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { echo "[$(date -u '+%H:%M:%S')] $*"; }
die()  { echo "ERROR: $*" >&2; exit 1; }
need() { command -v "$1" &>/dev/null || die "Required command not found: $1"; }

need "$BINARY"
need python3

log "=== Creating Tamizhi Testnet-1 Genesis ==="
log "Binary  : $BINARY ($(${BINARY} version 2>/dev/null || echo 'version unknown'))"
log "Chain   : $CHAIN_ID"
log "Home    : $HOME_DIR"
log "Output  : $GENESIS_OUT_DIR"

# ---------------------------------------------------------------------------
# Step 1: Init chain home
# ---------------------------------------------------------------------------
log "Step 1/7 — Initialising chain home..."
"$BINARY" init "genesis-node" \
  --chain-id "$CHAIN_ID" \
  --home "$HOME_DIR" \
  --default-denom "$DENOM" \
  2>/dev/null

GENESIS="$HOME_DIR/config/genesis.json"

# ---------------------------------------------------------------------------
# Step 2: Patch parameters via Python
# ---------------------------------------------------------------------------
log "Step 2/7 — Patching genesis parameters..."

python3 - "$GENESIS" <<'PYEOF'
import json
import sys

genesis_path = sys.argv[1]

with open(genesis_path) as f:
    g = json.load(f)

app = g.setdefault("app_state", {})

# ── Auth ──────────────────────────────────────────────────────────────────
auth_params = app.setdefault("auth", {}).setdefault("params", {})
auth_params.update({
    "max_memo_characters":     "256",
    "tx_sig_limit":            "7",
    "tx_size_cost_per_byte":   "10",
    "sig_verify_cost_ed25519": "590",
    "sig_verify_cost_secp256k1": "1000",
})

# ── Bank ──────────────────────────────────────────────────────────────────
bank = app.setdefault("bank", {})
bank.setdefault("params", {})["default_send_enabled"] = True
bank["denom_metadata"] = [{
    "description": "The native staking and governance token of the Tamizhi blockchain",
    "denom_units": [
        {"denom": "utmz",  "exponent": 0, "aliases": ["microtamizhi"]},
        {"denom": "mtmz",  "exponent": 3, "aliases": ["millitamizhi"]},
        {"denom": "tmz",   "exponent": 6, "aliases": ["tamizhi"]},
    ],
    "base": "utmz",
    "display": "tmz",
    "name": "Tamizhi",
    "symbol": "TMZ",
    "uri": "",
    "uri_hash": "",
}]

# ── Staking ───────────────────────────────────────────────────────────────
staking_params = app.setdefault("staking", {}).setdefault("params", {})
staking_params.update({
    "unbonding_time":      "1814400s",
    "max_validators":      100,
    "max_entries":         7,
    "historical_entries":  10000,
    "bond_denom":          "utmz",
    "min_commission_rate": "0.050000000000000000",
})

# ── Gov ───────────────────────────────────────────────────────────────────
gov_params = app.setdefault("gov", {}).setdefault("params", {})
gov_params.update({
    "min_deposit":                    [{"denom": "utmz", "amount": "10000000"}],
    "max_deposit_period":             "172800s",
    "voting_period":                  "172800s",
    "quorum":                         "0.334000000000000000",
    "threshold":                      "0.500000000000000000",
    "veto_threshold":                 "0.334000000000000000",
    "min_initial_deposit_ratio":      "0.200000000000000000",
    "expedited_voting_period":        "86400s",
    "expedited_threshold":            "0.667000000000000000",
    "expedited_min_deposit":          [{"denom": "utmz", "amount": "50000000"}],
    "burn_vote_quorum":               False,
    "burn_proposal_deposit_prevote":  False,
    "burn_vote_veto":                 True,
})

# ── Mint ──────────────────────────────────────────────────────────────────
app.setdefault("mint", {}).setdefault("minter", {}).update({
    "inflation":          "0.130000000000000000",
    "annual_provisions":  "0.000000000000000000",
})
mint_params = app["mint"].setdefault("params", {})
mint_params.update({
    "mint_denom":           "utmz",
    "inflation_rate_change":"0.130000000000000000",
    "inflation_max":        "0.200000000000000000",
    "inflation_min":        "0.070000000000000000",
    "goal_bonded":          "0.670000000000000000",
    "blocks_per_year":      "6311520",
})

# ── Slashing ──────────────────────────────────────────────────────────────
slashing_params = app.setdefault("slashing", {}).setdefault("params", {})
slashing_params.update({
    "signed_blocks_window":      "2000",
    "min_signed_per_window":     "0.500000000000000000",
    "downtime_jail_duration":    "600s",
    "slash_fraction_double_sign":"0.050000000000000000",
    "slash_fraction_downtime":   "0.000100000000000000",
})

# ── Crisis ────────────────────────────────────────────────────────────────
app.setdefault("crisis", {})["constant_fee"] = {
    "denom": "utmz", "amount": "1000000000"
}

# ── CosmWasm ──────────────────────────────────────────────────────────────
wasm_params = app.setdefault("wasm", {}).setdefault("params", {})
wasm_params.update({
    "code_upload_access":           {"permission": "Everybody", "addresses": []},
    "instantiate_default_permission":"Everybody",
})

# ── Tamizhi custom modules (empty fresh state) ────────────────────────────
app["nodes"]     = {"nodes": [], "swarms": []}
app["security"]  = {"threat_flags": [], "security_events": []}
app["accesslog"] = {"logs": []}
app["rewards"]   = {"rules": [], "records": []}
app["messaging"] = {"session_ids": [], "groups": []}
app["identity"]  = {}
app["literature"]= {}
app["nft"]       = {"nfts": []}

with open(genesis_path, "w") as f:
    json.dump(g, f, indent=2)

print("  Parameters patched successfully.")
PYEOF

# ---------------------------------------------------------------------------
# Step 3: Add genesis accounts
# ---------------------------------------------------------------------------
log "Step 3/7 — Adding genesis accounts..."

# Each of these commands requires a real bech32 address with a valid checksum.
# Replace with real addresses generated by `tamizhi keys add`.
#
# Example (do not use these on mainnet):
#   COMMUNITY_ADDR=$(tamizhi keys show community-pool -a --home $HOME_DIR)
#
# For now we accept addresses as environment variables so this script
# can be driven by CI with pre-generated keys.

COMMUNITY_ADDR="${COMMUNITY_ADDR:-}"
TEAM_ADDR="${TEAM_ADDR:-}"
ECOSYSTEM_ADDR="${ECOSYSTEM_ADDR:-}"
PUBLICSALE_ADDR="${PUBLICSALE_ADDR:-}"
VALIDATORS_ADDR="${VALIDATORS_ADDR:-}"

if [[ -z "$COMMUNITY_ADDR" ]]; then
  log "  NOTE: COMMUNITY_ADDR not set — generating ephemeral key (testnet only)"
  "$BINARY" keys add community-pool --home "$HOME_DIR" --keyring-backend test 2>/dev/null
  COMMUNITY_ADDR=$("$BINARY" keys show community-pool -a --home "$HOME_DIR" --keyring-backend test)

  "$BINARY" keys add core-team      --home "$HOME_DIR" --keyring-backend test 2>/dev/null
  TEAM_ADDR=$("$BINARY" keys show core-team -a --home "$HOME_DIR" --keyring-backend test)

  "$BINARY" keys add ecosystem      --home "$HOME_DIR" --keyring-backend test 2>/dev/null
  ECOSYSTEM_ADDR=$("$BINARY" keys show ecosystem -a --home "$HOME_DIR" --keyring-backend test)

  "$BINARY" keys add public-sale    --home "$HOME_DIR" --keyring-backend test 2>/dev/null
  PUBLICSALE_ADDR=$("$BINARY" keys show public-sale -a --home "$HOME_DIR" --keyring-backend test)

  "$BINARY" keys add validators     --home "$HOME_DIR" --keyring-backend test 2>/dev/null
  VALIDATORS_ADDR=$("$BINARY" keys show validators -a --home "$HOME_DIR" --keyring-backend test)
fi

log "  Community pool : $COMMUNITY_ADDR ($COMMUNITY_AMOUNT $DENOM)"
log "  Core team      : $TEAM_ADDR ($TEAM_AMOUNT $DENOM — vesting)"
log "  Ecosystem      : $ECOSYSTEM_ADDR ($ECOSYSTEM_AMOUNT $DENOM)"
log "  Public sale    : $PUBLICSALE_ADDR ($PUBLICSALE_AMOUNT $DENOM)"
log "  Validators     : $VALIDATORS_ADDR ($VALIDATORS_AMOUNT $DENOM)"

"$BINARY" genesis add-genesis-account "$COMMUNITY_ADDR" "${COMMUNITY_AMOUNT}${DENOM}" \
  --home "$HOME_DIR" --keyring-backend test

# Team account uses continuous vesting with 1-year cliff
"$BINARY" genesis add-genesis-account "$TEAM_ADDR" "${TEAM_AMOUNT}${DENOM}" \
  --vesting-amount "${TEAM_AMOUNT}${DENOM}" \
  --vesting-start-time "$VEST_START" \
  --vesting-end-time "$VEST_END" \
  --home "$HOME_DIR" --keyring-backend test

"$BINARY" genesis add-genesis-account "$ECOSYSTEM_ADDR" "${ECOSYSTEM_AMOUNT}${DENOM}" \
  --home "$HOME_DIR" --keyring-backend test

"$BINARY" genesis add-genesis-account "$PUBLICSALE_ADDR" "${PUBLICSALE_AMOUNT}${DENOM}" \
  --home "$HOME_DIR" --keyring-backend test

"$BINARY" genesis add-genesis-account "$VALIDATORS_ADDR" "${VALIDATORS_AMOUNT}${DENOM}" \
  --home "$HOME_DIR" --keyring-backend test

# ---------------------------------------------------------------------------
# Step 4: Create genesis validator key and gentx
# ---------------------------------------------------------------------------
log "Step 4/7 — Creating genesis validator..."

"$BINARY" keys add genesis-validator --home "$HOME_DIR" --keyring-backend test 2>/dev/null
VALIDATOR_ADDR=$("$BINARY" keys show genesis-validator -a --home "$HOME_DIR" --keyring-backend test)

# Fund genesis validator from validators pool — in practice this would be
# a separate funded address; here we add a separate account for simplicity.
"$BINARY" genesis add-genesis-account genesis-validator \
  15000000000"${DENOM}" \
  --home "$HOME_DIR" \
  --keyring-backend test

"$BINARY" genesis gentx genesis-validator 15000000000"${DENOM}" \
  --chain-id "$CHAIN_ID" \
  --moniker "genesis-validator" \
  --commission-rate "0.10" \
  --commission-max-rate "0.20" \
  --commission-max-change-rate "0.01" \
  --min-self-delegation "15000000000" \
  --home "$HOME_DIR" \
  --keyring-backend test \
  2>/dev/null

log "  Genesis validator address: $VALIDATOR_ADDR"

# ---------------------------------------------------------------------------
# Step 5: Collect gentxs
# ---------------------------------------------------------------------------
log "Step 5/7 — Collecting gentxs..."
"$BINARY" genesis collect-gentxs --home "$HOME_DIR" 2>/dev/null

# ---------------------------------------------------------------------------
# Step 6: Validate genesis
# ---------------------------------------------------------------------------
log "Step 6/7 — Validating genesis..."
"$BINARY" genesis validate "$GENESIS" \
  && log "  Genesis is valid." \
  || die "Genesis validation failed. Check $GENESIS for errors."

# ---------------------------------------------------------------------------
# Step 7: Copy to output directory
# ---------------------------------------------------------------------------
log "Step 7/7 — Copying genesis to output..."
mkdir -p "$GENESIS_OUT_DIR"
cp "$GENESIS" "$GENESIS_OUT_DIR/genesis.json"

GENESIS_HASH=$(sha256sum "$GENESIS_OUT_DIR/genesis.json" | awk '{print $1}')

log ""
log "==================================================================="
log "  Genesis created successfully!"
log "==================================================================="
log "  Output  : $GENESIS_OUT_DIR/genesis.json"
log "  SHA-256 : $GENESIS_HASH"
log "  Tmp dir : $HOME_DIR"
log ""
log "  Key addresses:"
log "    Community pool : $COMMUNITY_ADDR"
log "    Core team      : $TEAM_ADDR"
log "    Ecosystem      : $ECOSYSTEM_ADDR"
log "    Public sale    : $PUBLICSALE_ADDR"
log "    Validators     : $VALIDATORS_ADDR"
log ""
log "=== Next Steps ==="
log ""
log "1. Distribute keys to respective wallet holders:"
log "   Keys are in: $HOME_DIR/keyring-test/"
log ""
log "2. Additional validators submit their gentxs before genesis time:"
log "   tamizhi genesis gentx <key> 15000000000utmz \\"
log "     --chain-id $CHAIN_ID \\"
log "     --commission-rate '0.10' \\"
log "     --min-self-delegation '15000000000'"
log ""
log "3. Collect all additional gentxs and re-validate:"
log "   Copy gentx JSON files to $HOME_DIR/config/gentx/"
log "   tamizhi genesis collect-gentxs --home $HOME_DIR"
log "   tamizhi genesis validate --home $HOME_DIR"
log ""
log "4. Publish the final genesis.json and its SHA-256 hash to all validators."
log ""
log "5. Genesis time: 2026-06-01T00:00:00Z"
log "   All nodes must be running and synced before this time."
log "==================================================================="
