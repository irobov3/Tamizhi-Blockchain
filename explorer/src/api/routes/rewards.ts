import { Router, Request, Response } from 'express';
import { query } from '../../db/client';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/v1/rewards
// Query params: employee_id, rule_id, limit (default 20 max 100), offset
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit      = Math.min(parseInt((req.query.limit  as string) || '20'), 100);
    const offset     = Math.max(parseInt((req.query.offset as string) || '0'),   0);
    const employeeId = (req.query.employee_id as string) || null;
    const ruleId     = (req.query.rule_id     as string) || null;

    const conditions: string[] = [];
    const params: unknown[]    = [];

    if (employeeId) {
      params.push(employeeId);
      conditions.push(`employee_id = $${params.length}`);
    }
    if (ruleId) {
      params.push(ruleId);
      conditions.push(`rule_id = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) AS total FROM reward_events ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].total);

    params.push(limit, offset);
    const dataRes = await query(
      `SELECT id, tx_hash, height, employee_id, rule_id, amount, denom, time
       FROM reward_events
       ${where}
       ORDER BY time DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      rewards:    dataRes.rows,
      pagination: { limit, offset, total },
    });
  } catch (err) {
    console.error('GET /rewards error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/rewards/summary?employee_id=xxx
// Returns total rewards grouped by denom for the given employee.
// ---------------------------------------------------------------------------
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const employeeId = (req.query.employee_id as string) || null;

    const params: unknown[]  = [];
    const conditions: string[] = [];

    if (employeeId) {
      params.push(employeeId);
      conditions.push(`employee_id = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const res1 = await query(
      `SELECT employee_id, denom, SUM(amount) AS total_amount, COUNT(*) AS event_count
       FROM reward_events
       ${where}
       GROUP BY employee_id, denom
       ORDER BY total_amount DESC`,
      params
    );

    res.json({ summary: res1.rows });
  } catch (err) {
    console.error('GET /rewards/summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
