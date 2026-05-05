#!/usr/bin/env bash
set -euo pipefail

# Tamizhi 3-of-5 Multisig Key Ceremony Script
# Run this OFFLINE on an air-gapped machine.
# Each participant runs this on their own machine, exports their pubkey,
# then one coordinator assembles the multisig.

BINARY=${BINARY:-tamizhi}
CHAIN_ID=${CHAIN_ID:-tamizhi-testnet-1}
KEYRING=${KEYRING:-file}

print_step() { echo ""; echo "══════════════════════════════════════"; echo "STEP $1: $2"; echo "══════════════════════════════════════"; }

case "${1:-}" in
  generate-participant)
    # Run by each of the 5 participants individually
    NAME="${2:-participant}"
    print_step 1 "Generate participant key: $NAME"
    $BINARY keys add "$NAME" --keyring-backend "$KEYRING" --output json | tee "${NAME}_key.json"
    echo ""
    echo "Public key (share this with the coordinator):"
    $BINARY keys show "$NAME" --keyring-backend "$KEYRING" --pubkey
    echo ""
    echo "WARNING: Back up your mnemonic securely. Never share it."
    ;;

  assemble-multisig)
    # Run by the coordinator after collecting all 5 pubkeys
    print_step 2 "Assemble 3-of-5 multisig"
    echo "Importing participant pubkeys..."

    # Each pubkey JSON file is imported first:
    # tamizhi keys add participant1 --pubkey '<pubkey-json>' --keyring-backend file

    $BINARY keys add tamizhi-admin \
      --multisig "participant1,participant2,participant3,participant4,participant5" \
      --multisig-threshold 3 \
      --keyring-backend "$KEYRING" \
      --output json | tee multisig_key.json

    echo ""
    echo "Multisig address:"
    $BINARY keys show tamizhi-admin --keyring-backend "$KEYRING" --address
    ;;

  sign-tx)
    # Each signer signs a pre-built unsigned tx
    SIGNER="${2:-participant}"
    UNSIGNED_TX="${3:-unsigned_tx.json}"
    print_step 3 "Sign transaction as $SIGNER"
    $BINARY tx sign "$UNSIGNED_TX" \
      --from "$SIGNER" \
      --multisig tamizhi-admin \
      --chain-id "$CHAIN_ID" \
      --keyring-backend "$KEYRING" \
      --output-document "${SIGNER}_signature.json"
    echo "Signature saved to ${SIGNER}_signature.json"
    ;;

  combine-and-broadcast)
    # Coordinator combines 3+ signatures and broadcasts
    print_step 4 "Combine signatures and broadcast"
    UNSIGNED_TX="${2:-unsigned_tx.json}"
    shift 2
    SIGS=("$@")  # e.g. participant1_signature.json participant2_signature.json participant3_signature.json

    $BINARY tx multisign "$UNSIGNED_TX" tamizhi-admin "${SIGS[@]}" \
      --keyring-backend "$KEYRING" \
      --chain-id "$CHAIN_ID" > signed_tx.json

    echo "Signed transaction saved to signed_tx.json"
    echo "Broadcasting..."
    $BINARY tx broadcast signed_tx.json --node "${NODE:-http://localhost:26657}" --output json | jq .
    ;;

  *)
    echo "Usage: $0 {generate-participant|assemble-multisig|sign-tx|combine-and-broadcast}"
    echo ""
    echo "Workflow:"
    echo "  1. Each participant runs: $0 generate-participant <name>"
    echo "  2. Coordinator runs:      $0 assemble-multisig"
    echo "  3. For each tx, signers run: $0 sign-tx <name> unsigned_tx.json"
    echo "  4. Coordinator runs:      $0 combine-and-broadcast unsigned_tx.json p1_sig.json p2_sig.json p3_sig.json"
    ;;
esac
