# Tamizhi Protocol

Tamizhi Protocol is an original decentralized messaging protocol built on top of the Tamizhi blockchain. It provides encrypted, metadata-minimizing peer-to-peer communication where your wallet address IS your identity — no phone number, no username, no central authority.

---

## Design Principles

| Property | Approach |
|---|---|
| Identity | secp256k1 wallet address (tamizhi1...) |
| Encryption | X25519 key exchange + XSalsa20-Poly1305 (NaCl box) |
| Sender unlinkability | Fresh ephemeral keypair per message |
| Routing | 3-hop onion routing through validator nodes |
| Storage | Off-chain KV store on validator nodes, 30-day TTL |
| Metadata minimization | Only the exit node knows the recipient |

---

## Identity System

Every Tamizhi user has a single keypair:

```
secp256k1 private key (32 bytes)
    |
    +---> SHA-256(privkey || "tamizhi-x25519") + clamp
    |         --> X25519 secret key (32 bytes, for encryption)
    |         --> X25519 public key (32 bytes, shared publicly)
    |
    +---> Secp256k1 compressed public key (33 bytes)
              --> SHA-256 --> RIPEMD-160
              --> bech32("tamizhi", ...) = "tamizhi1..."
```

The X25519 encryption key is derived deterministically from the secp256k1 key using a domain-separated hash, so users carry only one seed phrase.

Public keys are published to the Tamizhi key registry (backend API). Lookup uses the wallet address as the identifier.

---

## Encryption Scheme

### Direct Messages (tmz-1)

```
Sender has:   secp256k1 identity, recipient's X25519 public key
              
Step 1: Generate ephemeral X25519 keypair (fresh per message)
Step 2: nonce = random 24 bytes
Step 3: ciphertext = nacl.box(plaintext, nonce, recipientPubKey, ephemeralSecretKey)
Step 4: Transmit {ciphertext, nonce, ephemeralPublicKey, senderAddress, version="tmz-1"}

Recipient decrypts:
Step 1: key_material = X25519(ephemeralPublicKey, recipientSecretKey)  [same as sender's]
Step 2: plaintext = nacl.box.open(ciphertext, nonce, ephemeralPublicKey, recipientSecretKey)
```

Because each message uses a fresh ephemeral keypair, an observer cannot link two messages from the same sender even if they intercept all traffic.

### Group Messages (group-1)

Groups use a shared 32-byte symmetric key encrypted once per member (nacl.box):

```
Admin generates: groupKey = random 32 bytes
For each member:
  encryptedKey[member] = nacl.box(groupKey, nonce, member.x25519PublicKey, ephemeralSecretKey)

Group message:
  ciphertext = nacl.secretbox(plaintext, nonce, groupKey)
```

Each member independently decrypts their copy of the group key on first receive, then uses it for all subsequent group message decryption.

---

## 3-Hop Onion Routing

```
Client ──[Layer 1]──> Node A ──[Layer 2]──> Node B ──[Layer 3]──> Node C ──> Deliver to Recipient
                        |                     |                     |
                   knows: Client          knows: A, C          knows: B, Recipient
                   only                   only                  only
```

### Packet Construction (innermost first)

```
payload = EncryptedMessage bytes

Layer 3 (for Node C):
  envelope = { isFinal: true, finalPayload: payload, destination: recipientAddress }
  layer3 = nacl.box(serialize(envelope), nonce, NodeC.x25519PubKey, ephemeralSK3)

Layer 2 (for Node B):
  envelope = { isFinal: false, nextHop: NodeC.endpoint, innerPacket: layer3 }
  layer2 = nacl.box(serialize(envelope), nonce, NodeB.x25519PubKey, ephemeralSK2)

Layer 1 (for Node A) — sent by client:
  envelope = { isFinal: false, nextHop: NodeB.endpoint, innerPacket: layer2 }
  layer1 = nacl.box(serialize(envelope), nonce, NodeA.x25519PubKey, ephemeralSK1)
```

### Node Selection (Weighted by Stake)

Nodes are selected from the active validator set using stake-weighted random sampling without replacement. Higher-stake validators are statistically more likely to be chosen, incentivizing participation while preserving randomness.

---

## Message Storage

Encrypted messages are stored in an off-chain key-value store maintained by each validator node. The key is the recipient's wallet address; the value is the encrypted blob. Messages have a 30-day TTL and are deleted after the recipient acknowledges them.

Validators cannot read message content — they only see encrypted blobs.

---

## API Reference

### TamizhiProtocol Client

```typescript
import { TamizhiProtocol, identityFromMnemonic } from '@tamizhi/protocol';

const identity = await identityFromMnemonic('your twelve word mnemonic phrase here ...');

const protocol = new TamizhiProtocol({
  lcdUrl: 'https://lcd.tamizhi.network',
  backendUrl: 'https://api.tamizhi.network',
  identity,
  pollIntervalMs: 5000,
  debug: true,
});

await protocol.connect();

// Send a message
const messageId = await protocol.sendMessage('tamizhi1recipient...', 'Hello!');

// Listen for incoming messages
protocol.onMessage((msg) => {
  console.log(`From ${msg.from}: ${msg.content}`);
});

// List conversations
const conversations = await protocol.getConversations();

// Get messages with a specific peer
const messages = await protocol.getMessages('tamizhi1peer...', 50);

await protocol.disconnect();
```

### Identity

```typescript
import { identityFromMnemonic, identityFromPrivateKey, exportPublicIdentity } from '@tamizhi/protocol';

// From BIP39 mnemonic (HD path m/44'/118'/0'/0/0)
const identity = await identityFromMnemonic('word1 word2 ...');

// From raw private key
const identity2 = await identityFromPrivateKey(privKeyBytes);

// Export public parts (safe to share / register)
const publicId = exportPublicIdentity(identity);
// { walletAddress, x25519PublicKey (hex), secp256k1PublicKey (hex) }
```

### Key Registry

```typescript
import { registerPublicKey, lookupPublicKey } from '@tamizhi/protocol';

// Register your public key after onboarding
await registerPublicKey(identity, 'https://api.tamizhi.network', authToken);

// Look up someone else's public key
const publicId = await lookupPublicKey('tamizhi1other...', 'https://api.tamizhi.network');
```

### Group Messaging

```typescript
import { createGroup, addMember, encryptGroupMessage, decryptGroupMessage } from '@tamizhi/protocol';

// Create a group (admin must supply public identities of all initial members)
const group = createGroup(adminIdentity, [alicePublicId, bobPublicId, carolPublicId]);

// Add a member
const updatedGroup = addMember(group, davePublicId, adminIdentity);

// Encrypt a group message
const encrypted = encryptGroupMessage('Hello group!', group, senderAddress);

// Decrypt a group message
const plaintext = decryptGroupMessage(encrypted, group);
```

### Onion Routing (Low-Level)

```typescript
import { buildOnionPacket, peelOnionLayer, selectOnionPath, fetchNodeList } from '@tamizhi/protocol';

const nodes = await fetchNodeList('https://lcd.tamizhi.network');
const path  = selectOnionPath(nodes, 3);  // 3 stake-weighted random nodes

const packet = buildOnionPacket(payloadBytes, path, recipientAddress);

// Each node calls:
const { isFinal, nextHop, nextPacket, payload, destination } = peelOnionLayer(packet, nodeSecretKey);
```

### Address Utilities

```typescript
import {
  isValidTamizhiAddress,
  truncateAddress,
  addressToConversationId,
  formatMessageTimestamp,
} from '@tamizhi/protocol';

isValidTamizhiAddress('tamizhi1abc...');   // true/false
truncateAddress('tamizhi1abc...xyz', 10);  // "tamizhi1ab...xyz"
addressToConversationId(addr1, addr2);     // deterministic, sorted
formatMessageTimestamp(Date.now());        // "14:32" / "Apr 30, 14:32" / "Apr 30 2025"
```

---

## Protocol Wire Formats

### EncryptedMessage (tmz-1)
```json
{
  "version": "tmz-1",
  "ciphertext": "<hex>",
  "nonce": "<hex 24 bytes>",
  "ephemeralPublicKey": "<hex 32 bytes>",
  "senderAddress": "tamizhi1..."
}
```

### OnionPacket (onion-1)
```json
{
  "version": "onion-1",
  "layer": {
    "ciphertext": "<hex>",
    "nonce": "<hex 24 bytes>",
    "ephemeralPublicKey": "<hex 32 bytes>"
  }
}
```

### Node HTTP API (implemented by validator nodes)

| Method | Path | Description |
|---|---|---|
| POST | /relay | Accept an onion packet and forward/deliver it |
| POST | /submit | Store an encrypted message for a recipient |
| GET | /messages/:address?since=N | Fetch queued messages |
| DELETE | /messages | Acknowledge (delete) fetched messages |
| GET | /health | Node health and status |

---

## Security Properties

- **End-to-end encryption**: Only sender and recipient can read message content.
- **Forward secrecy**: Each message uses a fresh ephemeral keypair; compromise of long-term keys does not reveal past messages.
- **Sender unlinkability**: Ephemeral sender keypairs prevent linking messages to the same sender by traffic analysis.
- **Routing anonymity**: Each onion node knows only its immediate predecessor and successor. No single node sees both sender identity and recipient identity.
- **Integrity**: NaCl box provides authenticated encryption; tampered ciphertexts are detected.
- **No phone number / email required**: Identity is derived entirely from the secp256k1 keypair.

---

## Installation

```bash
npm install @tamizhi/protocol
```

## Build

```bash
npm run build   # tsc → dist/
npm test        # jest
npm run dev     # tsc --watch
```

---

## License

MIT — Tamizhi.Ai
