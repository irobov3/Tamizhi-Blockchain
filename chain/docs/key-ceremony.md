# Tamizhi Key Ceremony — 3-of-5 Multisig Admin Key

## 1. Overview

### What Is a Key Ceremony?

A key ceremony is a structured, auditable process for generating cryptographic keys that control privileged on-chain operations. For Tamizhi, the `tamizhi-admin` multisig account is the sole authority over the `x/rewards` module parameters and other admin-gated governance actions. No single person should hold unilateral control of these functions.

### Why 3-of-5?

A **3-of-5 multisig** means that any 3 of the 5 designated keyholders must co-sign a transaction for it to be valid. This satisfies two properties simultaneously:

- **Fault tolerance**: the system remains operational even if up to 2 keyholders are temporarily unavailable (illness, travel, hardware failure).
- **Collusion resistance**: a bad actor would need to compromise at least 3 independent parties—across different organizations and geographic locations—to execute an unauthorized transaction.

A simple 1-of-1 key, or even a 2-of-3, offers insufficient protection for a production blockchain admin account.

### The Five Keyholders

| # | Role | Responsibility |
|---|------|---------------|
| 1 | **Lead Developer** | Core protocol team, technical review of parameter changes |
| 2 | **Security Officer** | Threat assessment, veto on security-sensitive changes |
| 3 | **Legal / Compliance** | Ensures parameter changes comply with applicable regulations |
| 4 | **Community Representative** | Elected by token-holder governance to represent the community |
| 5 | **Tamizhi Foundation** | Foundation board stewardship, long-term protocol alignment |

---

## 2. Pre-Ceremony Checklist

### Hardware Requirements (per participant)

- [ ] Dedicated laptop or workstation — **not** a daily-use machine
- [ ] Minimum 8 GB RAM, 50 GB free disk
- [ ] USB drive (at least 8 GB) for Tails OS boot and key backup
- [ ] Ledger Nano X or Nano S Plus (recommended — see Section 4)
- [ ] Physical notebook and pen for recording the mnemonic offline

### Air-Gapped Machine Setup

The key generation must happen on a machine with **no active network connection**. Steps to verify:

1. Disconnect Ethernet cable physically.
2. Disable Wi-Fi in BIOS/UEFI, not just the OS toggle.
3. Remove or disable Bluetooth.
4. Boot from a clean, read-only OS image (Tails OS recommended).

### Tails OS Recommendation

[Tails OS](https://tails.boum.org/) is a live operating system designed for privacy and security. It routes all traffic through Tor (which you will disable for this ceremony) and leaves no trace on the host machine.

Boot procedure:
```
1. Download Tails from https://tails.boum.org/ on a separate online machine.
2. Verify the GPG signature.
3. Flash to USB with balenaEtcher or dd.
4. Boot the ceremony machine from USB.
5. Choose "Offline" mode — do NOT connect to Tor.
```

### Required Software Versions

| Software | Version | Source |
|----------|---------|--------|
| `tamizhi` binary | v1.1.0+ | Official release page or build from source |
| `jq` | 1.6+ | Pre-installed on Tails, or apt install |
| Ledger Live | Latest | https://www.ledger.com/ledger-live (online machine only) |
| Cosmos Ledger app | 2.35.x+ | Install via Ledger Live before going offline |

Verify the binary:
```bash
tamizhi version
# Expected: v1.1.0 (or current release)

sha256sum tamizhi
# Compare against the checksum published on the GitHub release page
```

---

## 3. Step-by-Step Ceremony

### Phase 1: Participant Key Generation (each of 5 participants, independently)

Each participant completes the following on their own air-gapped machine. They must **never share their mnemonic**.

**Step 1.1 — Generate the key**

```bash
# Using the keygen-ceremony.sh script:
./scripts/keygen-ceremony.sh generate-participant participant1

# Or manually:
tamizhi keys add participant1 --keyring-backend file --output json | tee participant1_key.json
```

**Step 1.2 — Record the mnemonic**

When prompted, write the 24-word mnemonic on paper. Do not type it into any computer. Store the paper in a physically secure location (see Section 5).

**Step 1.3 — Export the public key**

```bash
tamizhi keys show participant1 --keyring-backend file --pubkey
```

This outputs a JSON object like:
```json
{"@type":"/cosmos.crypto.secp256k1.PubKey","key":"A1b2C3..."}
```

This public key is **not secret**. Share it with the coordinator via a verified channel (Signal, encrypted email, or in-person on a USB drive).

**Step 1.4 — Verify independently**

Before sharing, the participant should verify the pubkey by re-deriving it from the mnemonic:
```bash
tamizhi keys add participant1-verify --recover --keyring-backend test
# Enter the mnemonic when prompted
tamizhi keys show participant1-verify --keyring-backend test --pubkey
# Must match the pubkey from Step 1.3
```

---

### Phase 2: Coordinator Assembly

The coordinator collects all 5 public keys and assembles the multisig on a single (offline) machine.

**Step 2.1 — Import each participant's public key**

```bash
tamizhi keys add participant1 \
  --pubkey '{"@type":"/cosmos.crypto.secp256k1.PubKey","key":"A1b2C3..."}' \
  --keyring-backend file

# Repeat for participant2 through participant5
```

**Step 2.2 — Create the multisig key**

```bash
./scripts/keygen-ceremony.sh assemble-multisig

# Or manually:
tamizhi keys add tamizhi-admin \
  --multisig "participant1,participant2,participant3,participant4,participant5" \
  --multisig-threshold 3 \
  --keyring-backend file \
  --output json | tee multisig_key.json
```

**Step 2.3 — Record the multisig address**

```bash
tamizhi keys show tamizhi-admin --keyring-backend file --address
```

Example output: `tamizhi1qpz...`

This address must be recorded and shared with all participants. It will be used in the genesis file or via governance to assign admin authority.

---

### Phase 3: Verification

All participants must independently verify the assembled multisig before the ceremony is complete.

```bash
# Each participant re-imports only the pubkeys of all OTHER participants (not their own private key)
# Then re-creates the multisig and compares the address.
tamizhi keys show tamizhi-admin --keyring-backend file --address
# Must match the address from Step 2.3 for all participants
```

A designated notary (or all participants together on a video call) should confirm the final address. Record the confirmed address in meeting minutes signed by all parties.

---

## 4. Ledger Hardware Wallet Integration

Using a Ledger hardware wallet is **strongly recommended** for all participants. The private key never leaves the secure element of the Ledger device.

### Setup

1. Initialize the Ledger with a new seed on the air-gapped machine (no Ledger Live required for this step).
2. Install the Cosmos app via Ledger Live (must be done on an online machine beforehand).
3. Connect the Ledger and open the Cosmos app.

### Generate the key with Ledger

```bash
tamizhi keys add participant1 --ledger --keyring-backend file
```

The Ledger will display a confirmation screen. Verify the address on the device display matches what the CLI shows.

### Export the public key from Ledger

```bash
tamizhi keys show participant1 --keyring-backend file --pubkey
```

The public key is derived from the Ledger and can be safely exported.

### Why Ledger Is Recommended

| Property | Software Key | Ledger Key |
|----------|-------------|-----------|
| Private key on disk | Yes (encrypted) | Never |
| Survives OS compromise | No | Yes |
| Requires physical presence to sign | No | Yes |
| Supports passphrase | Yes | Yes (25th word) |

When signing transactions, the Ledger will display the transaction details on the device screen. The participant must physically press a button to approve — this prevents silent malware from forging signatures.

---

## 5. Key Storage

### Hardware Wallet Best Practices

- Store the Ledger device in a tamper-evident bag when not in use.
- Enable the Ledger PIN (minimum 8 digits).
- Enable the passphrase (25th word) for an additional layer of security — store this passphrase separately from the device.
- Never leave the device unattended while unlocked.

### Encrypted USB Backup (software keys only)

If not using a Ledger, the mnemonic must be backed up:

1. Write the 24-word mnemonic on archival-grade paper (not thermal paper).
2. Store in a fireproof safe or safety deposit box.
3. Optionally, encrypt a digital copy with GPG and store on a USB:
   ```bash
   echo "word1 word2 ... word24" | gpg --symmetric --cipher-algo AES256 -o backup.gpg
   ```
   Store the GPG passphrase separately from the USB.

### Geographic Distribution

- No two keyholders should store their backup materials in the same city.
- At minimum, distribute across three different geographic locations.
- Consider cross-border distribution for a production mainnet.

### Shamir's Secret Sharing (Optional)

For additional resilience, the mnemonic can be split using Shamir's Secret Sharing (e.g., with `ssss` or `iancoleman/slip39`). A 3-of-5 SSS split of the mnemonic means 3 physical shares must be combined to recover the key, providing a second layer of threshold protection.

```bash
# Example using ssss-split (Debian/Ubuntu)
echo "word1 word2 ... word24" | ssss-split -t 3 -n 5
# Store each share with a different trusted custodian
```

---

## 6. Signing Workflow

This is the day-to-day procedure for using the multisig to authorize on-chain admin actions.

### Step 6.1 — Coordinator creates the unsigned transaction

```bash
# Example: update reward parameters
./scripts/create-unsigned-update-params.sh 10 1000000 utmz
# Output: unsigned_update_params.json
```

Or for any generic governance message:
```bash
tamizhi tx rewards update-reward-params \
  --authority $(tamizhi keys show tamizhi-admin --address --keyring-backend file) \
  --max-daily-reward 10 \
  --min-reward-amount 1000000 \
  --reward-denom utmz \
  --from tamizhi-admin \
  --chain-id tamizhi-mainnet-1 \
  --gas 200000 \
  --gas-prices 1000utmz \
  --generate-only > unsigned_tx.json
```

Distribute `unsigned_tx.json` to at least 3 of the 5 keyholders via a verified secure channel.

### Step 6.2 — Each signer produces a partial signature

Each of the (at least) 3 participating signers, on their own machine with their own key:

```bash
./scripts/keygen-ceremony.sh sign-tx participant1 unsigned_tx.json
# Output: participant1_signature.json

# Or manually:
tamizhi tx sign unsigned_tx.json \
  --from participant1 \
  --multisig tamizhi-admin \
  --chain-id tamizhi-mainnet-1 \
  --keyring-backend file \
  --output-document participant1_signature.json
```

Each signer should independently verify the contents of `unsigned_tx.json` before signing. Check:
- The `body.messages` match the expected action.
- The `chain_id` is correct.
- The `fee` is reasonable.

### Step 6.3 — Coordinator combines signatures and broadcasts

```bash
./scripts/keygen-ceremony.sh combine-and-broadcast \
  unsigned_tx.json \
  participant1_signature.json \
  participant2_signature.json \
  participant3_signature.json

# Or manually:
tamizhi tx multisign unsigned_tx.json tamizhi-admin \
  participant1_signature.json \
  participant2_signature.json \
  participant3_signature.json \
  --chain-id tamizhi-mainnet-1 \
  --keyring-backend file > signed_tx.json

tamizhi tx broadcast signed_tx.json \
  --node https://rpc.tamizhi.ai:443 \
  --output json | jq .
```

Verify the transaction was included in a block:
```bash
tamizhi query tx <txhash> --node https://rpc.tamizhi.ai:443
```

---

## 7. Emergency Procedures

### Lost Key (one keyholder)

The multisig still operates with 4 remaining keyholders (only 3 needed). However, the lost key reduces fault tolerance. Rotate the multisig as soon as possible:

1. Obtain signatures from 3 of the remaining 4 keyholders.
2. Create a governance proposal (or admin tx) to update the admin address to a new multisig that excludes the lost key and adds a replacement keyholder.
3. The replacement keyholder completes a mini key ceremony (Steps 1.1–1.4) and shares their pubkey.
4. Assemble and verify the new multisig.
5. Execute the admin key rotation transaction with signatures from 3 of the remaining keyholders.

### Compromised Key (suspected or confirmed)

Act immediately:

1. **Do not** wait for confirmation — treat all suspected compromises as real.
2. Assemble 3 remaining keyholders via an out-of-band channel (phone, in-person).
3. Create and sign an emergency key rotation transaction to transfer admin authority to a new, clean multisig.
4. Broadcast the rotation transaction before the attacker can act.
5. Conduct a post-incident review and replace the compromised participant.
6. If the attacker broadcasts a transaction first, initiate an on-chain governance emergency vote to override it (requires validator supermajority).

### Lost Keys (two keyholders simultaneously)

Three keyholders remain — the minimum quorum. Treat this as an emergency:
1. Immediately rotate the multisig to exclude both lost keys.
2. Add two new keyholders via the procedure above.
3. Review storage and backup procedures to prevent recurrence.

### Lost Keys (three or more keyholders)

The multisig cannot sign. Governance recovery is required:
1. Submit an on-chain governance proposal via the standard voting mechanism (requires token-holder participation, not admin key).
2. The proposal updates the admin authority address to a new, functional multisig.
3. This is a severe incident — conduct a full security audit before continuing operations.

---

## 8. Key Rotation Schedule

### Annual Review

Every 12 months, all keyholders should:
- [ ] Verify their backup materials are intact and accessible.
- [ ] Confirm their Ledger firmware and Cosmos app are up to date.
- [ ] Review whether the current set of keyholders is still appropriate.
- [ ] Test the signing workflow with a low-stakes transaction (e.g., a parameter change on testnet).

### Planned Rotation Procedure

Key rotation does not require chain downtime. The procedure:

1. New keyholders complete the key generation ceremony (Sections 3 Phase 1).
2. New multisig address is assembled from the new set of 5 pubkeys.
3. Current 3-of-5 signs a transaction to transfer admin authority to the new multisig address.
4. Verify the new address has admin authority via a test transaction on testnet first.
5. Execute on mainnet.
6. Old keyholders securely destroy their key material (shred paper backups, wipe Ledger devices).

### Rotation Triggers (outside annual schedule)

- Any keyholder leaves their role.
- Suspected compromise of any key.
- Ledger firmware vulnerability disclosure affecting participant devices.
- Organizational restructuring that affects the designated roles.
