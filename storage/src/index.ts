import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import multer from 'multer';
import path from 'path';
import { logger } from './utils/logger';
import uploadRouter from './routes/upload';
import retrieveRouter from './routes/retrieve';
import pinRouter from './routes/pin';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10);
const ALLOWED_MIME_TYPES = (process.env.ALLOWED_MIME_TYPES || 'text/plain,application/pdf,text/html')
  .split(',')
  .map((t) => t.trim());

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.http(message.trim()),
  },
}));

// JSON body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer configuration for file uploads
export const multerStorage = multer.memoryStorage();

export const multerUpload = multer({
  storage: multerStorage,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
    }
  },
});

// Routes
app.use('/upload', uploadRouter);
app.use('/file', retrieveRouter);
app.use('/info', retrieveRouter);
app.use('/health', retrieveRouter);
app.use('/pin', pinRouter);
app.use('/pins', pinRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested resource does not exist.' });
});

// Global error handler
app.use((err: Error & { status?: number; code?: string }, _req: Request, res: Response, _next: NextFunction) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File Too Large',
      message: `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB`,
    });
  }

  if (err.message && err.message.includes('not allowed')) {
    return res.status(415).json({
      error: 'Unsupported Media Type',
      message: err.message,
    });
  }

  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });

  return res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Tamizhi Storage Service running on port ${PORT}`);
  logger.info(`IPFS API: ${process.env.IPFS_API_URL || 'http://localhost:5001'}`);
  logger.info(`Max file size: ${MAX_FILE_SIZE_MB}MB`);
  logger.info(`Allowed MIME types: ${ALLOWED_MIME_TYPES.join(', ')}`);
});

export default app;
