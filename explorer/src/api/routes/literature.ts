import { Router, Request, Response } from 'express';
import { query } from '../../db/client';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/v1/literature
// Query params: author, work_type, language, verified (true/false), limit, offset
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit    = Math.min(parseInt((req.query.limit  as string) || '20'), 100);
    const offset   = Math.max(parseInt((req.query.offset as string) || '0'),   0);
    const author   = (req.query.author    as string) || null;
    const workType = (req.query.work_type as string) || null;
    const language = (req.query.language  as string) || null;
    const verifiedStr = req.query.verified as string | undefined;

    const conditions: string[] = [];
    const params: unknown[]    = [];

    if (author) {
      params.push(author);
      conditions.push(`author = $${params.length}`);
    }
    if (workType) {
      params.push(workType);
      conditions.push(`work_type = $${params.length}`);
    }
    if (language) {
      params.push(language);
      conditions.push(`language = $${params.length}`);
    }
    if (verifiedStr !== undefined) {
      params.push(verifiedStr === 'true');
      conditions.push(`verified = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) AS total FROM literature_works ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].total);

    params.push(limit, offset);
    const dataRes = await query(
      `SELECT work_id, tx_hash, height, title, author, work_type, language,
              content_hash, verified, time
       FROM literature_works
       ${where}
       ORDER BY time DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      works:      dataRes.rows,
      pagination: { limit, offset, total },
    });
  } catch (err) {
    console.error('GET /literature error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/literature/:work_id
// ---------------------------------------------------------------------------
router.get('/:work_id', async (req: Request, res: Response) => {
  try {
    const workId = req.params.work_id;

    const result = await query(
      `SELECT work_id, tx_hash, height, title, author, work_type, language,
              content_hash, verified, time
       FROM literature_works
       WHERE work_id = $1`,
      [workId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: `Literature work ${workId} not found` });
      return;
    }

    const work = result.rows[0];

    // Fetch the originating transaction for extra context
    let tx = null;
    if (work.tx_hash) {
      const txRes = await query(
        `SELECT hash, height, sender, msg_types, time
         FROM transactions WHERE hash = $1`,
        [work.tx_hash]
      );
      tx = txRes.rows[0] || null;
    }

    res.json({ work, transaction: tx });
  } catch (err) {
    console.error('GET /literature/:work_id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
