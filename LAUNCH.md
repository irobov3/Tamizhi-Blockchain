# Tamizhi — Launch Runbook

Everything needed to go from zero to a running Tamizhi blockchain + full stack.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Go | 1.21+ | https://go.dev/dl/ |
| Rust | stable + 1.81 toolchain | https://rustup.rs |
| wasm32 target | — | `rustup target add wasm32-unknown-unknown --toolchain 1.81` |
| cosmwasm-check | 2.1.3 | `cargo install cosmwasm-check --version 2.1.3` |
| Node.js | 20+ | https://nodejs.org |
| Docker + Compose v2 | latest | https://docker.com |
| jq | any | `brew install jq` |

Run the prerequisites check at any time:

```bash
./scripts/launch.sh check
```

---

## Step 1 — Environment setup

```bash
cp .env.example .env
```

Edit `.env` and change **at minimum**:

| Variable | What to put |
|----------|-------------|
| `POSTGRES_PASSWORD` | Any strong password |
| `JWT_SECRET` | `openssl rand -hex 64` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `PINATA_API_KEY` / `PINATA_SECRET_KEY` | From pinata.cloud (for IPFS in prod) |

Leave `NEXT_PUBLIC_NFT_CONTRACT` empty — it gets filled automatically in Step 4.

---

## Step 2 — Build and start the chain

**Option A — single command (dev):**
```bash
./scripts/launch.sh dev
```

This does steps 2–3 automatically.

**Option B — manual:**

```bash
# Build the tamizhi binary
cd chain && make build && cd ..

# Initialize node (one-time — creates keys + genesis)
cd chain && make init && cd ..
# ⚠️  BACK UP the mnemonic printed to /tmp/tamizhi-genesis-key.txt

# Start the node (background, logs → /tmp/tamizhi-node.log)
cd chain && make start &
# Confirm it's live:
curl http://localhost:26657/status | jq .result.sync_info
```

Expected: `"catching_up": false` and a `latest_block_height` above 1.

---

## Step 3 — Start all services

```bash
./scripts/launch.sh services
# OR
docker compose up -d --build
```

Service URLs once running:

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API | http://localhost:3001/api |
| API Docs (Swagger) | http://localhost:3001/api/docs |
| Chain RPC | http://localhost:26657 |
| Chain REST/LCD | http://localhost:1317 |
| IPFS Gateway | http://localhost:8080 |

---

## Step 4 — Deploy the CosmWasm literary-NFT contract

The chain must have at least 1 block before deploying.

```bash
./scripts/launch.sh contract
```

This:
1. Compiles the Rust contract with Rust 1.81 (no bulk-memory/reference-types)
2. Runs `cosmwasm-check` to validate the wasm
3. Uploads the wasm to the chain (`tx wasm store`)
4. Instantiates the contract
5. Mints a sample Thirukkural NFT
6. Writes `NEXT_PUBLIC_NFT_CONTRACT=<address>` to your `.env`

After this, restart the web service so it picks up the contract address:

```bash
docker compose restart web
```

Verify in the browser at **http://localhost:3000/literature** — Tamil literature works should load from the chain.

---

## Step 5 — Connect your wallet

Open **http://localhost:3000/wallet**.

- **With Keplr:** Install the [Keplr browser extension](https://keplr.app), click "Connect with Keplr". The app will suggest the Tamizhi chain automatically.
- **With seed phrase:** Click "Create New Wallet" to generate a fresh wallet, or "Import Existing Wallet" to import your genesis key mnemonic.

To fund a new wallet from the genesis account:

```bash
# Export genesis key address
GENESIS_ADDR=$(tamizhi keys show genesis-key -a --home ~/.tamizhi --keyring-backend test)
YOUR_ADDR=tamizhi1...   # paste your new wallet address

# Send 10 TMZ
tamizhi tx bank send genesis-key $YOUR_ADDR 10000000utmz \
  --chain-id tamizhi-1 \
  --home ~/.tamizhi \
  --keyring-backend test \
  --gas auto --gas-adjustment 1.3 \
  --fees 2500utmz \
  -y
```

---

## Step 6 — Verify everything

```bash
# Chain status
curl -s http://localhost:26657/status | jq '.result.sync_info'

# Latest block
curl -s http://localhost:1317/cosmos/base/tendermint/v1beta1/blocks/latest | jq '.block.header.height'

# Contract works query
CONTRACT=$(grep NEXT_PUBLIC_NFT_CONTRACT .env | cut -d= -f2)
QUERY=$(echo '{"all_works":{"limit":5}}' | base64)
curl -s "http://localhost:1317/cosmwasm/wasm/v1/contract/$CONTRACT/smart/$QUERY" | jq .

# All Docker services healthy
docker compose ps
```

---

## Testnet / Production deployment

### Using Docker Compose on a server

```bash
# On the server
git clone <repo> tamizhi && cd tamizhi
cp .env.example .env && nano .env   # fill in production values

# Start everything (chain node runs inside Docker)
./scripts/launch.sh testnet

# Deploy contract
./scripts/launch.sh contract
```

### Using Kubernetes (k8s/)

1. Fill in `infra/k8s/secrets.yaml` with base64-encoded values.
2. Point DNS for `tamizhi.network` and subdomains to your cluster ingress IP.
3. Apply manifests:

```bash
kubectl apply -f infra/k8s/storage.yaml
kubectl apply -f infra/k8s/secrets.yaml
kubectl apply -f infra/k8s/chain.yaml
kubectl apply -f infra/k8s/ai.yaml
kubectl apply -f infra/k8s/messaging.yaml
kubectl apply -f infra/k8s/ingress.yaml
```

4. TLS is handled by cert-manager (install separately: https://cert-manager.io).

---

## Monitoring and logs

```bash
# Chain node logs
tail -f /tmp/tamizhi-node.log
# OR (Docker)
docker compose logs -f tamizhi-node

# All service logs
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f web
```

---

## Common problems

| Symptom | Fix |
|---------|-----|
| `tamizhi: command not found` | Run `make install` in `chain/` or add `chain/build` to PATH |
| Chain starts but blocks stop | Check peers / single-validator setup: normal |
| `cosmwasm-check` fails with `bulk-memory` | Wrong Rust toolchain — must use `cargo +1.81` |
| Literature page shows no works | `NEXT_PUBLIC_NFT_CONTRACT` not set or chain offline |
| Keplr says "chain not found" | Click "Connect with Keplr" — app calls `experimentalSuggestChain` automatically |
| Docker services fail to start | Check `.env` has `POSTGRES_PASSWORD` and `JWT_SECRET` set |
| `genesis validate` fails with wrong denom | `init-node.sh` patches genesis denom — re-run `make init` with `--overwrite` |

---

## Reset (start fresh)

```bash
# Stop node + services
./scripts/launch.sh stop

# Reset chain state (keeps keys)
cd chain && make reset && cd ..

# OR: full wipe including keys
rm -rf ~/.tamizhi

# Restart
./scripts/launch.sh dev
```

---

## What still needs external action before mainnet

| Item | Who | Notes |
|------|-----|-------|
| External security audit | Oak Security / Halborn | CosmWasm contract + chain modules |
| Domain + DNS | Registrar | `tamizhi.network` + 6 subdomains |
| TLS certificates | cert-manager (auto) | Needs domain first |
| Validator onboarding | Community | Distribute genesis file |
| Pinata account | pinata.cloud | For production IPFS pinning |
| Anthropic API key | console.anthropic.com | For AI service |
| App Store / Play Store | Apple / Google | After mobile beta |
