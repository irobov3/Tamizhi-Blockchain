import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getPool, query, closePool } from '../db/client';

// Route handlers
import blocksRouter       from './routes/blocks';
import transactionsRouter from './routes/transactions';
import rewardsRouter      from './routes/rewards';
import nodesRouter        from './routes/nodes';
import accesslogRouter    from './routes/accesslog';
import literatureRouter   from './routes/literature';

const PORT = parseInt(process.env.PORT || '3001');
const app  = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.url}`);
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/blocks`,      blocksRouter);
app.use(`${API_PREFIX}/txs`,         transactionsRouter);
app.use(`${API_PREFIX}/rewards`,     rewardsRouter);
app.use(`${API_PREFIX}/nodes`,       nodesRouter);
app.use(`${API_PREFIX}/accesslog`,   accesslogRouter);
app.use(`${API_PREFIX}/literature`,  literatureRouter);

// ---------------------------------------------------------------------------
// GET /api/v1/stats — chain-wide summary
// ---------------------------------------------------------------------------
app.get(`${API_PREFIX}/stats`, async (_req: Request, res: Response) => {
  try {
    const [
      blocksRes,
      txRes,
      rewardRes,
      nodeRes,
      accessRes,
      litRes,
      latestBlockRes,
      rewardAmountRes,
    ] = await Promise.all([
      query('SELECT COUNT(*) AS total FROM blocks'),
      query('SELECT COUNT(*) AS total FROM transactions'),
      query('SELECT COUNT(*) AS total FROM reward_events'),
      query('SELECT COUNT(DISTINCT node_id) AS total FROM node_events'),
      query('SELECT COUNT(*) AS total FROM access_log_entries'),
      query('SELECT COUNT(*) AS total FROM literature_works'),
      query('SELECT height, hash, time FROM blocks ORDER BY height DESC LIMIT 1'),
      query(
        `SELECT denom, SUM(amount) AS total_amount
         FROM reward_events
         GROUP BY denom`
      ),
    ]);

    res.json({
      total_blocks:       parseInt(blocksRes.rows[0].total),
      total_transactions: parseInt(txRes.rows[0].total),
      total_reward_events: parseInt(rewardRes.rows[0].total),
      total_nodes:        parseInt(nodeRes.rows[0].total),
      total_access_logs:  parseInt(accessRes.rows[0].total),
      total_literature_works: parseInt(litRes.rows[0].total),
      latest_block:       latestBlockRes.rows[0] || null,
      reward_totals_by_denom: rewardAmountRes.rows,
    });
  } catch (err) {
    console.error('GET /stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /health — liveness probe
// ---------------------------------------------------------------------------
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', error: 'Database unreachable' });
  }
});

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  // Verify DB connection on startup
  try {
    await query('SELECT 1');
    console.log('Database connection established.');
  } catch (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Tamizhi Explorer API listening on port ${PORT}`);
    console.log(`Base URL: http://localhost:${PORT}${API_PREFIX}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down API server...`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Fatal API server error:', err);
  process.exit(1);
});

export default app;
