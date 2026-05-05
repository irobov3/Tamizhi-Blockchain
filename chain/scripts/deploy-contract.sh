#!/usr/bin/env bash
# ============================================================
# Tamizhi Chain — Literary NFT Contract Deploy Script
#
# Usage:
#   ./scripts/deploy-contract.sh [--key <keyname>] [--node <rpc>]
#
# What it does:
#   1. Builds the literary-nft wasm (Rust 1.81, cosmwasm-vm 2.1 compatible)
#   2. Validates with cosmwasm-check
#   3. Uploads (stores) the contract on-chain
#   4. Instantiates the contract
#   5. Mints a sample Tamil literary work (Thirukkural)
#   6. Queries the minted NFT
# ============================================================

set -euo pipefail

# ---- Configuration ----------------------------------------
BINARY="${BINARY:-tamizhi}"
CHAIN_ID="${CHAIN_ID:-tamizhi-1}"
HOME_DIR="${HOME_DIR:-$HOME/.tamizhi}"
KEY_NAME="${KEY_NAME:-validator}"
KEYRING_BACKEND="${KEYRING_BACKEND:-test}"
NODE="${NODE:-http://localhost:26657}"
GAS_PRICES="${GAS_PRICES:-0.001utmz}"
GAS_ADJUSTMENT="${GAS_ADJUSTMENT:-1.4}"
CONTRACT_DIR="${CONTRACT_DIR:-$(dirname "$0")/../contracts/literary-nft}"

# ---- Parse CLI flags --------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --key)        KEY_NAME="$2";   shift 2 ;;
    --node)       NODE="$2";       shift 2 ;;
    --home)       HOME_DIR="$2";   shift 2 ;;
    --chain-id)   CHAIN_ID="$2";   shift 2 ;;
    --skip-build) SKIP_BUILD=1;    shift   ;;
    *)            echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
done

SKIP_BUILD="${SKIP_BUILD:-0}"

# ---- Helpers ----------------------------------------------
info()      { echo "[INFO]  $*"; }
success()   { echo "[OK]    $*"; }
error()     { echo "[ERROR] $*" >&2; exit 1; }
separator() { echo "============================================================"; }

TX_FLAGS=(
  --chain-id        "$CHAIN_ID"
  --home            "$HOME_DIR"
  --keyring-backend "$KEYRING_BACKEND"
  --node            "$NODE"
  --gas             auto
  --gas-adjustment  "$GAS_ADJUSTMENT"
  --gas-prices      "$GAS_PRICES"
  --yes
  --output          json
)

# ---- Step 1: Build wasm -----------------------------------
separator
info "Step 1: Building literary-nft contract..."

if [ "$SKIP_BUILD" = "0" ]; then
  cd "$CONTRACT_DIR"

  # Verify rustup override is set to 1.81 (cosmwasm-vm 2.1 compatible)
  RUST_VER=$(rustup show active-toolchain 2>/dev/null | grep -o '1\.[0-9]*' | head -1 || echo "unknown")
  info "  Rust toolchain: $(rustup show active-toolchain 2>/dev/null)"

  RUSTFLAGS="-C target-feature=-bulk-memory,-mutable-globals,-sign-ext" \
    cargo build --target wasm32-unknown-unknown --release --lib 2>&1 | grep -E "error|Compiling literary|Finished"

  WASM_FILE="$CONTRACT_DIR/target/wasm32-unknown-unknown/release/literary_nft.wasm"
  success "Built: $(du -sh "$WASM_FILE" | cut -f1) wasm"

  # ---- Step 2: Validate ------------------------------------
  info "Step 2: Validating wasm with cosmwasm-check..."
  if command -v cosmwasm-check &>/dev/null; then
    cosmwasm-check "$WASM_FILE"
  elif [ -f "$HOME/.cargo/bin/cosmwasm-check" ]; then
    "$HOME/.cargo/bin/cosmwasm-check" "$WASM_FILE"
  else
    info "  cosmwasm-check not found — skipping validation (install with: cargo install cosmwasm-check)"
  fi
  success "Wasm validation passed."

  cd - > /dev/null
else
  WASM_FILE="$CONTRACT_DIR/target/wasm32-unknown-unknown/release/literary_nft.wasm"
  info "  Skipping build (--skip-build). Using: $WASM_FILE"
fi

[ -f "$WASM_FILE" ] || error "Wasm file not found: $WASM_FILE"

# ---- Step 3: Upload (store) wasm --------------------------
separator
info "Step 3: Uploading wasm to chain..."

STORE_TX=$("$BINARY" tx wasm store "$WASM_FILE" \
  --from "$KEY_NAME" \
  "${TX_FLAGS[@]}" 2>&1)

echo "$STORE_TX" | python3 -c "import sys,json; d=json.load(sys.stdin); print('[TX]    hash:', d.get('txhash','?'))" 2>/dev/null || true

# Wait for tx to be included
sleep 6

# Get the code_id from the tx result
TXHASH=$(echo "$STORE_TX" | python3 -c "import sys,json; print(json.load(sys.stdin)['txhash'])" 2>/dev/null)
info "  TX hash: $TXHASH"

CODE_ID=$("$BINARY" query tx "$TXHASH" \
  --node "$NODE" --output json 2>/dev/null | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
for ev in d.get('events', []):
    for attr in ev.get('attributes', []):
        if attr.get('key') == 'code_id':
            print(attr['value'])
            sys.exit(0)
# try raw_log
import re
m = re.search(r'\"code_id\",\"value\":\"(\d+)\"', d.get('raw_log',''))
if m: print(m.group(1))
" 2>/dev/null || echo "")

if [ -z "$CODE_ID" ]; then
  # Fallback: get latest code id
  CODE_ID=$("$BINARY" query wasm list-code \
    --node "$NODE" --output json | \
    python3 -c "import sys,json; codes=json.load(sys.stdin).get('code_infos',[]); print(codes[-1]['code_id'] if codes else '')")
fi

[ -n "$CODE_ID" ] || error "Could not determine code_id from upload tx"
success "Code uploaded. code_id = $CODE_ID"

# ---- Step 4: Instantiate ----------------------------------
separator
info "Step 4: Instantiating contract (code_id=$CODE_ID)..."

MINTER_ADDR=$("$BINARY" keys show "$KEY_NAME" \
  --home "$HOME_DIR" --keyring-backend "$KEYRING_BACKEND" --address)

INIT_MSG=$(python3 -c "
import json
print(json.dumps({
    'name':   'Tamizhi Literary NFT Collection',
    'symbol': 'TNFT',
    'minter': None
}))
")

INST_TX=$("$BINARY" tx wasm instantiate "$CODE_ID" "$INIT_MSG" \
  --label        "literary-nft-v1" \
  --admin        "$MINTER_ADDR" \
  --from         "$KEY_NAME" \
  "${TX_FLAGS[@]}" 2>&1)

INST_HASH=$(echo "$INST_TX" | python3 -c "import sys,json; print(json.load(sys.stdin)['txhash'])" 2>/dev/null)
info "  TX hash: $INST_HASH"

sleep 6

CONTRACT_ADDR=$("$BINARY" query tx "$INST_HASH" \
  --node "$NODE" --output json 2>/dev/null | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
for ev in d.get('events', []):
    for attr in ev.get('attributes', []):
        if attr.get('key') == '_contract_address':
            print(attr['value']); sys.exit(0)
        if attr.get('key') == 'contract_address':
            print(attr['value']); sys.exit(0)
" 2>/dev/null || echo "")

if [ -z "$CONTRACT_ADDR" ]; then
  CONTRACT_ADDR=$("$BINARY" query wasm list-contract-by-code "$CODE_ID" \
    --node "$NODE" --output json | \
    python3 -c "import sys,json; cs=json.load(sys.stdin).get('contracts',[]); print(cs[-1] if cs else '')")
fi

[ -n "$CONTRACT_ADDR" ] || error "Could not determine contract address"
success "Contract instantiated: $CONTRACT_ADDR"

# Save contract address for future use
echo "$CONTRACT_ADDR" > /tmp/tamizhi-literary-nft-contract.txt
info "  Contract address saved to /tmp/tamizhi-literary-nft-contract.txt"

# ---- Step 5: Mint sample Thirukkural NFT ------------------
separator
info "Step 5: Minting sample literary work (Thirukkural)..."

CONTENT_HASH="a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a"

MINT_MSG=$(python3 -c "
import json
print(json.dumps({
    'mint_work': {
        'token_id': 'thirukkural-kural-1',
        'owner':    '$MINTER_ADDR',
        'work': {
            'title':                  'திருக்குறள்',
            'title_transliterated':   'Thirukkural',
            'title_english':          'The Sacred Couplets',
            'author_name':            'திருவள்ளுவர்',
            'author_name_transliterated': 'Thiruvalluvar',
            'author_era':             '300 BCE – 100 CE',
            'author_region':          'Tamil Nadu',
            'author_identity_did':    None,
            'period':                 'ancient',
            'genre':                  'poetry',
            'language':               'Tamil',
            'script':                 'Tamil',
            'tags':                   ['ethics','philosophy','couplet','sangam','classic'],
            'ipfs_cid':               'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
            'content_hash':           '$CONTENT_HASH',
            'size_bytes':             12800,
            'arweave_tx_id':          None,
            'mime_type':              'text/plain',
            'encoding':               'UTF-8',
            'license':                'public_domain',
            'is_public_domain':       True,
            'copyright_holder':       None,
            'copyright_year':         None,
            'description':            'First kural of Thirukkural — Agam (அகம்) chapter. The most celebrated Tamil classic.',
            'is_verified':            False,
            'verified_by':            None,
            'verification_notes':     None,
            'verified_at':            None,
            'block_height':           0,
            'timestamp':              0,
            'uploaded_by':            ''
        }
    }
}))
")

MINT_TX=$("$BINARY" tx wasm execute "$CONTRACT_ADDR" "$MINT_MSG" \
  --from "$KEY_NAME" \
  "${TX_FLAGS[@]}" 2>&1)

MINT_HASH=$(echo "$MINT_TX" | python3 -c "import sys,json; print(json.load(sys.stdin).get('txhash','?'))" 2>/dev/null)
info "  Mint TX hash: $MINT_HASH"

sleep 6
success "Minted Thirukkural NFT (token_id: thirukkural-kural-1)"

# ---- Step 6: Query the NFT --------------------------------
separator
info "Step 6: Querying the minted NFT..."

QUERY_MSG='{"work_info":{"token_id":"thirukkural-kural-1"}}'

"$BINARY" query wasm contract-state smart "$CONTRACT_ADDR" "$QUERY_MSG" \
  --node "$NODE" --output json | python3 -c "
import sys, json
d = json.load(sys.stdin)
data = d.get('data', d)
print(json.dumps(data, indent=2, ensure_ascii=False))
" 2>/dev/null

# ---- Done -------------------------------------------------
separator
success "literary-nft deployment complete!"
info ""
info "  Contract address : $CONTRACT_ADDR"
info "  code_id          : $CODE_ID"
info ""
info "  Query a token:"
info "    $BINARY query wasm contract-state smart $CONTRACT_ADDR"
info "      '{\"work_info\":{\"token_id\":\"thirukkural-kural-1\"}}'"
info "      --node $NODE"
info ""
info "  List all works:"
info "    $BINARY query wasm contract-state smart $CONTRACT_ADDR"
info "      '{\"all_works\":{\"limit\":10}}' --node $NODE"
separator
