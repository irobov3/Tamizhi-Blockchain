import { Router, Request, Response } from 'express';
import { query } from '../../db/client';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/v1/nodes
// Query params: node_id, owner, event_type, swarm_id, limit, offset
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit     = Math.min(parseInt((req.query.limit  as string) || '20'), 100);
    const offset    = Math.max(parseInt((req.query.offset as string) || '0'),   0);
    const nodeId    = (req.query.node_id    as string) || null;
    const owner     = (req.query.owner      as string) || null;
    const eventType = (req.query.event_type as string) || null;
    const swarmId   = (req.query.swarm_id   as string) || null;

    const conditions: string[] = [];
    const params: unknown[]    = [];

    if (nodeId) {
      params.push(nodeId);
      conditions.push(`node_id = $${params.length}`);
    }
    if (owner) {
      params.push(owner);
      conditions.push(`owner = $${params.length}`);
    }
    if (eventType) {
      params.push(eventType);
      conditions.push(`event_type = $${params.length}`);
    }
    if (swarmId) {
      params.push(swarmId);
      conditions.push(`swarm_id = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) AS total FROM node_events ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].total);

    params.push(limit, offset);
    const dataRes = await query(
      `SELECT id, tx_hash, height, node_id, owner, event_type, swarm_id, time
       FROM node_events
       ${where}
       ORDER BY time DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      node_events: dataRes.rows,
      pagination:  { limit, offset, total },
    });
  } catch (err) {
    console.error('GET /nodes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/nodes/:node_id
// Returns the full event history for a specific node.
// ---------------------------------------------------------------------------
router.get('/:node_id', async (req: Request, res: Response) => {
  try {
    const nodeId = req.params.node_id;

    const eventsRes = await query(
      `SELECT id, tx_hash, height, node_id, owner, event_type, swarm_id, time
       FROM node_events
       WHERE node_id = $1
       ORDER BY time ASC`,
      [nodeId]
    );

    if (eventsRes.rows.length === 0) {
      res.status(404).json({ error: `No events found for node ${nodeId}` });
      return;
    }

    // Derive current state from event history
    const events = eventsRes.rows;
    const lastEvent = events[events.length - 1];
    const currentStatus = lastEvent.event_type; // e.g. 'registered', 'jailed'

    res.json({
      node_id:        nodeId,
      current_status: currentStatus,
      owner:          lastEvent.owner,
      swarm_id:       lastEvent.swarm_id,
      event_history:  events,
    });
  } catch (err) {
    console.error('GET /nodes/:node_id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
