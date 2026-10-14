import axios from 'axios';
import { Pool } from 'pg';
import crypto from 'crypto';
import { parseEvents, CosmosTxResult } from './eventParser';

const RPC_URL = process.env.RPC_URL || 'http://localhost:26657';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '3000');
// Maximum blocks to catch up per polling cycle (prevents overwhelming the node)
const MAX_BLOCKS_PER_CYCLE = parseInt(process.env.MAX_BLOCKS_PER_CYCLE || '100');

/**
 * Derive a Cosmos-style tx hash: SHA-256 of the raw tx bytes (base64-decoded).
 */
function txHash(base64Tx: string): string {
  const raw = Buffer.from(base64Tx, 'base64');
  return crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
}

export class Indexer {
  constructor(private db: Pool) {}

  async getLastIndexedHeight(): Promise<number> {
    const res = await this.db.query(
      "SELECT value FROM indexer_state WHERE key = 'last_indexed_height'"
    );
    return parseInt(res.rows[0]?.value ?? '0');
  }

  async setLastIndexedHeight(height: number): Promise<void> {
    await this.db.query(
      `UPDATE indexer_state
       SET value = $1, updated_at = NOW()
       WHERE key = 'last_indexed_height'`,
      [height.toString()]
    );
  }

  async getLatestChainHeight(): Promise<number> {
    const res = await axios.get(`${RPC_URL}/status`, { timeout: 5000 });
    return parseInt(res.data.result.sync_info.latest_block_height);
  }

  async indexBlock(height: number): Promise<void> {
    // Fetch block data and block results in parallel
    const [blockRes, resultsRes] = await Promise.all([
      axios.get(`${RPC_URL}/block?height=${height}`, { timeout: 10000 }),
      axios.get(`${RPC_URL}/block_results?height=${height}`, { timeout: 10000 }),
    ]);

    const block   = blockRes.data.result;
    const results = resultsRes.data.result;

    const blockHeader  = block.block.header;
    const blockId      = block.block_id;
    const rawTxs: string[] = block.block.data.txs ?? [];
    const txResults: CosmosTxResult[] = results.txs_results ?? [];

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Insert block
      await client.query(
        `INSERT INTO blocks(height, hash, time, proposer, tx_count)
         VALUES($1, $2, $3, $4, $5)
         ON CONFLICT (height) DO NOTHING`,
        [
          height,
          blockId.hash,
          blockHeader.time,
          blockHeader.proposer_address,
          rawTxs.length,
        ]
      );

      // Index each transaction
      for (let i = 0; i < rawTxs.length; i++) {
        const hash       = txHash(rawTxs[i]);
        const txResult   = txResults[i];

        if (!txResult) {
          // No tx result (e.g. failed to decode); insert minimal tx row
          await client.query(
            `INSERT INTO transactions(hash, height, index, code, time)
             VALUES($1, $2, $3, $4, $5)
             ON CONFLICT (hash) DO NOTHING`,
            [hash, height, i, -1, blockHeader.time]
          );
          continue;
        }

        await parseEvents(client, height, blockHeader.time, txResult, hash, i);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async run(): Promise<void> {
    console.log(
      `Indexer started. RPC=${RPC_URL}  poll=${POLL_INTERVAL_MS}ms  maxPerCycle=${MAX_BLOCKS_PER_CYCLE}`
    );

    while (true) {
      try {
        const lastHeight   = await this.getLastIndexedHeight();
        const latestHeight = await this.getLatestChainHeight();

        if (lastHeight >= latestHeight) {
          // Fully caught up — just wait
          await sleep(POLL_INTERVAL_MS);
          continue;
        }

        const upTo = Math.min(latestHeight, lastHeight + MAX_BLOCKS_PER_CYCLE);
        console.log(`Catching up: height ${lastHeight + 1}→${upTo} (chain tip: ${latestHeight})`);

        for (let h = lastHeight + 1; h <= upTo; h++) {
          console.log(`  indexing block ${h}/${latestHeight}...`);
          await this.indexBlock(h);
          await this.setLastIndexedHeight(h);
        }
      } catch (err) {
        console.error('Indexer error:', err instanceof Error ? err.message : err);
        // Back off briefly on error so we don't hammer a down node
        await sleep(Math.min(POLL_INTERVAL_MS * 3, 15000));
        continue;
      }

      await sleep(POLL_INTERVAL_MS);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
