import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { env } from '../lib/env.js';

export default fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '15m' },
  });
});
