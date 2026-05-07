import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { env } from './lib/env.js';
import jwtPlugin from './plugins/jwt.js';
import authPlugin from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { friendRoutes } from './routes/friends.js';

const app = Fastify({
  logger:
    env.NODE_ENV === 'production'
      ? { level: 'info' }
      : { level: 'debug', transport: { target: 'pino-pretty' } },
});

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cors, {
  origin: env.APP_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
});
await app.register(cookie);
await app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 },
});
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

await app.register(jwtPlugin);
await app.register(authPlugin);

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

await app.register(authRoutes);
await app.register(userRoutes);
await app.register(friendRoutes);

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
