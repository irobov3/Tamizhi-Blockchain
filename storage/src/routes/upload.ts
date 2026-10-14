import { Router, Request, Response, NextFunction } from 'express';
import { multerUpload as _multerUpload } from '../index';
// Cast to any to avoid cross-package @types/express version conflicts
const multerUpload = _multerUpload as any;
import { uploadToIPFS } from '../ipfs/client';
import { computeSHA256 } from '../utils/hash';
import { logger } from '../utils/logger';

const router = Router();

const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs';

/**
 * POST /upload
 * Accept a multipart file upload, compute SHA-256, store on IPFS.
 */
router.post('/', multerUpload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Bad Request', message: 'No file provided. Use field name "file".' });
    }

    const { buffer, originalname, mimetype, size } = req.file;

    const [sha256Hash, ipfsResult] = await Promise.all([
      Promise.resolve(computeSHA256(buffer)),
      uploadToIPFS(buffer, originalname),
    ]);

    const { cid } = ipfsResult;
    const ipfsUrl = `${IPFS_GATEWAY}/${cid}`;

    logger.info(`File uploaded: ${originalname} -> CID=${cid}`);

    return res.status(201).json({
      cid,
      sha256Hash,
      size,
      mimeType: mimetype,
      filename: originalname,
      ipfsUrl,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /upload/text
 * Accept JSON { content: string, filename: string }, store as text on IPFS.
 */
router.post('/text', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, filename } = req.body as { content?: string; filename?: string };

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: 'Field "content" is required and must be a string.' });
    }

    const safeFilename = filename || `text-${Date.now()}.txt`;
    const buffer = Buffer.from(content, 'utf-8');
    const mimeType = 'text/plain';

    const [sha256Hash, ipfsResult] = await Promise.all([
      Promise.resolve(computeSHA256(buffer)),
      uploadToIPFS(buffer, safeFilename),
    ]);

    const { cid, size } = ipfsResult;
    const ipfsUrl = `${IPFS_GATEWAY}/${cid}`;

    logger.info(`Text uploaded: ${safeFilename} -> CID=${cid}`);

    return res.status(201).json({
      cid,
      sha256Hash,
      size,
      mimeType,
      filename: safeFilename,
      ipfsUrl,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
