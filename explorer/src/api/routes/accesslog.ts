import { Router, Request, Response } from 'express';
import { query } from '../../db/client';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/v1/accesslog
// Query params: employee_id, action, limit, offset
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit      = Math.min(parseInt((req.query.limit  as string) || '20'), 100);
    const offset     = Math.max(parseInt((req.query.offset as string) || '0'),   0);
    const employeeId = (req.query.employee_id as string) || null;
    const action     = (req.query.action      as string) || null;
    const fileName   = (req.query.file_name   as string) || null;

    const conditions: string[] = [];
    const params: unknown[]    = [];

    if (employeeId) {
      params.push(employeeId);
      conditions.push(`employee_id = $${params.length}`);
    }
    if (action) {
      params.push(action);
      conditions.push(`action = $${params.length}`);
    }
    if (fileName) {
      params.push(`%${fileName}%`);
      conditions.push(`file_name ILIKE $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) AS total FROM access_log_entries ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].total);

    params.push(limit, offset);
    const dataRes = await query(
      `SELECT id, tx_hash, height, employee_id, file_name, file_hash, action, time
       FROM access_log_entries
       ${where}
       ORDER BY time DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      access_logs: dataRes.rows,
      pagination:  { limit, offset, total },
    });
  } catch (err) {
    console.error('GET /accesslog error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/accesslog/:id
// Returns a single access log entry by its on-chain ID.
// ---------------------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid id parameter' });
      return;
    }

    const result = await query(
      `SELECT id, tx_hash, height, employee_id, file_name, file_hash, action, time
       FROM access_log_entries
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: `Access log entry ${id} not found` });
      return;
    }

    res.json({ access_log: result.rows[0] });
  } catch (err) {
    console.error('GET /accesslog/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
