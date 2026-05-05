/**
 * Entry point for the Tamizhi block indexer process.
 * Run with: ts-node src/indexer/main.ts  (dev)
 *      or:  node dist/indexer/main.js   (prod)
 */
import { getPool, closePool } from '../db/client';
import { Indexer } from './indexer';

async function main(): Promise<void> {
  const pool    = getPool();
  const indexer = new Indexer(pool);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down indexer...`);
    await closePool();
    process.exit(0);
  };
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await indexer.run();
}

main().catch((err) => {
  console.error('Fatal indexer error:', err);
  process.exit(1);
});
