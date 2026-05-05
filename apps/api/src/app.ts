import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { env } from './lib/env.js';

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
  },
});

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cors, {
  origin: env.APP_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
});
await app.register(cookie);
await app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Routes registered in Epic 1+
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
