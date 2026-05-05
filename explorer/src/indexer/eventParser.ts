import { PoolClient } from 'pg';

// ---------------------------------------------------------------------------
// Cosmos SDK / Tamizhi event types emitted in tx_results
// ---------------------------------------------------------------------------

export interface CosmosTxResult {
  code: number;
  data?: string;
  log?: string;
  info?: string;
  gas_wanted?: string;
  gas_used?: string;
  events?: CosmosEvent[];
  codespace?: string;
}

export interface CosmosEvent {
  type: string;
  attributes: CosmosAttribute[];
}

export interface CosmosAttribute {
  key: string;   // base64-encoded in older Cosmos SDK; plain text in v0.50+
  value: string;
  index?: boolean;
}

// ---------------------------------------------------------------------------
// Attribute decoding helpers
// ---------------------------------------------------------------------------

function decodeAttr(raw: string): string {
  if (!raw) return '';
  // Cosmos SDK v0.50 emits plain text; older nodes emit base64.
  // Try base64 first; fall back to the raw string.
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    // A valid base64-decoded string should not contain NUL bytes and should
    // be printable.  If it looks sane, use it; otherwise keep the raw value.
    if (/^[\x20-\x7E\t\n\r]*$/.test(decoded) && decoded.length > 0) {
      return decoded;
    }
  } catch {
    // ignore
  }
  return raw;
}

function attrMap(event: CosmosEvent): Record<string, string> {
  const m: Record<string, string> = {};
  for (const attr of event.attributes) {
    m[decodeAttr(attr.key)] = decodeAttr(attr.value);
  }
  return m;
}

// ---------------------------------------------------------------------------
// Tx-hash reconstruction
// ---------------------------------------------------------------------------

/**
 * Cosmos RPC /block_results does NOT include tx hashes in txs_results.
 * The caller must supply the hash (derived from /block → data.txs[i] bytes).
 */

// ---------------------------------------------------------------------------
// Per-event-type handlers
// ---------------------------------------------------------------------------

async function handleRewardEvent(
  client: PoolClient,
  txHash: string,
  height: number,
  time: string,
  event: CosmosEvent
): Promise<void> {
  const attrs = attrMap(event);

  // Expected attribute keys emitted by tamizhi/reward module:
  //   employee_id, rule_id, amount, denom
  const employeeId = attrs['employee_id'] || attrs['recipient'] || null;
  const ruleId = attrs['rule_id'] || attrs['rule'] || null;
  const rawAmount = attrs['amount'] || attrs['coins'] || '0';
  // Amount may be like "1000utmz" or just "1000"
  const amountMatch = rawAmount.match(/^(\d+)/);
  const amount = amountMatch ? parseInt(amountMatch[1]) : 0;
  const denom =
    attrs['denom'] ||
    (rawAmount.match(/[a-zA-Z]+$/) ? rawAmount.match(/[a-zA-Z]+$/)![0] : null);

  await client.query(
    `INSERT INTO reward_events(tx_hash, height, employee_id, rule_id, amount, denom, time)
     VALUES($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT DO NOTHING`,
    [txHash, height, employeeId, ruleId, amount, denom, time]
  );
}

async function handleNodeEvent(
  client: PoolClient,
  txHash: string,
  height: number,
  time: string,
  event: CosmosEvent
): Promise<void> {
  const attrs = attrMap(event);

  // Map event.type to a canonical event_type label
  const typeMap: Record<string, string> = {
    'tamizhi.node.EventNodeRegistered':   'registered',
    'tamizhi.node.EventNodeDeregistered': 'deregistered',
    'tamizhi.node.EventNodeJailed':       'jailed',
    'tamizhi.node.EventNodeSlashed':      'slashed',
    'node_registered':                    'registered',
    'node_deregistered':                  'deregistered',
    'node_jailed':                        'jailed',
    'node_slashed':                       'slashed',
  };
  const eventType = typeMap[event.type] || event.type;

  const nodeId  = attrs['node_id']  || attrs['node']  || null;
  const owner   = attrs['owner']    || attrs['creator'] || null;
  const swarmId = attrs['swarm_id'] || attrs['swarm']  || null;

  await client.query(
    `INSERT INTO node_events(tx_hash, height, node_id, owner, event_type, swarm_id, time)
     VALUES($1, $2, $3, $4, $5, $6, $7)`,
    [txHash, height, nodeId, owner, eventType, swarmId, time]
  );
}

async function handleAccessLogEvent(
  client: PoolClient,
  txHash: string,
  height: number,
  time: string,
  event: CosmosEvent
): Promise<void> {
  const attrs = attrMap(event);

  const rawId     = attrs['id'] || attrs['log_id'] || null;
  const id        = rawId ? parseInt(rawId) : null;
  const employeeId = attrs['employee_id'] || attrs['accessor'] || null;
  const fileName  = attrs['file_name']   || attrs['filename']  || null;
  const fileHash  = attrs['file_hash']   || attrs['hash']      || null;
  const action    = attrs['action']      || null;

  if (id === null) return; // cannot insert without primary key

  await client.query(
    `INSERT INTO access_log_entries(id, tx_hash, height, employee_id, file_name, file_hash, action, time)
     VALUES($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [id, txHash, height, employeeId, fileName, fileHash, action, time]
  );
}

async function handleLiteratureEvent(
  client: PoolClient,
  txHash: string,
  height: number,
  time: string,
  event: CosmosEvent
): Promise<void> {
  const attrs = attrMap(event);

  const workId      = attrs['work_id']      || attrs['id']       || null;
  const title       = attrs['title']        || null;
  const author      = attrs['author']       || null;
  const workType    = attrs['work_type']    || attrs['type']     || null;
  const language    = attrs['language']     || attrs['lang']     || null;
  const contentHash = attrs['content_hash'] || attrs['hash']     || null;
  const verified    = attrs['verified'] === 'true';

  if (!workId) return;

  await client.query(
    `INSERT INTO literature_works(work_id, tx_hash, height, title, author, work_type, language, content_hash, verified, time)
     VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (work_id) DO UPDATE
       SET verified = EXCLUDED.verified,
           tx_hash  = EXCLUDED.tx_hash`,
    [workId, txHash, height, title, author, workType, language, contentHash, verified, time]
  );
}

// ---------------------------------------------------------------------------
// Msg-type extraction from raw tx bytes
// ---------------------------------------------------------------------------

/**
 * Attempts to extract message type URLs from the Cosmos tx protobuf bytes
 * (base64-encoded as returned by /block).  Falls back to reading the
 * message_action attributes from events when proto parsing is not available.
 */
function extractMsgTypesFromEvents(events: CosmosEvent[]): string[] {
  const types: string[] = [];
  for (const ev of events) {
    if (ev.type === 'message') {
      for (const attr of ev.attributes) {
        const key = decodeAttr(attr.key);
        if (key === 'action' || key === 'msg_type_url') {
          const val = decodeAttr(attr.value);
          if (val && !types.includes(val)) types.push(val);
        }
      }
    }
  }
  return types;
}

function extractSenderFromEvents(events: CosmosEvent[]): string | null {
  for (const ev of events) {
    if (ev.type === 'message' || ev.type === 'coin_spent' || ev.type === 'transfer') {
      for (const attr of ev.attributes) {
        const key = decodeAttr(attr.key);
        if (key === 'sender' || key === 'spender') {
          return decodeAttr(attr.value) || null;
        }
      }
    }
  }
  return null;
}

function extractFeeFromEvents(
  events: CosmosEvent[]
): { amount: number | null; denom: string | null } {
  for (const ev of events) {
    if (ev.type === 'tx') {
      for (const attr of ev.attributes) {
        const key = decodeAttr(attr.key);
        if (key === 'fee') {
          const val = decodeAttr(attr.value); // e.g. "2000utmz"
          const m = val.match(/^(\d+)([a-zA-Z]+)?$/);
          if (m) {
            return { amount: parseInt(m[1]), denom: m[2] || null };
          }
        }
      }
    }
  }
  return { amount: null, denom: null };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Parses a single tx result from /block_results and writes all derived rows
 * (transaction + domain events) into the database inside the caller's
 * transaction.
 *
 * @param client    - active pg PoolClient (transaction already started)
 * @param height    - block height
 * @param time      - block time (ISO string)
 * @param txResult  - raw tx result from Tendermint /block_results
 * @param txHash    - hex-encoded tx hash (SHA256 of raw tx bytes)
 * @param txIndex   - 0-based position within the block
 */
export async function parseEvents(
  client: PoolClient,
  height: number,
  time: string,
  txResult: CosmosTxResult,
  txHash: string,
  txIndex: number
): Promise<void> {
  const events: CosmosEvent[] = txResult.events || [];

  // --- Extract common tx fields from events ---
  const msgTypes  = extractMsgTypesFromEvents(events);
  const sender    = extractSenderFromEvents(events);
  const { amount: feeAmount, denom: feeDenom } = extractFeeFromEvents(events);
  const gasUsed   = txResult.gas_used   ? parseInt(txResult.gas_used)   : null;
  const gasWanted = txResult.gas_wanted ? parseInt(txResult.gas_wanted) : null;
  const code      = txResult.code ?? 0;
  const rawLog    = txResult.log ?? null;

  // --- Insert transaction row ---
  await client.query(
    `INSERT INTO transactions(
       hash, height, index, sender, msg_types, code,
       gas_used, gas_wanted, fee_amount, fee_denom, time, raw_log
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (hash) DO NOTHING`,
    [
      txHash, height, txIndex, sender,
      msgTypes.length > 0 ? msgTypes : null,
      code, gasUsed, gasWanted, feeAmount, feeDenom, time, rawLog,
    ]
  );

  // --- Dispatch per-event-type handlers ---
  // Only process events from successful txs (code === 0)
  if (code !== 0) return;

  // Tamizhi module event type prefixes
  const REWARD_EVENT_TYPES = new Set([
    'tamizhi.reward.EventRewardDistributed',
    'tamizhi.reward.EventRewardMinted',
    'reward_distributed',
    'reward_minted',
  ]);

  const NODE_EVENT_TYPES = new Set([
    'tamizhi.node.EventNodeRegistered',
    'tamizhi.node.EventNodeDeregistered',
    'tamizhi.node.EventNodeJailed',
    'tamizhi.node.EventNodeSlashed',
    'node_registered',
    'node_deregistered',
    'node_jailed',
    'node_slashed',
  ]);

  const ACCESS_LOG_EVENT_TYPES = new Set([
    'tamizhi.accesslog.EventAccessLogged',
    'access_logged',
    'file_accessed',
  ]);

  const LITERATURE_EVENT_TYPES = new Set([
    'tamizhi.literature.EventWorkRegistered',
    'tamizhi.literature.EventWorkVerified',
    'work_registered',
    'work_verified',
  ]);

  for (const event of events) {
    try {
      if (REWARD_EVENT_TYPES.has(event.type)) {
        await handleRewardEvent(client, txHash, height, time, event);
      } else if (NODE_EVENT_TYPES.has(event.type)) {
        await handleNodeEvent(client, txHash, height, time, event);
      } else if (ACCESS_LOG_EVENT_TYPES.has(event.type)) {
        await handleAccessLogEvent(client, txHash, height, time, event);
      } else if (LITERATURE_EVENT_TYPES.has(event.type)) {
        await handleLiteratureEvent(client, txHash, height, time, event);
      }
      // Cosmos built-in events (message, coin_received, coin_spent, transfer,
      // fee_pay, etc.) are intentionally ignored — the data is captured via
      // the transaction row above.
    } catch (err) {
      console.error(
        `Error handling event type="${event.type}" at height=${height} tx=${txHash}:`,
        err
      );
      // Don't re-throw: a bad event shouldn't abort the whole block.
    }
  }
}
