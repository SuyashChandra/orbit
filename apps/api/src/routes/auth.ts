import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { users, refreshTokens } from '../db/schema.js';
import { env } from '../lib/env.js';

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
}

async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Google user info');
  return res.json() as Promise<GoogleUserInfo>;
}

const SCOPES = 'openid email profile';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function authRoutes(app: FastifyInstance) {
  // GET /auth/google — redirect to Google consent screen
  app.get('/auth/google', async (_req, reply) => {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: `${env.API_URL}/auth/google/callback`,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'online',
    });
    return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  // GET /auth/google/callback — exchange code, upsert user, issue tokens
  app.get<{ Querystring: { code?: string; error?: string } }>(
    '/auth/google/callback',
    async (req, reply) => {
      const { code, error } = req.query;
      if (error || !code) {
        return reply.redirect(`${env.APP_URL}/login?error=oauth_denied`);
      }

      // Exchange code for Google access token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${env.API_URL}/auth/google/callback`,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        app.log.error({ status: tokenRes.status }, 'Google token exchange failed');
        return reply.redirect(`${env.APP_URL}/login?error=oauth_failed`);
      }

      const { access_token } = (await tokenRes.json()) as GoogleTokenResponse;
      const googleUser = await fetchGoogleUserInfo(access_token);

      // Upsert user
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.googleId, googleUser.id))
        .limit(1);

      if (!user) {
        // Generate unique friend code
        let friendCode: string;
        let attempts = 0;
        do {
          friendCode = nanoid(6).toUpperCase();
          const [existing] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.friendCode, friendCode))
            .limit(1);
          if (!existing) break;
          attempts++;
        } while (attempts < 5);

        const [created] = await db
          .insert(users)
          .values({
            id: nanoid(),
            googleId: googleUser.id,
            email: googleUser.email,
            name: googleUser.name,
            avatar: googleUser.picture,
            friendCode: friendCode!,
          })
          .returning();
        user = created!;
      } else {
        // Update avatar/name in case they changed on Google
        const [updated] = await db
          .update(users)
          .set({ name: googleUser.name, avatar: googleUser.picture, updatedAt: new Date() })
          .where(eq(users.id, user.id))
          .returning();
        user = updated!;
      }

      // Issue JWT access token
      const accessToken = app.jwt.sign({ sub: user.id, email: user.email });

      // Issue refresh token — stored in DB + httpOnly cookie
      const rawRefreshToken = nanoid(64);
      const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
      await db.insert(refreshTokens).values({
        id: nanoid(),
        userId: user.id,
        token: rawRefreshToken,
        expiresAt,
      });

      reply.setCookie('refreshToken', rawRefreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/auth',
        expires: expiresAt,
      });

      // Redirect to frontend with access token in URL fragment (not query param — not logged)
      return reply.redirect(`${env.APP_URL}/auth/callback#token=${accessToken}`);
    },
  );

  // POST /auth/refresh — issue new access token from httpOnly refresh cookie
  app.post('/auth/refresh', async (req, reply) => {
    const raw = req.cookies['refreshToken'];
    if (!raw) return reply.status(401).send({ error: 'No refresh token' });

    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, raw))
      .limit(1);

    if (!stored || stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'Refresh token expired' });
    }

    const accessToken = app.jwt.sign({ sub: stored.userId, email: '' });
    return { accessToken };
  });

  // POST /auth/logout — delete refresh token
  app.post('/auth/logout', async (req, reply) => {
    const raw = req.cookies['refreshToken'];
    if (raw) {
      await db.delete(refreshTokens).where(eq(refreshTokens.token, raw));
    }
    reply.clearCookie('refreshToken', { path: '/auth' });
    return { ok: true };
  });
}
