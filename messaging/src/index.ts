import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import cors from 'cors';
import helmet from 'helmet';
import { createLogger, format, transports } from 'winston';
import { verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger({
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const PORT = parseInt(process.env.PORT ?? '4000', 10);
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const JWT_SECRET = process.env.JWT_SECRET ?? 'tamizhi-secret';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';
const MSG_TTL = 60 * 60 * 24 * 30; // 30 days in seconds

const app = express();
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tamizhi-messaging', timestamp: new Date().toISOString() });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Redis clients for pub/sub adapter
const pubClient = new Redis(REDIS_URL);
const subClient = pubClient.duplicate();
const storeClient = new Redis(REDIS_URL);

// Authenticate socket connections via JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('Authentication required'));
  try {
    const payload = verify(token, JWT_SECRET) as { address: string };
    (socket as any).walletAddress = payload.address;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const address: string = (socket as any).walletAddress;
  logger.info('Client connected', { address, socketId: socket.id });

  // Join personal room
  void socket.join(address);

  // Send pending messages from Redis
  void (async () => {
    const key = `messages:${address}`;
    const pending = await storeClient.lrange(key, 0, -1);
    for (const raw of pending) {
      try { socket.emit('message:receive', JSON.parse(raw)); } catch {}
    }
  })();

  socket.on('message:send', async (data: { to: string; encryptedContent: string; nonce: string; messageType?: string }) => {
    if (!data.to || !data.encryptedContent) return;

    const message = {
      id: uuidv4(),
      from: address,
      to: data.to,
      encryptedContent: data.encryptedContent,
      nonce: data.nonce,
      messageType: data.messageType ?? 'TEXT',
      timestamp: Date.now(),
      status: 'SENT',
    };

    // Store in Redis for offline delivery
    const key = `messages:${data.to}`;
    await storeClient.lpush(key, JSON.stringify(message));
    await storeClient.expire(key, MSG_TTL);

    // Deliver if recipient online
    io.to(data.to).emit('message:receive', message);

    // Confirm delivery to sender
    socket.emit('message:sent', { id: message.id, status: 'SENT' });
    logger.info('Message sent', { from: address, to: data.to, id: message.id });
  });

  socket.on('message:ack', async (data: { messageId: string; from: string }) => {
    // Remove acknowledged message from pending store
    const key = `messages:${address}`;
    const msgs = await storeClient.lrange(key, 0, -1);
    for (const raw of msgs) {
      try {
        const parsed = JSON.parse(raw) as { id: string };
        if (parsed.id === data.messageId) {
          await storeClient.lrem(key, 1, raw);
          break;
        }
      } catch {}
    }
    // Notify sender of delivery
    if (data.from) {
      io.to(data.from).emit('message:delivered', { id: data.messageId });
    }
  });

  socket.on('typing:start', (data: { to: string }) => {
    if (data.to) io.to(data.to).emit('typing:start', { from: address });
  });

  socket.on('typing:stop', (data: { to: string }) => {
    if (data.to) io.to(data.to).emit('typing:stop', { from: address });
  });

  socket.on('read:receipt', (data: { from: string; messageId: string }) => {
    if (data.from) io.to(data.from).emit('message:read', { id: data.messageId, by: address });
  });

  socket.on('disconnect', (reason) => {
    logger.info('Client disconnected', { address, reason });
  });

  socket.on('error', (err) => {
    logger.error('Socket error', { address, error: err.message });
  });
});

async function start() {
  // ioredis connects automatically on instantiation; wait for ready state
  await Promise.all([
    new Promise<void>((resolve, reject) => { pubClient.once('ready', resolve); pubClient.once('error', reject); }),
    new Promise<void>((resolve, reject) => { subClient.once('ready', resolve); subClient.once('error', reject); }),
    new Promise<void>((resolve, reject) => { storeClient.once('ready', resolve); storeClient.once('error', reject); }),
  ]);
  io.adapter(createAdapter(pubClient, subClient));
  httpServer.listen(PORT, () => {
    logger.info(`Tamizhi Messaging Service running on port ${PORT}`);
  });
}

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  io.close();
  await pubClient.quit();
  await subClient.quit();
  await storeClient.quit();
  process.exit(0);
});

start().catch((err) => {
  logger.error('Failed to start', err);
  process.exit(1);
});
