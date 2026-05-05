# Tamizhi Ecosystem — Getting Started

Complete run guide for all 10 components.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker | 24+ | https://docs.docker.com/get-docker/ |
| Docker Compose | v2+ | Included with Docker Desktop |
| Node.js | 20+ | https://nodejs.org |
| Go | 1.22+ | https://go.dev/dl/ (for chain only) |
| Python | 3.11+ | https://python.org |
| Rust | 1.75+ | https://rustup.rs (for desktop/contracts) |

---

## Option A: Full Stack via Docker (Recommended)

### 1. Clone & setup environment files
```bash
cd /Users/guverad/Desktop/Tamizhi.Ai

cp backend/.env.example backend/.env
cp ai/.env.example ai/.env
cp web/.env.example web/.env.local
cp storage/.env.example storage/.env
cp messaging/.env.example messaging/.env
```

### 2. Add your API key to ai/.env
```bash
# Edit ai/.env and set:
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3. Start all services
```bash
docker compose up --build
```

### 4. Initialize the blockchain (first time only)
```bash
# In a separate terminal, after chain container is running:
bash infra/scripts/chain-init.sh
```

### 5. Run database migrations
```bash
docker compose exec backend npx prisma migrate deploy
```

### Access URLs
| Service | URL |
|---------|-----|
| Web App | http://localhost:3001 |
| API (Swagger) | http://localhost:3000/api |
| AI Service | http://localhost:8000/docs |
| Chain RPC | http://localhost:26657 |
| Chain LCD | http://localhost:1317 |
| IPFS Gateway | http://localhost:8080 |
| Messenger WS | ws://localhost:4000 |

---

## Option B: Local Development (Service by Service)

### Step 1 — Infrastructure (Docker)
```bash
docker compose up -d postgres redis ipfs
```

### Step 2 — Backend (NestJS)
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
# Running at http://localhost:3000
```

### Step 3 — Storage (IPFS service)
```bash
cd storage
npm install
npm run dev
# Running at http://localhost:5000
```

### Step 4 — Messaging (WebSocket)
```bash
cd messaging
npm install
npm run dev
# Running at ws://localhost:4000
```

### Step 5 — AI (FastAPI)
```bash
cd ai
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
# Running at http://localhost:8000
```

### Step 6 — Web App (Next.js)
```bash
cd web
npm install
npm run dev
# Running at http://localhost:3001
```

### Step 7 — Blockchain (requires Go 1.22+)
```bash
# Install Go first: https://go.dev/dl/
cd chain
go mod download
make build
make init       # First time only
make start
# Chain RPC at http://localhost:26657
```

### Step 8 — Mobile (iOS/Android)
```bash
cd mobile
npm install
npm start          # Expo DevTools
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Scan QR with Expo Go app on real device
```

### Step 9 — Desktop (Tauri)
```bash
# Requires Rust: https://rustup.rs
cd desktop
npm install
npm run tauri:dev
```

---

## Blockchain — Key Commands

```bash
# Build chain binary
cd chain && make build

# Initialize a new node
make init

# Start the chain
make start

# Submit a Tamil literary work via CLI
./build/tamizhi tx literature submit-work work.json \
  --from validator \
  --chain-id tamizhi-1 \
  --gas auto \
  --gas-prices 0.001utmz \
  -y

# Query all literary works
./build/tamizhi q literature list-works

# Get a specific work
./build/tamizhi q literature get-work tamizhi:lit:00001

# Check balance
./build/tamizhi q bank balances tamizhi1...

# Send TMZ
./build/tamizhi tx bank send \
  validator tamizhi1recipient 1000000utmz \
  --chain-id tamizhi-1 \
  --gas-prices 0.001utmz \
  -y
```

---

## API — Quick Reference

### Auth flow
```bash
# 1. Get nonce
curl -X POST http://localhost:3000/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address":"tamizhi1..."}'

# 2. Sign nonce with wallet, then verify
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"address":"tamizhi1...","signature":"..."}'
# Returns: { "token": "eyJ..." }
```

### Upload Tamil literature
```bash
curl -X POST http://localhost:3000/literature \
  -H "Authorization: Bearer eyJ..." \
  -F "file=@thirukkural.txt" \
  -F "title=திருக்குறள்" \
  -F "titleTransliterated=Thirukkural" \
  -F "authorName=திருவள்ளுவர்" \
  -F "period=sangam" \
  -F "genre=philosophy" \
  -F "license=CC0"
```

### AI chat (Tamil)
```bash
curl -X POST http://localhost:8000/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "திருக்குறளில் அன்பு பற்றி என்ன சொல்கிறது?",
    "language": "ta",
    "use_literature_context": true
  }'
```

---

## Environment Variables Reference

### backend/.env
```env
DATABASE_URL=postgresql://tamizhi:tamizhi_secret@localhost:5432/tamizhi
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-this-in-production-min-32-chars
JWT_EXPIRY=7d
CHAIN_RPC_URL=http://localhost:26657
CHAIN_LCD_URL=http://localhost:1317
CHAIN_ID=tamizhi-1
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY=http://localhost:8080/ipfs
PORT=3000
CORS_ORIGIN=http://localhost:3001
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

### ai/.env
```env
PORT=8000
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-openai-key       # optional fallback
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-this-in-production-min-32-chars
BACKEND_URL=http://localhost:3000
TAMIZHI_LCD_URL=http://localhost:1317
DEFAULT_MODEL=claude-3-5-sonnet-20241022
MAX_TOKENS=4096
```

### web/.env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_CHAIN_RPC=http://localhost:26657
NEXT_PUBLIC_CHAIN_LCD=http://localhost:1317
NEXT_PUBLIC_CHAIN_ID=tamizhi-1
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_IPFS_GATEWAY=http://localhost:8080/ipfs
```

---

## Docker Management

```bash
# Start everything
docker compose up -d

# Start specific services
docker compose up -d postgres redis ipfs backend

# View logs
docker compose logs -f backend
docker compose logs -f chain

# Rebuild a specific service
docker compose build backend
docker compose up -d --no-deps backend

# Stop all
docker compose down

# Stop and remove volumes (WIPES ALL DATA)
docker compose down -v

# Check service health
docker compose ps
```

---

## Kubernetes Deployment

```bash
# Create namespace
kubectl apply -f infra/k8s/namespace.yaml

# Deploy infrastructure
kubectl apply -f infra/k8s/postgres.yaml
kubectl apply -f infra/k8s/redis.yaml

# Deploy apps
kubectl apply -f infra/k8s/backend.yaml
kubectl apply -f infra/k8s/web.yaml

# Check status
kubectl get pods -n tamizhi
kubectl get services -n tamizhi
```

---

## File Count Summary

| Component | Files | Language |
|-----------|-------|----------|
| Blockchain (chain/) | 22 | Go |
| Backend (backend/) | 35 | TypeScript |
| Web App (web/) | 41 | TypeScript/React |
| Mobile (mobile/) | 28 | TypeScript/React Native |
| Desktop (desktop/) | 16 | TypeScript/Rust |
| Messaging (messaging/) | 9 | TypeScript |
| AI Service (ai/) | 10 | Python |
| Storage (storage/) | 11 | TypeScript |
| DevOps (infra/ + docker-compose) | 14 | YAML/Bash |
| **Total** | **~186** | |
