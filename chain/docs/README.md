# Tamizhi Chain REST API

The Tamizhi blockchain exposes a read-only REST API via the Cosmos SDK gRPC-gateway. All 20 endpoints use **HTTP GET** and return JSON. Write operations (minting rewards, registering nodes, submitting logs, etc.) must be submitted as transactions through gRPC or the CosmJS SDK.

---

## Modules

| Module | Base path | Endpoints |
|---|---|---|
| Rewards | `/tamizhi/rewards/v1/` | 3 |
| Nodes | `/tamizhi/nodes/v1/` | 4 |
| Access Log | `/tamizhi/accesslog/v1/` | 3 |
| Security | `/tamizhi/security/v1/` | 5 |
| Messaging | `/tamizhi/messaging/v1/` | 5 |

---

## Running a local node

### Prerequisites

- Go 1.21+
- Cosmos SDK v0.50.x (Tamizhi fork)

### Build and initialise

```bash
# Build the binary
make build

# Initialise chain state (first-time only)
./build/tamizhid init my-node --chain-id tamizhi-local-1

# Add a genesis key
./build/tamizhid keys add validator

# Fund the genesis account
./build/tamizhid genesis add-genesis-account validator 10000000000utmz

# Create the genesis validator
./build/tamizhid genesis gentx validator 1000000000utmz \
  --chain-id tamizhi-local-1

./build/tamizhid genesis collect-gentxs

# Start the node
./build/tamizhid start
```

### REST API port

By default the REST gateway listens on **port 1317**. You can confirm it is running:

```bash
curl -s http://localhost:1317/tamizhi/nodes/v1/nodes | jq .
```

If you need to enable the REST API explicitly, check `~/.tamizhid/config/app.toml`:

```toml
[api]
enable = true
address = "tcp://0.0.0.0:1317"
```

---

## Quick examples

### 1. List all active service nodes

```bash
curl -s http://localhost:1317/tamizhi/nodes/v1/nodes | jq '.nodes[] | {id, status, endpoint, uptime_score}'
```

### 2. Get reward records for an employee

```bash
EMPLOYEE_ID="EMP-0042"
curl -s "http://localhost:1317/tamizhi/rewards/v1/records/${EMPLOYEE_ID}" \
  | jq '.records[] | {activity, amount, timestamp}'
```

### 3. Check whether an address is security-blocked

```bash
ADDRESS="tamizhi1qg5ega6dykkxzctefxpf6qz7qn2c4tnpkjf5k"
curl -s "http://localhost:1317/tamizhi/security/v1/blocked/${ADDRESS}" | jq .
# => { "blocked": false, "reason": "" }
```

### 4. Fetch all active threat flags at CRITICAL or HIGH severity

```bash
curl -s http://localhost:1317/tamizhi/security/v1/threats \
  | jq '[.flags[] | select(.level == "CRITICAL" or .level == "HIGH")]'
```

---

## OpenAPI / Swagger / Postman

The machine-readable specification lives at:

```
chain/docs/openapi.yaml
```

### View interactively with Swagger UI (Docker)

```bash
docker run --rm -p 8080:8080 \
  -e SWAGGER_JSON=/spec/openapi.yaml \
  -v "$(pwd)/chain/docs:/spec" \
  swaggerapi/swagger-ui
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

### Import into Postman

1. Open Postman and choose **File > Import**.
2. Select `chain/docs/openapi.yaml`.
3. Postman will create a collection with all 20 endpoints pre-configured.
4. Set the `baseUrl` variable to `http://localhost:1317` for local testing.

### Generate a client SDK (openapi-generator)

```bash
# Python example
openapi-generator-cli generate \
  -i chain/docs/openapi.yaml \
  -g python \
  -o sdk/python

# TypeScript / Axios example
openapi-generator-cli generate \
  -i chain/docs/openapi.yaml \
  -g typescript-axios \
  -o sdk/ts
```

---

## Error format

All error responses use the standard Cosmos gRPC-gateway envelope:

```json
{
  "code": 5,
  "message": "not found",
  "details": []
}
```

Common HTTP status codes:

| HTTP | gRPC code | Meaning |
|---|---|---|
| 400 | 3 | Invalid argument — bad path parameter or query value |
| 404 | 5 | Resource not found on-chain |
| 500 | 13 | Internal node error |

---

## Links

- OpenAPI spec: [`chain/docs/openapi.yaml`](./openapi.yaml)
- Tamizhi website: https://tamizhi.ai
- Developer contact: dev@tamizhi.ai
