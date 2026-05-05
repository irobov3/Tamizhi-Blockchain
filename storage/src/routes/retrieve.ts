import { Router, Request, Response, NextFunction } from 'express';
import { getFromIPFS, checkHealth, getIPFSStats } from '../ipfs/client';
import { logger } from '../utils/logger';

const router = Router();

const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs';

/**
 * Determine a reasonable Content-Type from the raw bytes (magic bytes).
 * Falls back to application/octet-stream.
 */
function detectMimeType(buffer: Buffer): string {
  // PDF: %PDF
  if (buffer.length >= 4 && buffer.slice(0, 4).toString('ascii') === '%PDF') {
    return 'application/pdf';
  }
  // HTML: <!DO or <html
  const start = buffer.slice(0, 15).toString('utf-8').toLowerCase();
  if (start.includes('<!do') || start.includes('<html')) {
    return 'text/html; charset=utf-8';
  }
  // Default: try UTF-8 text
  try {
    buffer.toString('utf-8');
    return 'text/plain; charset=utf-8';
  } catch {
    return 'application/octet-stream';
  }
}

/**
 * GET /file/:cid
 * Fetch content from IPFS and stream to response.
 */
router.get('/:cid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cid } = req.params;

    if (!cid || !/^[a-zA-Z0-9]+$/.test(cid)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid CID format.' });
    }

    logger.info(`Retrieve request for CID: ${cid}`);

    const buffer = await getFromIPFS(cid);
    const contentType = detectMimeType(buffer);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-IPFS-CID', cid);

    return res.send(buffer);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /info/:cid
 * Return metadata about a CID without downloading the full content.
 */
router.get('/info/:cid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cid } = req.params;

    if (!cid || !/^[a-zA-Z0-9]+$/.test(cid)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid CID format.' });
    }

    // Fetch the first 512 bytes to detect MIME type
    const buffer = await getFromIPFS(cid);
    const contentType = detectMimeType(buffer);

    return res.json({
      cid,
      size: buffer.length,
      mimeType: contentType,
      ipfsUrl: `${IPFS_GATEWAY}/${cid}`,
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /health
 * Health check endpoint.
 */
router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const ipfsHealthy = await checkHealth();

    const status = ipfsHealthy ? 'ok' : 'degraded';
    const httpStatus = ipfsHealthy ? 200 : 503;

    return res.status(httpStatus).json({
      status,
      service: 'tamizhi-storage',
      ipfs: ipfsHealthy,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
