# Tamizhi Chain gRPC API

The Tamizhi chain exposes a full gRPC API on port **9090** (default).
All query methods are also accessible via REST on port **1317**.

---

## Tools

### grpcurl

```bash
brew install grpcurl          # macOS
# or:
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
```

### List all services

```bash
grpcurl -plaintext localhost:9090 list
```

### Describe a service

```bash
grpcurl -plaintext localhost:9090 describe tamizhi.rewards.v1.Query
```

### Describe a specific RPC method

```bash
grpcurl -plaintext localhost:9090 describe tamizhi.rewards.v1.Query.ListRewardRules
```

---

## gRPC Reflection

The node registers the standard `grpc.reflection.v1alpha` service (plus the
Cosmos-SDK `cosmos.autocli.v1` autocli endpoint).  No local `.proto` files are
needed — grpcurl, BloomRPC, and Postman can discover all services automatically.

```bash
# Verify reflection is live
grpcurl -plaintext localhost:9090 list | grep tamizhi
```

---

## Rewards Module (`tamizhi.rewards.v1`)

### Query — ListRewardRules

Returns all reward rules defined on-chain.

```bash
grpcurl -plaintext localhost:9090 tamizhi.rewards.v1.Query/ListRewardRules
```

### Query — GetRewardRule

Returns a single reward rule by ID.

```bash
grpcurl -plaintext \
  -d '{"rule_id": "attendance"}' \
  localhost:9090 tamizhi.rewards.v1.Query/GetRewardRule
```

### Query — GetRewardRecords

Returns all reward records issued to an employee.

```bash
grpcurl -plaintext \
  -d '{"employee_id": "emp001"}' \
  localhost:9090 tamizhi.rewards.v1.Query/GetRewardRecords
```

### Msg — IssueReward

Issues a reward to an employee according to an existing rule.
`authority` must be the governance module address or a permitted signer.

```bash
grpcurl -plaintext \
  -d '{
    "authority":   "tamizhi10d07y265gmmuvt4z0w9aw880jnsr700jduz5f2",
    "employee_id": "emp001",
    "rule_id":     "attendance",
    "memo":        "Q1 perfect attendance"
  }' \
  localhost:9090 tamizhi.rewards.v1.Msg/IssueReward
```

### Msg — CreateRewardRule

Creates a new reward rule. Only callable by governance authority.

```bash
grpcurl -plaintext \
  -d '{
    "authority": "tamizhi10d07y265gmmuvt4z0w9aw880jnsr700jduz5f2",
    "rule": {
      "id":          "attendance",
      "activity":    "daily-attendance",
      "amount":      {"denom": "utmz", "amount": "1000000"},
      "description": "Reward for daily attendance",
      "active":      true,
      "max_per_day": 1
    }
  }' \
  localhost:9090 tamizhi.rewards.v1.Msg/CreateRewardRule
```

### Msg — UpdateRewardRule

Updates an existing reward rule. Only callable by governance authority.

```bash
grpcurl -plaintext \
  -d '{
    "authority": "tamizhi10d07y265gmmuvt4z0w9aw880jnsr700jduz5f2",
    "rule": {
      "id":          "attendance",
      "activity":    "daily-attendance",
      "amount":      {"denom": "utmz", "amount": "1500000"},
      "description": "Reward for daily attendance (updated amount)",
      "active":      true,
      "max_per_day": 1
    }
  }' \
  localhost:9090 tamizhi.rewards.v1.Msg/UpdateRewardRule
```

---

## Nodes Module (`tamizhi.nodes.v1`)

### Query — ListActiveNodes

Returns all currently active service nodes.

```bash
grpcurl -plaintext localhost:9090 tamizhi.nodes.v1.Query/ListActiveNodes
```

### Query — GetNode

Returns details for a single node by ID.

```bash
grpcurl -plaintext \
  -d '{"node_id": "node-alpha-1"}' \
  localhost:9090 tamizhi.nodes.v1.Query/GetNode
```

### Query — GetSwarms

Returns all swarm assignments.

```bash
grpcurl -plaintext localhost:9090 tamizhi.nodes.v1.Query/GetSwarms
```

### Query — ListNodesBySwarm

Returns all nodes that belong to a given swarm.

```bash
grpcurl -plaintext \
  -d '{"swarm_id": "swarm-01"}' \
  localhost:9090 tamizhi.nodes.v1.Query/ListNodesBySwarm
```

### Msg — RegisterNode

Registers a new service node and stakes tokens.

```bash
grpcurl -plaintext \
  -d '{
    "creator":  "tamizhi1qnk2n4nlkpw9xfqntladh74er2xa62wdn2",
    "node_id":  "node-alpha-1",
    "endpoint": "https://node-alpha-1.tamizhi.network:443",
    "stake":    {"denom": "utmz", "amount": "10000000"}
  }' \
  localhost:9090 tamizhi.nodes.v1.Msg/RegisterNode
```

### Msg — DeregisterNode

Removes a node from the network and returns staked tokens.

```bash
grpcurl -plaintext \
  -d '{
    "creator": "tamizhi1qnk2n4nlkpw9xfqntladh74er2xa62wdn2",
    "node_id": "node-alpha-1"
  }' \
  localhost:9090 tamizhi.nodes.v1.Msg/DeregisterNode
```

### Msg — UpdateNodeEndpoint

Changes the public endpoint URL for a registered node.

```bash
grpcurl -plaintext \
  -d '{
    "creator":      "tamizhi1qnk2n4nlkpw9xfqntladh74er2xa62wdn2",
    "node_id":      "node-alpha-1",
    "new_endpoint": "https://node-alpha-1-new.tamizhi.network:443"
  }' \
  localhost:9090 tamizhi.nodes.v1.Msg/UpdateNodeEndpoint
```

### Msg — ClaimNodeReward

Claims accrued uptime rewards for a node.

```bash
grpcurl -plaintext \
  -d '{
    "creator": "tamizhi1qnk2n4nlkpw9xfqntladh74er2xa62wdn2",
    "node_id": "node-alpha-1"
  }' \
  localhost:9090 tamizhi.nodes.v1.Msg/ClaimNodeReward
```

---

## Access Log Module (`tamizhi.accesslog.v1`)

### Query — ListLogs

Returns all access log entries on-chain.

```bash
grpcurl -plaintext localhost:9090 tamizhi.accesslog.v1.Query/ListLogs
```

### Query — GetLog

Returns a single access log entry by numeric ID.

```bash
grpcurl -plaintext \
  -d '{"id": 1}' \
  localhost:9090 tamizhi.accesslog.v1.Query/GetLog
```

### Query — GetLogsByEmployee

Returns all access logs associated with an employee.

```bash
grpcurl -plaintext \
  -d '{"employee_id": "emp001"}' \
  localhost:9090 tamizhi.accesslog.v1.Query/GetLogsByEmployee
```

### Msg — LogAccess

Records an immutable access-log entry on-chain.

```bash
grpcurl -plaintext \
  -d '{
    "creator":     "tamizhi1qnk2n4nlkpw9xfqntladh74er2xa62wdn2",
    "employee_id": "emp001",
    "file_hash":   "sha256:abc123def456",
    "file_name":   "patient-record-2025.pdf",
    "action":      "VIEW",
    "ipfs_cid":    "QmXyz123abc456def789"
  }' \
  localhost:9090 tamizhi.accesslog.v1.Msg/LogAccess
```

---

## Security Module (`tamizhi.security.v1`)

### Query — ListActiveThreatFlags

Returns all unresolved threat flags.

```bash
grpcurl -plaintext localhost:9090 tamizhi.security.v1.Query/ListActiveThreatFlags
```

### Query — GetThreatFlag

Returns a specific threat flag by numeric ID.

```bash
grpcurl -plaintext \
  -d '{"flag_id": 1}' \
  localhost:9090 tamizhi.security.v1.Query/GetThreatFlag
```

### Query — ListThreatFlagsByEmployee

Returns all threat flags associated with an employee.

```bash
grpcurl -plaintext \
  -d '{"employee_id": "emp001"}' \
  localhost:9090 tamizhi.security.v1.Query/ListThreatFlagsByEmployee
```

### Query — ListSecurityEvents

Returns all logged security events.

```bash
grpcurl -plaintext localhost:9090 tamizhi.security.v1.Query/ListSecurityEvents
```

### Query — IsBlocked

Checks whether a given address is currently blocked.

```bash
grpcurl -plaintext \
  -d '{"address": "tamizhi1qnk2n4nlkpw9xfqntladh74er2xa62wdn2"}' \
  localhost:9090 tamizhi.security.v1.Query/IsBlocked
```

### Msg — RaiseThreatFlag

Raises a new threat flag against an employee or address.

```bash
grpcurl -plaintext \
  -d '{
    "authority":   "tamizhi10d07y265gmmuvt4z0w9aw880jnsr700jduz5f2",
    "employee_id": "emp001",
    "address":     "tamizhi1qnk2n4nlkpw9xfqntladh74er2xa62wdn2",
    "threat_type": "UNAUTHORIZED_ACCESS",
    "level":       "HIGH",
    "description": "Repeated failed login attempts from unknown IP",
    "action":      "MONITOR",
    "source":      "intrusion-detection-system"
  }' \
  localhost:9090 tamizhi.security.v1.Msg/RaiseThreatFlag
```

### Msg — ResolveThreatFlag

Resolves (closes) an existing threat flag.

```bash
grpcurl -plaintext \
  -d '{
    "authority":  "tamizhi10d07y265gmmuvt4z0w9aw880jnsr700jduz5f2",
    "flag_id":    1,
    "resolution": "False positive — employee was on approved travel."
  }' \
  localhost:9090 tamizhi.security.v1.Msg/ResolveThreatFlag
```

### Msg — LogSecurityEvent

Records a raw security event on-chain.

```bash
grpcurl -plaintext \
  -d '{
    "authority":   "tamizhi10d07y265gmmuvt4z0w9aw880jnsr700jduz5f2",
    "employee_id": "emp001",
    "address":     "tamizhi1qnk2n4nlkpw9xfqntladh74er2xa62wdn2",
    "event_type":  "LOGIN_FAILURE",
    "data_hash":   "sha256:deadbeef",
    "device_id":   "device-macbook-001"
  }' \
  localhost:9090 tamizhi.security.v1.Msg/LogSecurityEvent
```

### Msg — BlockAddress

Blocks a wallet address from interacting with the chain.

```bash
grpcurl -plaintext \
  -d '{
    "authority": "tamizhi10d07y265gmmuvt4z0w9aw880jnsr700jduz5f2",
    "address":   "tamizhi1qnk2n4nlkpw9xfqntladh74er2xa62wdn2",
    "reason":    "Confirmed fraudulent activity"
  }' \
  localhost:9090 tamizhi.security.v1.Msg/BlockAddress
```

### Msg — UnblockAddress

Lifts a block previously placed on an address.

```bash
grpcurl -plaintext \
  -d '{
    "authority": "tamizhi10d07y265gmmuvt4z0w9aw880jnsr700jduz5f2",
    "address":   "tamizhi1qnk2n4nlkpw9xfqntladh74er2xa62wdn2"
  }' \
  localhost:9090 tamizhi.security.v1.Msg/UnblockAddress
```

---

## Messaging Module (`tamizhi.messaging.v1`)

### Query — GetSessionID

Returns the session identity registered for a wallet address.

```bash
grpcurl -plaintext \
  -d '{"wallet_address": "tamizhi1qnk2n4nlkpw9xfqntladh74er2xa62wdn2"}' \
  localhost:9090 tamizhi.messaging.v1.Query/GetSessionID
```

### Query — GetSessionIDByPubKey

Looks up a session identity by session public key.

```bash
grpcurl -plaintext \
  -d '{"pub_key": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"}' \
  localhost:9090 tamizhi.messaging.v1.Query/GetSessionIDByPubKey
```

### Query — GetGroup

Returns details for a group conversation by ID.

```bash
grpcurl -plaintext \
  -d '{"group_id": "grp-0001"}' \
  localhost:9090 tamizhi.messaging.v1.Query/GetGroup
```

### Query — ListGroupsByMember

Lists all groups that include a given session public key as a member.

```bash
grpcurl -plaintext \
  -d '{"session_pub_key": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"}' \
  localhost:9090 tamizhi.messaging.v1.Query/ListGroupsByMember
```

### Query — ListActiveNodes

Returns the service nodes available for encrypted message routing.

```bash
grpcurl -plaintext localhost:9090 tamizhi.messaging.v1.Query/ListActiveNodes
```

### Msg — RegisterSessionID

Registers a new session identity (wallet → session pub key mapping).

```bash
grpcurl -plaintext \
  -d '{
    "wallet_address":  "tamizhi1qnk2n4nlkpw9xfqntladh74er2xa62wdn2",
    "session_pub_key": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    "display_name":    "Alice"
  }' \
  localhost:9090 tamizhi.messaging.v1.Msg/RegisterSessionID
```

### Msg — UpdateSessionID

Updates display name or avatar for an existing session identity.

```bash
grpcurl -plaintext \
  -d '{
    "creator":         "tamizhi1qnk2n4nlkpw9xfqntladh74er2xa62wdn2",
    "session_pub_key": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    "display_name":    "Alice (updated)",
    "avatar_ipfs":     "QmAvatarCid123abc"
  }' \
  localhost:9090 tamizhi.messaging.v1.Msg/UpdateSessionID
```

### Msg — CreateGroup

Creates a new group conversation.

```bash
grpcurl -plaintext \
  -d '{
    "creator":     "tamizhi1qnk2n4nlkpw9xfqntladh74er2xa62wdn2",
    "name":        "Engineering Team",
    "description": "Internal comms for engineering",
    "encrypted":   true
  }' \
  localhost:9090 tamizhi.messaging.v1.Msg/CreateGroup
```

### Msg — AddGroupMember

Adds a participant to an existing group.

```bash
grpcurl -plaintext \
  -d '{
    "creator":                "tamizhi1qnk2n4nlkpw9xfqntladh74er2xa62wdn2",
    "group_id":               "grp-0001",
    "member_session_pub_key": "02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5"
  }' \
  localhost:9090 tamizhi.messaging.v1.Msg/AddGroupMember
```

### Msg — RemoveGroupMember

Removes a participant from a group.

```bash
grpcurl -plaintext \
  -d '{
    "creator":                "tamizhi1qnk2n4nlkpw9xfqntladh74er2xa62wdn2",
    "group_id":               "grp-0001",
    "member_session_pub_key": "02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5"
  }' \
  localhost:9090 tamizhi.messaging.v1.Msg/RemoveGroupMember
```

---

## Using with CosmJS / TypeScript

```typescript
import { StargateClient } from "@cosmjs/stargate";

const client = await StargateClient.connect("http://localhost:26657");

// Query via REST (port 1317)
const res = await fetch(
  "http://localhost:1317/tamizhi/rewards/v1/rules"
);
const { rules } = await res.json();
console.log(rules);
```

---

## Error Codes

| gRPC Code | HTTP Status | Meaning |
|-----------|-------------|---------|
| OK (0) | 200 | Success |
| INVALID_ARGUMENT (3) | 400 | Bad request parameters |
| NOT_FOUND (5) | 404 | Resource does not exist |
| ALREADY_EXISTS (6) | 409 | Duplicate resource |
| PERMISSION_DENIED (7) | 403 | Not authorized |
| RESOURCE_EXHAUSTED (8) | 429 | Rate limit exceeded |
| INTERNAL (13) | 500 | Server error |

---

## Configuring the Node for Remote gRPC Access

In `~/.tamizhi/config/app.toml`:

```toml
[grpc]
enable = true
address = "0.0.0.0:9090"

[grpc-web]
enable = true
address = "0.0.0.0:9091"
```

Restart the node after changing these values.

> **TLS**: For production deployments, place a TLS-terminating reverse proxy
> (nginx, Caddy, or Envoy) in front of port 9090. Drop the `-plaintext` flag
> and point grpcurl at the TLS endpoint instead.
