# @tamizhi/chain-sdk

TypeScript SDK for interacting with the Tamizhi blockchain (Cosmos SDK v0.50.9).
Built on top of CosmJS for browser and Node.js environments.

## Installation

```bash
npm install @tamizhi/chain-sdk
# or
yarn add @tamizhi/chain-sdk
```

## Quick Start

```typescript
import {
  TamizhiQueryClient,
  TamizhiSigningClient,
  TAMIZHI_DENOM,
} from "@tamizhi/chain-sdk";

const config = {
  rpcEndpoint: "http://localhost:26657",
  restEndpoint: "http://localhost:1317",
  chainId: "tamizhi-1",
};
```

---

## Query Examples

### List Reward Rules

```typescript
import { TamizhiQueryClient } from "@tamizhi/chain-sdk";

const queryClient = new TamizhiQueryClient({
  rpcEndpoint: "http://localhost:26657",
  restEndpoint: "http://localhost:1317",
  chainId: "tamizhi-1",
});

// Fetch all reward rules
const rules = await queryClient.listRewardRules();
console.log("Reward rules:", rules);

// Fetch a specific rule by ID
const rule = await queryClient.getRewardRule("rule-001");
console.log("Rule:", rule);

// Fetch reward records for an employee
const records = await queryClient.getRewardRecords("EMP-12345");
console.log("Records:", records);
```

### Get a Node

```typescript
const node = await queryClient.getNode("node-abc123");
console.log("Node status:", node.status);
console.log("Uptime score:", node.uptimeScore);

// List all active nodes
const activeNodes = await queryClient.listActiveNodes();
console.log(`${activeNodes.length} active nodes`);

// List swarms
const swarms = await queryClient.getSwarms();
console.log("Swarms:", swarms);
```

### Security Queries

```typescript
const { blocked, reason } = await queryClient.isBlocked("tamizhi1abc...");
if (blocked) {
  console.warn("Address is blocked:", reason);
}

const threats = await queryClient.listActiveThreatFlags();
console.log(`${threats.length} active threats`);
```

### Messaging Queries

```typescript
const session = await queryClient.getSessionID("tamizhi1abc...");
console.log("Session:", session);

const group = await queryClient.getGroup("group-xyz");
console.log("Group:", group);
```

---

## Signing / Transaction Examples

### Issue a Reward (with HD wallet from mnemonic)

```typescript
import { TamizhiSigningClient } from "@tamizhi/chain-sdk";

const mnemonic = "word1 word2 word3 ... word24";
const wallet = await TamizhiSigningClient.walletFromMnemonic(mnemonic);

const signingClient = await TamizhiSigningClient.connect(
  {
    rpcEndpoint: "http://localhost:26657",
    restEndpoint: "http://localhost:1317",
    chainId: "tamizhi-1",
  },
  wallet
);

const [account] = await wallet.getAccounts();

const fee = {
  amount: [{ denom: "utmz", amount: "5000" }],
  gas: "200000",
};

const result = await signingClient.issueReward(
  account.address,   // authority (governance/admin address)
  "EMP-12345",       // employeeId
  "rule-attendance", // ruleId
  "Daily attendance reward",
  fee
);

console.log("Tx hash:", result.transactionHash);
console.log("Code:", result.code); // 0 = success
```

### Register a Service Node

```typescript
const result = await signingClient.registerNode(
  account.address,
  "node-mynode-001",
  "https://mynode.example.com:26656",
  { denom: "utmz", amount: "1000000000" }, // 1000 TMZ staked
  fee
);
console.log("Node registered:", result.transactionHash);
```

### Log a File Access Event

```typescript
const result = await signingClient.logAccess(
  "EMP-12345",
  account.address,
  "sha256:abc123...",          // fileHash
  "sensitive-report.pdf",      // fileName
  "READ",                      // action
  "Qm...",                     // IPFS CID
  fee
);
console.log("Access logged:", result.transactionHash);
```

### Raise a Threat Flag

```typescript
const result = await signingClient.raiseThreatFlag(
  account.address,        // authority
  "EMP-99999",            // employeeId
  "tamizhi1suspect...",   // address
  "UNAUTHORIZED_ACCESS",  // threatType
  "HIGH",                 // level
  "Multiple failed login attempts detected from foreign IP",
  fee
);
console.log("Threat flag raised:", result.transactionHash);
```

### Register a Messaging Session

```typescript
const result = await signingClient.registerSession(
  account.address,
  "base64EncodedSessionPublicKey==",
  "Alice",
  fee
);
console.log("Session registered:", result.transactionHash);
```

---

## Keplr Wallet Integration

Use the Keplr browser extension for web dApps. The SDK ships amino converters
for all Tamizhi message types so Keplr can display human-readable signing
prompts.

```typescript
import { TamizhiSigningClient, tamizhiAminoTypes } from "@tamizhi/chain-sdk";
import { AminoTypes } from "@cosmjs/stargate";

// 1. Suggest the Tamizhi chain to Keplr
await window.keplr.experimentalSuggestChain({
  chainId: "tamizhi-1",
  chainName: "Tamizhi",
  rpc: "http://localhost:26657",
  rest: "http://localhost:1317",
  bip44: { coinType: 118 },
  bech32Config: {
    bech32PrefixAccAddr: "tamizhi",
    bech32PrefixAccPub: "tamizhipub",
    bech32PrefixValAddr: "tamizhivaloper",
    bech32PrefixValPub: "tamizhivaloperpub",
    bech32PrefixConsAddr: "tamizhivalcons",
    bech32PrefixConsPub: "tamizhivalconspub",
  },
  currencies: [
    { coinDenom: "TMZ", coinMinimalDenom: "utmz", coinDecimals: 6 },
  ],
  feeCurrencies: [
    {
      coinDenom: "TMZ",
      coinMinimalDenom: "utmz",
      coinDecimals: 6,
      gasPriceStep: { low: 500, average: 1000, high: 2000 },
    },
  ],
  stakeCurrency: {
    coinDenom: "TMZ",
    coinMinimalDenom: "utmz",
    coinDecimals: 6,
  },
});

// 2. Enable and get the offline signer
await window.keplr.enable("tamizhi-1");
const offlineSigner = window.keplr.getOfflineSigner("tamizhi-1");

// 3. Connect the Tamizhi signing client (amino types registered automatically)
const signingClient = await TamizhiSigningClient.connect(
  {
    rpcEndpoint: "http://localhost:26657",
    restEndpoint: "http://localhost:1317",
    chainId: "tamizhi-1",
  },
  offlineSigner
);

// 4. Broadcast a transaction — Keplr will show a human-readable prompt
const [account] = await offlineSigner.getAccounts();
const fee = { amount: [{ denom: "utmz", amount: "5000" }], gas: "200000" };

const result = await signingClient.issueReward(
  account.address,
  "EMP-12345",
  "rule-attendance",
  "Keplr-signed reward",
  fee
);
console.log("Broadcasted via Keplr:", result.transactionHash);
```

---

## Message Type URLs

All proto message type URLs are exported as the `MSG_TYPE_URLS` constant:

```typescript
import { MSG_TYPE_URLS } from "@tamizhi/chain-sdk";

console.log(MSG_TYPE_URLS.IssueReward);
// "/tamizhi.rewards.v1.MsgIssueReward"
```

| Key | Type URL |
|-----|----------|
| `IssueReward` | `/tamizhi.rewards.v1.MsgIssueReward` |
| `CreateRewardRule` | `/tamizhi.rewards.v1.MsgCreateRewardRule` |
| `UpdateRewardRule` | `/tamizhi.rewards.v1.MsgUpdateRewardRule` |
| `RegisterNode` | `/tamizhi.nodes.v1.MsgRegisterNode` |
| `DeregisterNode` | `/tamizhi.nodes.v1.MsgDeregisterNode` |
| `ClaimNodeReward` | `/tamizhi.nodes.v1.MsgClaimNodeReward` |
| `LogAccess` | `/tamizhi.accesslog.v1.MsgLogAccess` |
| `RaiseThreatFlag` | `/tamizhi.security.v1.MsgRaiseThreatFlag` |
| `ResolveThreatFlag` | `/tamizhi.security.v1.MsgResolveThreatFlag` |
| `RegisterSession` | `/tamizhi.messaging.v1.MsgRegisterSession` |
| `CreateGroup` | `/tamizhi.messaging.v1.MsgCreateGroup` |

---

## Constants

```typescript
import {
  TAMIZHI_DENOM,          // "utmz"
  TAMIZHI_DISPLAY_DENOM,  // "TMZ"
  TAMIZHI_EXPONENT,       // 6  (1 TMZ = 1,000,000 utmz)
  DEFAULT_GAS_PRICE,      // "1000utmz"
} from "@tamizhi/chain-sdk";
```

---

## Building

```bash
npm install
npm run build   # outputs to dist/
npm run lint    # ESLint
npm test        # Jest
```

## License

Apache-2.0
