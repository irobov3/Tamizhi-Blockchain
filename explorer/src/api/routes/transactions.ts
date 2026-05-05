import { Router, Request, Response } from 'express';
import { query } from '../../db/client';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/v1/txs
// Query params: sender, height, limit (default 20 max 100), offset (default 0)
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit  = Math.min(parseInt((req.query.limit  as string) || '20'), 100);
    const offset = Math.max(parseInt((req.query.offset as string) || '0'),   0);
    const sender = (req.query.sender as string) || null;
    const height = req.query.height ? parseInt(req.query.height as string) : null;

    const conditions: string[] = [];
    const params: unknown[]    = [];

    if (sender) {
      params.push(sender);
      conditions.push(`sender = $${params.length}`);
    }
    if (height !== null && !isNaN(height)) {
      params.push(height);
      conditions.push(`height = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countRes = await query(
      `SELECT COUNT(*) AS total FROM transactions ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].total);

    // Data query
    params.push(limit, offset);
    const txRes = await query(
      `SELECT hash, height, index, sender, msg_types, code,
              gas_used, gas_wanted, fee_amount, fee_denom, memo, time, raw_log, created_at
       FROM transactions
       ${where}
       ORDER BY time DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      transactions: txRes.rows,
      pagination:   { limit, offset, total },
    });
  } catch (err) {
    console.error('GET /txs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/txs/:hash
// ---------------------------------------------------------------------------
router.get('/:hash', async (req: Request, res: Response) => {
  try {
    const hash = req.params.hash.toUpperCase();

    const txRes = await query(
      `SELECT hash, height, index, sender, msg_types, code,
              gas_used, gas_wanted, fee_amount, fee_denom, memo, time, raw_log, created_at
       FROM transactions
       WHERE hash = $1`,
      [hash]
    );

    if (txRes.rows.length === 0) {
      res.status(404).json({ error: `Transaction ${hash} not found` });
      return;
    }

    const tx     = txRes.rows[0];
    const height = tx.height;

    // Fetch domain events associated with this tx
    const [rewardRes, nodeRes, accessRes, litRes] = await Promise.all([
      query(
        `SELECT id, employee_id, rule_id, amount, denom, time
         FROM reward_events WHERE tx_hash = $1 ORDER BY id`,
        [hash]
      ),
      query(
        `SELECT id, node_id, owner, event_type, swarm_id, time
         FROM node_events WHERE tx_hash = $1 ORDER BY id`,
        [hash]
      ),
      query(
        `SELECT id, employee_id, file_name, file_hash, action, time
         FROM access_log_entries WHERE tx_hash = $1 ORDER BY id`,
        [hash]
      ),
      query(
        `SELECT work_id, title, author, work_type, language, content_hash, verified, time
         FROM literature_works WHERE tx_hash = $1`,
        [hash]
      ),
    ]);

    // Also attach the block info
    const blockRes = await query(
      `SELECT height, hash AS block_hash, time, proposer
       FROM blocks WHERE height = $1`,
      [height]
    );

    res.json({
      transaction:    tx,
      block:          blockRes.rows[0] || null,
      reward_events:  rewardRes.rows,
      node_events:    nodeRes.rows,
      access_logs:    accessRes.rows,
      literature:     litRes.rows,
    });
  } catch (err) {
    console.error('GET /txs/:hash error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
