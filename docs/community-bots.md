# Tamizhi Community Bots

This guide covers setup and operation of the Discord and Telegram bots that provide community engagement, faucet access, and on-chain event notifications for the Tamizhi blockchain.

---

## Discord Bot

### 1. Create a Discord Application

1. Go to [https://discord.com/developers/applications](https://discord.com/developers/applications) and click **New Application**.
2. Give it a name (e.g., `Tamizhi Chain Bot`) and click **Create**.
3. Navigate to the **Bot** tab and click **Add Bot**.
4. Under **Token**, click **Reset Token** and copy the token — this is your `DISCORD_TOKEN`.
5. Under **Privileged Gateway Intents**, enable **Server Members Intent** and **Message Content Intent** if needed.
6. Navigate to **OAuth2 > General** and copy the **Client ID** — this is your `DISCORD_CLIENT_ID`.

### 2. Invite the Bot to Your Server

1. Go to **OAuth2 > URL Generator**.
2. Under **Scopes**, select `bot` and `applications.commands`.
3. Under **Bot Permissions**, select:
   - Read Messages/View Channels
   - Send Messages
   - Embed Links
   - Use Slash Commands
4. Copy the generated URL, open it in your browser, and select your server.

### 3. Configure Environment Variables

Copy the example env file and fill in your values:

```bash
cd services/discord-bot
cp .env.example .env
```

Edit `.env`:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_test_guild_id        # Optional: omit for global commands
ALERTS_CHANNEL_ID=channel_id_for_alerts    # Right-click channel > Copy ID
REST_URL=http://localhost:1317
EXPLORER_URL=http://localhost:3001
WS_RELAY_URL=ws://localhost:3002
FAUCET_AMOUNT=10000000
FAUCET_COOLDOWN_HOURS=24
CHAIN_ID=tamizhi-testnet-1
```

To get a channel ID: enable Developer Mode in Discord settings, then right-click any channel and select **Copy ID**.

### 4. Register Slash Commands

Commands are registered automatically on startup. If you set `DISCORD_GUILD_ID`, commands appear instantly in that server (good for testing). Without it, global registration can take up to 1 hour.

### Available Commands

| Command | Description |
|---------|-------------|
| `/faucet <address>` | Request 10 TMZ testnet tokens (24h cooldown) |
| `/balance <address>` | Check UTZ/TMZ balance for any address |
| `/tx <hash>` | Look up a transaction by hash |
| `/stats` | Display chain-wide statistics |
| `/works` | Show the 5 most recent Tamil literary works on chain |
| `/nodes` | Show up to 5 active service nodes |
| `/block` | Show the latest block height, time, and tx count |

---

## Telegram Bot

### 1. Create a Bot via BotFather

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot` and follow the prompts to set a name and username.
3. Copy the **HTTP API token** — this is your `TELEGRAM_BOT_TOKEN`.

Optionally, configure the bot description and commands via BotFather:

```
/setdescription — Tamizhi blockchain explorer bot
/setcommands —
start - Welcome message and command list
stats - Chain statistics
block - Latest block info
works - Recent Tamil literary works
nodes - Active service nodes
balance - Check address balance
tx - Look up a transaction
```

### 2. Configure Environment Variables

```bash
cd services/telegram-bot
cp .env.example .env
```

Edit `.env`:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
REST_URL=http://localhost:1317
EXPLORER_URL=http://localhost:3001
```

### Available Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message with command overview |
| `/stats` | Chain-wide statistics |
| `/block` | Latest block height, time, and tx count |
| `/works` | 5 most recent Tamil literary works on chain |
| `/nodes` | Up to 5 active service nodes with uptime |
| `/balance <address>` | TMZ balance for a tamizhi1... address |
| `/tx <hash>` | Transaction status, height, and sender |

---

## Running Locally

### Discord Bot

```bash
cd services/discord-bot
npm install
npm run dev          # Development with ts-node
# or
npm run build && npm start   # Production build
```

### Telegram Bot

```bash
cd services/telegram-bot
npm install
npm run dev          # Development with ts-node
# or
npm run build && npm start   # Production build
```

---

## Running with Docker

Both bots are managed by `services/docker-compose.bots.yml`. The compose file uses `host.docker.internal` to reach the chain node and explorer running on the host machine.

### Prerequisites

Create `.env` files (not `.env.example`) in each bot's directory with real credentials before starting.

```bash
# From the services/ directory:
docker compose -f docker-compose.bots.yml up --build -d

# View logs:
docker compose -f docker-compose.bots.yml logs -f discord-bot
docker compose -f docker-compose.bots.yml logs -f telegram-bot

# Stop:
docker compose -f docker-compose.bots.yml down
```

Each service has `restart: unless-stopped`, so they will recover automatically after crashes or host reboots.

---

## Faucet Wallet Setup

The Discord `/faucet` command requires a funded wallet on-chain to send tokens. Follow these steps to set up the faucet key:

### 1. Create the Faucet Key

```bash
tamizhid keys add faucet --keyring-backend file
```

Note the address printed (e.g., `tamizhi1faucet...`). Store the mnemonic securely.

### 2. Fund the Faucet Address

During genesis or from a funded validator account:

```bash
tamizhid tx bank send <validator-address> <faucet-address> 1000000000utmz \
  --chain-id tamizhi-testnet-1 \
  --keyring-backend file \
  --fees 5000utmz \
  -y
```

### 3. Configure the Bot

Set `FAUCET_FROM` in the Discord bot's `.env` to the faucet key name:

```env
FAUCET_FROM=faucet
```

In production, the bot should use a Cosmos signing client (e.g., `@cosmjs/stargate`) with the faucet's mnemonic loaded from a secret manager (AWS Secrets Manager, HashiCorp Vault, etc.) — never commit the mnemonic to version control.

### Cooldown

The in-memory cooldown map resets on bot restart. For persistent cooldowns across restarts, replace the `faucetCooldowns` map with a Redis client:

```typescript
import { createClient } from 'redis';
const redis = createClient({ url: process.env.REDIS_URL });
// Use redis.set / redis.get with TTL instead of the Map
```

---

## Alert Channel Configuration (Discord)

The Discord bot connects to the WebSocket relay (`WS_RELAY_URL`) and posts structured alerts to the channel specified by `ALERTS_CHANNEL_ID`.

### Supported Alert Events

| Event Type | Trigger | Color |
|------------|---------|-------|
| `node_jailed` | A service node falls below the uptime threshold | Red |
| `threat_flagged` | The guardian module flags a suspicious address | Orange |
| `work_submitted` | A new Tamil literary work is registered on chain | Dark Red |

### WebSocket Relay Message Format

The relay should emit JSON messages in this shape:

```json
{
  "type": "node_jailed",
  "data": {
    "nodeId": "node-abc123",
    "reason": "Uptime score below threshold"
  }
}
```

```json
{
  "type": "threat_flagged",
  "data": {
    "address": "tamizhi1abc...",
    "level": "HIGH"
  }
}
```

```json
{
  "type": "work_submitted",
  "data": {
    "workId": "WORK-001",
    "author": "Thiruvalluvar"
  }
}
```

The bot auto-reconnects to the relay with a 5-second backoff on disconnect.
