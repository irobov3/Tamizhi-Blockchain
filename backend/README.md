# Tamizhi.Ai Backend API

Production-grade NestJS backend for the Tamizhi.Ai platform — preserving Tamil literary heritage on blockchain with encrypted messaging and decentralized storage.

## Architecture

- **Framework**: NestJS 10 (TypeScript)
- **Database**: PostgreSQL via Prisma ORM
- **Cache**: Redis (ioredis)
- **Auth**: JWT + Cosmos wallet signature verification
- **Storage**: IPFS (ipfs-http-client)
- **Blockchain**: Cosmos SDK (@cosmjs)
- **WebSockets**: Socket.IO for real-time messaging

## Prerequisites

- Node.js >= 20
- PostgreSQL >= 14
- Redis >= 7
- IPFS node (local or remote)
- Running Cosmos-compatible chain (for wallet/tx features)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your actual values
```

Required variables:

| Variable         | Description                              | Example                                     |
|------------------|------------------------------------------|---------------------------------------------|
| DATABASE_URL     | PostgreSQL connection string             | postgresql://user:pass@localhost:5432/tamizhi |
| REDIS_URL        | Redis connection string                  | redis://localhost:6379                       |
| JWT_SECRET       | Secret for signing JWTs                  | your-long-random-secret                     |
| JWT_EXPIRY       | JWT expiry duration                      | 7d                                          |
| CHAIN_RPC_URL    | Cosmos chain RPC endpoint                | https://rpc.tamizhi.chain                   |
| CHAIN_LCD_URL    | Cosmos chain LCD/REST endpoint           | https://lcd.tamizhi.chain                   |
| CHAIN_ID         | Cosmos chain ID                          | tamizhi-1                                   |
| IPFS_API_URL     | IPFS API endpoint                        | http://localhost:5001                        |
| IPFS_GATEWAY     | IPFS public gateway for file URLs        | https://ipfs.io/ipfs                         |
| PORT             | Server listening port                    | 3001                                         |
| CORS_ORIGIN      | Allowed CORS origin                      | http://localhost:3000                        |
| RATE_LIMIT_TTL   | Rate limit window in seconds             | 60                                           |
| RATE_LIMIT_MAX   | Max requests per window                  | 100                                          |

### 3. Run database migrations

```bash
# Create and apply migrations
npm run prisma:migrate

# Generate Prisma client (if not already done)
npm run prisma:generate
```

### 4. Start the server

```bash
# Development (hot reload)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

The API is available at `http://localhost:3001/api/v1`

Swagger documentation is at `http://localhost:3001/api/docs`

## API Modules

### Authentication (`/api/v1/auth`)

Wallet-based authentication using Cosmos signature verification.

| Method | Endpoint       | Description                         |
|--------|----------------|-------------------------------------|
| POST   | /auth/nonce    | Get a nonce to sign with your wallet |
| POST   | /auth/verify   | Verify signature and receive JWT     |

**Authentication flow:**
1. `POST /auth/nonce` with `{ address: "cosmos1..." }` → receive `{ nonce, message }`
2. Sign `message` with your Cosmos wallet
3. `POST /auth/verify` with `{ address, signature }` → receive `{ token, user }`
4. Use `Authorization: Bearer <token>` for protected endpoints

### Wallet (`/api/v1/wallet`)

| Method | Endpoint                       | Description                    |
|--------|--------------------------------|--------------------------------|
| POST   | /wallet/create                 | Generate a new HD wallet       |
| GET    | /wallet/balance/:address       | Get token balances from chain  |
| GET    | /wallet/transactions/:address  | Get transaction history        |

### Literary Works (`/api/v1/literature`)

| Method | Endpoint                       | Description                         | Auth |
|--------|--------------------------------|-------------------------------------|------|
| GET    | /literature                    | List all works (paginated)          |      |
| GET    | /literature/search?q=query     | Search works                        |      |
| GET    | /literature/author/:address    | Works by an author address          |      |
| GET    | /literature/:id                | Get a specific work                 |      |
| POST   | /literature                    | Upload work (multipart/form-data)   | JWT  |

### Messaging (`/api/v1/messages`)

All messaging endpoints require JWT authentication.

| Method | Endpoint                           | Description                      |
|--------|------------------------------------|----------------------------------|
| POST   | /messages                          | Send an encrypted message        |
| GET    | /messages/:address                 | Get conversations for address    |
| GET    | /messages/conversation/:id         | Get messages in a conversation   |
| PATCH  | /messages/conversation/:id/read    | Mark messages as read            |
| GET    | /messages/unread/:address          | Get unread message count         |

**WebSocket** connects to `ws://localhost:3001/messaging`

Events:
- `join_room` — join a conversation room
- `send_message` — send a message (persisted + broadcast)
- `message_received` — incoming message event
- `typing` — typing indicator
- `mark_read` — mark messages as read

### Transactions (`/api/v1/transactions`)

| Method | Endpoint                        | Description                          | Auth |
|--------|---------------------------------|--------------------------------------|------|
| GET    | /transactions/:hash             | Get transaction by hash              |      |
| GET    | /transactions/address/:address  | Get transactions by address          |      |
| POST   | /transactions                   | Record a transaction                 | JWT  |
| POST   | /transactions/broadcast         | Broadcast signed tx to chain         | JWT  |

### Storage (`/api/v1/storage`)

| Method | Endpoint            | Description               | Auth |
|--------|---------------------|---------------------------|------|
| POST   | /storage/upload     | Upload file to IPFS       | JWT  |
| GET    | /storage/:cid       | Retrieve file by CID      |      |
| POST   | /storage/:cid/pin   | Pin file on IPFS node     | JWT  |
| DELETE | /storage/:cid/pin   | Unpin file from IPFS node | JWT  |
| GET    | /storage/info/node  | IPFS node info            | JWT  |

## Docker

### Build and run with Docker

```bash
# Build image
docker build -t tamizhi-backend .

# Run with environment variables
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/tamizhi" \
  -e REDIS_URL="redis://host:6379" \
  -e JWT_SECRET="your-secret" \
  tamizhi-backend
```

### Docker Compose (recommended for development)

```bash
# Start all services
docker compose up -d

# Run migrations after DB is ready
docker compose exec api npx prisma migrate deploy
```

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage
```

## Prisma Database Management

```bash
# Open Prisma Studio (visual DB editor)
npm run prisma:studio

# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

## Security Notes

- All JWT secrets must be long random strings (min 32 chars) in production
- Never commit `.env` files to version control
- The `cleanDatabase()` method is blocked in production
- Rate limiting is enabled globally (configurable via env vars)
- CORS is restricted to `CORS_ORIGIN` in production
- Helmet security headers are applied on all responses
