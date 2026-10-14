# gRPC-Web Support for Tamizhi Chain

## What is gRPC-Web and Why is it Needed?

Standard gRPC relies on HTTP/2 features — specifically **trailing headers** — that browsers cannot access via the Fetch or XHR APIs. This means browser-based applications (the Tamizhi wallet and literary browser) cannot call the chain's gRPC server directly.

**gRPC-Web** is a wire-protocol variant that wraps gRPC frames in a browser-compatible HTTP/1.1 or HTTP/2 request (without trailing headers). An **Envoy proxy** acts as the bridge: it receives gRPC-Web requests from browsers, translates them to standard gRPC, and forwards them to the chain node.

## Architecture

```
Browser (wallet / literary browser)
        |
        | HTTP/1.1 or HTTP/2  (gRPC-Web protocol)
        | POST /tamizhi.rewards.v1.Query/GetRewardRecord
        v
  Envoy Proxy  :8080
  (grpc_web filter + cors filter)
        |
        | HTTP/2  (standard gRPC)
        v
  Tamizhi Chain Node (validator1)  :9090
```

- **Port 8080** — Envoy gRPC-Web listener (browser-facing)
- **Port 9090** — Chain gRPC server (internal, not exposed to browsers directly)
- **Port 9901** — Envoy admin interface (metrics, health, config dump)

## Starting Envoy

### With Docker Compose (recommended)

```bash
# Start only Envoy (validator1 must already be running)
docker-compose up envoy-grpc-web

# Start everything including Envoy
docker-compose up -d
```

### Standalone Docker run

```bash
docker run --rm \
  -e GRPC_HOST=localhost \
  -p 8080:8080 \
  -p 9901:9901 \
  $(docker build -q ./envoy)
```

When running standalone against a local chain node, set `GRPC_HOST=host.docker.internal` (macOS/Windows) or `GRPC_HOST=172.17.0.1` (Linux bridge) to reach the host network.

## Using TamizhiGrpcWebClient

The `TamizhiGrpcWebClient` in `sdk/typescript/src/grpc-web/TamizhiGrpcClient.ts` provides a Fetch-based gRPC-Web client that works in both browsers and Node.js 18+.

### Installation

No additional dependencies are required beyond the standard SDK. The client uses the native `fetch` API and `TextEncoder`/`TextDecoder`.

### Basic usage

```typescript
import { TamizhiGrpcWebClient } from '@tamizhi/sdk/grpc-web/TamizhiGrpcClient';

// Connect to Envoy (default: http://localhost:8080)
const client = new TamizhiGrpcWebClient('http://localhost:8080');

// Query reward record
const record = await client.getRewardRecord('employee-123');

// List all reward rules
const rules = await client.getRewardRules();

// List active nodes
const nodes = await client.getActiveNodes();

// Estimate APR for a specific node
const apr = await client.estimateAPR('node-abc');

// List literature works
const works = await client.listLiteratureWorks();

// Get fee burn statistics
const burnStats = await client.getBurnStats();
```

### Generic call

For services not covered by the convenience methods:

```typescript
const result = await client.call(
  'tamizhi.accesslog.v1.Query',   // fully-qualified service name
  'GetAccessLog',                  // method name
  { entry_id: 'abc123' }          // request payload (JSON-serializable)
);
```

### In the Wallet app

```typescript
// src/services/chainService.ts
import { TamizhiGrpcWebClient } from '../grpc-web/TamizhiGrpcClient';

const ENVOY_URL = process.env.REACT_APP_GRPC_WEB_URL ?? 'http://localhost:8080';
export const grpcClient = new TamizhiGrpcWebClient(ENVOY_URL);
```

### In the Literary Browser app

```typescript
// src/api/literature.ts
import { TamizhiGrpcWebClient } from '@tamizhi/sdk/grpc-web/TamizhiGrpcClient';

const client = new TamizhiGrpcWebClient(import.meta.env.VITE_GRPC_WEB_URL ?? 'http://localhost:8080');

export async function fetchWorks() {
  return client.listLiteratureWorks();
}
```

## Testing

### Check Envoy admin

```bash
# Health check
curl http://localhost:9901/ready

# View all clusters and their health
curl http://localhost:9901/clusters

# Live config dump
curl http://localhost:9901/config_dump
```

### Test a gRPC call via grpcurl through Envoy

```bash
# grpcurl speaks standard gRPC (HTTP/2), so point directly at Envoy port 8080
# (Envoy's grpc_web filter also accepts plain gRPC from CLI tools)
grpcurl -plaintext \
  -proto proto/tamizhi/rewards/v1/query.proto \
  localhost:8080 \
  tamizhi.rewards.v1.Query/ListRewardRules
```

### Test with curl (raw gRPC-Web)

```bash
# Minimal gRPC-Web POST — empty request body with 5-byte frame header
printf '\x00\x00\x00\x00\x00' | curl -s \
  -X POST \
  -H 'Content-Type: application/grpc-web+json' \
  -H 'X-Grpc-Web: 1' \
  --data-binary @- \
  http://localhost:8080/tamizhi.rewards.v1.Query/ListRewardRules | xxd | head
```

## Environment Variables

| Variable    | Default      | Description                                                  |
|-------------|--------------|--------------------------------------------------------------|
| `GRPC_HOST` | `validator1` | Hostname/IP of the chain gRPC server Envoy forwards to       |

The Envoy admin UI is always available at `http://localhost:9901` when the container is running.

## Troubleshooting CORS Issues

### Symptoms

Browser console shows:
```
Access to fetch at 'http://localhost:8080/...' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

### Solutions

1. **Preflight OPTIONS not handled** — Envoy's `cors` filter handles OPTIONS automatically when `allow_origin_string_match` is configured. Verify the filter is present in `envoy.yaml` and the container has been rebuilt (`docker-compose build envoy-grpc-web`).

2. **Missing `grpc-status` in exposed headers** — The response trailer `grpc-status` must be in `expose_headers`. The provided config already includes `grpc-status,grpc-message,grpc-status-details-bin`.

3. **Wrong content-type on the request** — Browsers must send `Content-Type: application/grpc-web+json` (for JSON encoding) or `application/grpc-web` (for protobuf binary). The `TamizhiGrpcWebClient` sets this correctly.

4. **Envoy not rebuilding** — After changing `envoy.yaml`, force a rebuild:
   ```bash
   docker-compose build --no-cache envoy-grpc-web
   docker-compose up envoy-grpc-web
   ```

5. **Chain gRPC not reachable from Envoy** — Check that `validator1` is healthy and its gRPC port is up:
   ```bash
   docker-compose exec envoy-grpc-web curl -sf http://validator1:26657/health
   grpcurl -plaintext validator1:9090 list   # from inside the Docker network
   ```

6. **Node.js fetch compatibility** — `TamizhiGrpcWebClient` requires Node.js 18 or later for the native `fetch` API. For older Node versions, polyfill with `node-fetch` or `cross-fetch`.
