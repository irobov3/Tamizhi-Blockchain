import { Router, Request, Response, NextFunction } from 'express';
import { pinCID, unpinCID, listPinnedCIDs } from '../ipfs/client';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /pin/:cid
 * Pin a CID on the local IPFS node.
 */
router.post('/:cid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cid } = req.params;

    if (!cid || !/^[a-zA-Z0-9]+$/.test(cid)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid CID format.' });
    }

    await pinCID(cid);
    logger.info(`Pinned CID via API: ${cid}`);

    return res.json({
      success: true,
      cid,
      message: `CID ${cid} has been pinned successfully.`,
      pinnedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /pin/:cid
 * Unpin a CID from the local IPFS node.
 */
router.delete('/:cid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cid } = req.params;

    if (!cid || !/^[a-zA-Z0-9]+$/.test(cid)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid CID format.' });
    }

    await unpinCID(cid);
    logger.info(`Unpinned CID via API: ${cid}`);

    return res.json({
      success: true,
      cid,
      message: `CID ${cid} has been unpinned successfully.`,
      unpinnedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /pins
 * List all recursively pinned CIDs.
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pins = await listPinnedCIDs();
    logger.info(`Listed ${pins.length} pinned CIDs`);

    return res.json({
      count: pins.length,
      pins,
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
