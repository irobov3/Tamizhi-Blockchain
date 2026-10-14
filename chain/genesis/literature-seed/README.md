# Tamil Literary Seed Data

This directory contains canonical Tamil literary works formatted as genesis seed data
for the Tamizhi blockchain's `x/literature` module.

---

## What These Works Are

`works.json` contains **53 canonical works** drawn from over 2,000 years of Tamil literary
tradition — from the Sangam age (3rd century BCE) through the medieval devotional period
(12th century CE). The corpus is organized into nine collections:

| Collection | Works | Period |
|---|---|---|
| Thirukkural | 10 kurals (Book 1 — Virtue) | 1st–5th century CE |
| Sangam Anthologies | 10 poems (Purananuru, Akananuru, Kurunthokai, Kalittokai, Natrinai) | 3rd century BCE – 3rd century CE |
| Silappathikaram | 5 excerpts | 2nd–5th century CE |
| Manimekalai | 3 excerpts | 2nd–6th century CE |
| Kambaramayanam | 5 excerpts | 12th century CE |
| Tevaram | 7 hymns (Appar, Sambandar, Sundarar) | 6th–8th century CE |
| Thiruppavai | 3 pasurams | 8th–9th century CE |
| Naladiyar | 4 verses | 4th–5th century CE |
| Thiruvasagam | 3 verses | 9th century CE |

### Cultural Significance

These works constitute the foundational canon of Tamil civilization:

- **Thirukkural** — The "universal scripture" of ethics, translated into 80+ languages and
  revered globally as one of the greatest books of wisdom ever written.

- **Sangam Poems** — Among the world's oldest secular literature, predating most Greek
  philosophy. They document a sophisticated civilization with nuanced understandings of
  love, nature, heroism, and the cosmos. Purananuru 192 ("Every town is my hometown")
  is considered one of the earliest articulations of global humanism.

- **Silappathikaram** — One of the five great Tamil epics (Aimperum Kappiyangal). Its
  protagonist Kannagi remains the symbol of Tamil womanhood and justice.

- **Tevaram and Thiruppavai** — The devotional hymns that shaped South Indian temple
  worship for over 1,300 years and continue to be sung daily across Tamil Nadu and
  Sri Lanka.

- **Kambaramayanam** — A creative masterwork that transformed Valmiki's Sanskrit epic
  into a distinctly Tamil literary achievement, considered one of the finest long poems
  in any language.

---

## Content Hash Derivation

Each work entry carries a `content_hash` field — a 64-character hex string representing
the SHA-256 hash of the work's primary text content.

### Production hashing

For real on-chain submissions the hash should be computed over the **full text content**
(UTF-8 encoded) of the work being registered:

```
content_hash = hex(sha256(full_text_utf8))
```

### Seed data hashes

The hashes in `works.json` are deterministic placeholder values — unique per work,
valid 64-character lowercase hex strings. They satisfy the on-chain `SHA256HashLength`
validation constraint in `x/literature/types/types.go`.

Before submitting a work with full content (e.g., uploaded to IPFS or Arweave), update
the `content_hash` field:

```bash
# Compute hash from a text file
sha256sum full_text.txt | awk '{print $1}'

# Or in Python
python3 -c "import hashlib,sys; print(hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest())" full_text.txt
```

---

## Running the Seed Script

### Prerequisites

- A running Tamizhi node (local or testnet)
- `jq` installed (`brew install jq`)
- The `tamizhi` binary in your `PATH` and a funded key

### Quick start (local testnet)

```bash
# 1. Start a local chain (if not already running)
./scripts/setup-localnet.sh

# 2. Run the seed script with defaults
./scripts/seed-literature.sh
```

### Custom configuration

```bash
BINARY=tamizhi \
CHAIN_ID=tamizhi-testnet-1 \
NODE=http://localhost:26657 \
FROM=validator \
GAS_PRICES=1000utmz \
./scripts/seed-literature.sh
```

### Dry run (preview without broadcasting)

```bash
DRY_RUN=1 ./scripts/seed-literature.sh
```

### Expected output

```
╔══════════════════════════════════════════════════════════════════╗
║          Tamizhi Blockchain — Tamil Literary Seed Script         ║
╚══════════════════════════════════════════════════════════════════╝

  Chain   : tamizhi-local-1
  Works to submit: 53

  [1/53] thirukkural-001
    Title  : Kural 1 - The Supremacy of God
    Tamil  : அகர முதல எழுத்தெல்லாம்...
    OK  txhash=ABC123...
```

---

## Verifying Works Are On-Chain

After seeding, verify individual works using the CLI:

```bash
# Query a specific work by ID
tamizhi q literature work thirukkural-001

# List all registered works (paginated)
tamizhi q literature works --limit 10

# Query works by author
tamizhi q literature works-by-author "Thiruvalluvar"

# Query works by anthology
tamizhi q literature works-by-anthology "Thirukkural"
```

Or via the REST API:

```bash
# Get work by ID
curl http://localhost:1317/tamizhi/literature/v1/work/thirukkural-001 | jq

# List all works
curl "http://localhost:1317/tamizhi/literature/v1/works?pagination.limit=20" | jq
```

### Verifying content integrity

```bash
# Fetch a work and verify its hash matches the known value
EXPECTED_HASH=$(jq -r '.[] | select(.work_id=="thirukkural-001") | .content_hash' \
  genesis/literature-seed/works.json)

ON_CHAIN_HASH=$(tamizhi q literature work thirukkural-001 --output json \
  | jq -r '.work.content.sha256_hash')

if [[ "$EXPECTED_HASH" == "$ON_CHAIN_HASH" ]]; then
  echo "Hash verified OK"
else
  echo "Hash MISMATCH — expected $EXPECTED_HASH, got $ON_CHAIN_HASH"
fi
```

---

## Adding Arweave IDs for Permanent Storage

The `arweave_id` field in each work entry is intentionally blank in the seed data.
Arweave provides permanent, censorship-resistant storage of the full text.

### Workflow

1. **Upload the full text to Arweave**:

```bash
# Using the arweave-deploy CLI
arweave deploy full_text.txt \
  --key-file arweave-wallet.json \
  --tag "Content-Type" "text/plain; charset=utf-8" \
  --tag "App-Name" "Tamizhi" \
  --tag "Work-ID" "thirukkural-001"
```

2. **Note the Arweave transaction ID** (43-character base64url string).

3. **Update the work on-chain**:

```bash
tamizhi tx literature update-work thirukkural-001 \
  --arweave-tx-id "YOUR_ARWEAVE_TX_ID" \
  --from validator \
  --chain-id tamizhi-local-1 \
  --yes
```

4. **Update `works.json`** with the Arweave ID for future reference:

```json
{
  "work_id": "thirukkural-001",
  "arweave_id": "YOUR_ARWEAVE_TX_ID",
  ...
}
```

### Verifying on Arweave

```bash
# View the content in a browser
open "https://arweave.net/YOUR_ARWEAVE_TX_ID"

# Or query via API
curl "https://arweave.net/YOUR_ARWEAVE_TX_ID"
```

Once an Arweave ID is recorded on-chain, the work's permanent existence is guaranteed
by the Arweave network's endowment model regardless of what happens to any external servers.

---

## Adding New Works

To add additional Tamil literary works:

1. Append a new entry to `works.json` following the existing schema.
2. Ensure `work_id` is unique (e.g., `sangam-kuruntokai-003`).
3. Compute the `content_hash` from the Tamil text (see above).
4. Run `./scripts/seed-literature.sh` — the script will submit all works; works already
   on-chain will be rejected by the node with an "already exists" error which the script
   handles gracefully.

---

## Work Entry Schema Reference

```json
{
  "work_id":              "string — unique identifier, e.g. thirukkural-001",
  "title_tamil":          "string — the work title or excerpt in Tamil script",
  "title_transliterated": "string — romanized Tamil title",
  "title_english":        "string — English title or description",
  "author":               "string — author name in English",
  "author_tamil":         "string — author name in Tamil script",
  "author_era":           "string — author's approximate dates",
  "work_type":            "string — poem | epic | hymn | devotional | prose",
  "language":             "string — classical-tamil | tamil | etc.",
  "era":                  "string — approximate composition date",
  "anthology":            "string — parent anthology name",
  "anthology_book":       "string — sub-collection or volume",
  "chapter":              "string — chapter or section reference",
  "content_hash":         "string — 64 hex chars, sha256 of content",
  "arweave_id":           "string — Arweave TX ID, empty until uploaded",
  "description":          "string — scholarly description of the work"
}
```
