import { Router, Request, Response } from 'express';
import { query } from '../../db/client';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/v1/blocks
// Query params: limit (default 20, max 100), offset (default 0)
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit  = Math.min(parseInt((req.query.limit  as string) || '20'), 100);
    const offset = Math.max(parseInt((req.query.offset as string) || '0'),   0);

    const result = await query(
      `SELECT height, hash, time, proposer, tx_count, created_at
       FROM blocks
       ORDER BY height DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countRes = await query('SELECT COUNT(*) AS total FROM blocks');
    const total    = parseInt(countRes.rows[0].total);

    res.json({
      blocks: result.rows,
      pagination: { limit, offset, total },
    });
  } catch (err) {
    console.error('GET /blocks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/blocks/:height
// ---------------------------------------------------------------------------
router.get('/:height', async (req: Request, res: Response) => {
  try {
    const height = parseInt(req.params.height);
    if (isNaN(height) || height < 0) {
      res.status(400).json({ error: 'Invalid height parameter' });
      return;
    }

    const blockRes = await query(
      `SELECT height, hash, time, proposer, tx_count, created_at
       FROM blocks WHERE height = $1`,
      [height]
    );

    if (blockRes.rows.length === 0) {
      res.status(404).json({ error: `Block at height ${height} not found` });
      return;
    }

    // Also fetch transactions for this block
    const txRes = await query(
      `SELECT hash, index, sender, msg_types, code, gas_used, gas_wanted,
              fee_amount, fee_denom, memo, time, raw_log
       FROM transactions
       WHERE height = $1
       ORDER BY index ASC`,
      [height]
    );

    res.json({
      block:        blockRes.rows[0],
      transactions: txRes.rows,
    });
  } catch (err) {
    console.error('GET /blocks/:height error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
