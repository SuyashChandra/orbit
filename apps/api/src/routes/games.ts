import type { FastifyInstance } from 'fastify';
import { and, desc, eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { badmintonGames, gameParticipants, users, friends } from '../db/schema.js';
import { sendPushToUser } from '../lib/push.js';
import { env } from '../lib/env.js';
import type { BadmintonGameDTO } from '@orbit/shared';
import { GAME_STATUS } from '@orbit/shared';

async function buildGameDTO(game: typeof badmintonGames.$inferSelect): Promise<BadmintonGameDTO> {
  const [creator] = await db
    .select({ id: users.id, name: users.name, avatar: users.avatar })
    .from(users)
    .where(eq(users.id, game.creatorId))
    .limit(1);

  const participants = await db
    .select({ gp: gameParticipants, u: users })
    .from(gameParticipants)
    .innerJoin(users, eq(users.id, gameParticipants.userId))
    .where(eq(gameParticipants.gameId, game.id));

  return {
    id: game.id,
    creator: creator ?? { id: game.creatorId, name: 'Unknown', avatar: null },
    scheduledAt: game.scheduledAt.toISOString(),
    location: game.location,
    notes: game.notes,
    status: game.status,
    createdAt: game.createdAt.toISOString(),
    participants: participants.map(({ gp, u }) => ({
      userId: u.id,
      name: u.name,
      avatar: u.avatar,
      status: gp.status,
    })),
  };
}

async function areFriends(userAId: string, userBId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: friends.id })
    .from(friends)
    .where(
      and(
        eq(friends.status, 'accepted'),
        or(
          and(eq(friends.userId, userAId), eq(friends.friendId, userBId)),
          and(eq(friends.userId, userBId), eq(friends.friendId, userAId)),
        ),
      ),
    )
    .limit(1);
  return !!row;
}

const createSchema = z.object({
  scheduledAt: z.string().datetime(),
  location: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
});

const updateSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  location: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(GAME_STATUS).optional(),
});

export async function gameRoutes(app: FastifyInstance) {
  // GET /games — user's games (created + participating)
  app.get<{ Querystring: { tab?: string } }>(
    '/games',
    { preHandler: app.authenticate },
    async (req) => {
      const userId = req.user.sub;

      const created = await db
        .select()
        .from(badmintonGames)
        .where(eq(badmintonGames.creatorId, userId))
        .orderBy(desc(badmintonGames.scheduledAt));

      const participating = await db
        .select({ game: badmintonGames })
        .from(gameParticipants)
        .innerJoin(badmintonGames, eq(badmintonGames.id, gameParticipants.gameId))
        .where(
          and(eq(gameParticipants.userId, userId), eq(gameParticipants.status, 'accepted')),
        )
        .orderBy(desc(badmintonGames.scheduledAt));

      const allIds = new Set<string>();
      const all: (typeof badmintonGames.$inferSelect)[] = [];
      for (const g of [...created, ...participating.map((r) => r.game)]) {
        if (!allIds.has(g.id)) { allIds.add(g.id); all.push(g); }
      }
      all.sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());

      return Promise.all(all.map(buildGameDTO));
    },
  );

  // GET /games/:id — public (no auth) for share link
  app.get<{ Params: { id: string } }>('/games/:id', async (req, reply) => {
    const [game] = await db
      .select()
      .from(badmintonGames)
      .where(eq(badmintonGames.id, req.params.id))
      .limit(1);
    if (!game) return reply.status(404).send({ error: 'Not found' });
    return buildGameDTO(game);
  });

  // POST /games
  app.post<{ Body: unknown }>('/games', { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

    const { scheduledAt, location, notes } = parsed.data;
    const [game] = await db
      .insert(badmintonGames)
      .values({
        id: nanoid(),
        creatorId: req.user.sub,
        scheduledAt: new Date(scheduledAt),
        location: location ?? null,
        notes: notes ?? null,
      })
      .returning();

    return reply.status(201).send(await buildGameDTO(game!));
  });

  // PATCH /games/:id — creator only
  app.patch<{ Params: { id: string }; Body: unknown }>(
    '/games/:id',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

      const { scheduledAt, ...rest } = parsed.data;
      const [game] = await db
        .update(badmintonGames)
        .set({
          ...rest,
          ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(eq(badmintonGames.id, req.params.id), eq(badmintonGames.creatorId, req.user.sub)),
        )
        .returning();

      if (!game) return reply.status(404).send({ error: 'Not found or not creator' });
      return buildGameDTO(game);
    },
  );

  // DELETE /games/:id — creator only
  app.delete<{ Params: { id: string } }>(
    '/games/:id',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const [deleted] = await db
        .delete(badmintonGames)
        .where(
          and(eq(badmintonGames.id, req.params.id), eq(badmintonGames.creatorId, req.user.sub)),
        )
        .returning({ id: badmintonGames.id });
      if (!deleted) return reply.status(404).send({ error: 'Not found or not creator' });
      return { ok: true };
    },
  );

  // POST /games/:id/invite — creator invites a friend
  app.post<{ Params: { id: string }; Body: unknown }>(
    '/games/:id/invite',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = z.object({ userId: z.string() }).safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

      const creatorId = req.user.sub;
      const inviteeId = parsed.data.userId;

      const [game] = await db
        .select()
        .from(badmintonGames)
        .where(and(eq(badmintonGames.id, req.params.id), eq(badmintonGames.creatorId, creatorId)))
        .limit(1);
      if (!game) return reply.status(404).send({ error: 'Game not found or not creator' });

      if (!(await areFriends(creatorId, inviteeId))) {
        return reply.status(403).send({ error: 'Can only invite friends' });
      }

      await db
        .insert(gameParticipants)
        .values({ gameId: game.id, userId: inviteeId, status: 'invited' })
        .onConflictDoNothing();

      const [creator] = await db.select({ name: users.name }).from(users).where(eq(users.id, creatorId)).limit(1);

      await sendPushToUser(inviteeId, {
        title: 'You have a game invite!',
        body: `${creator?.name ?? 'Someone'} invited you to play badminton on ${game.scheduledAt.toLocaleDateString()}.`,
        url: `${env.APP_URL}/games/${game.id}`,
      });

      return buildGameDTO(game);
    },
  );

  // PATCH /games/:id/participants/:userId/respond — accept or decline
  app.patch<{ Params: { id: string; userId: string }; Body: unknown }>(
    '/games/:id/participants/:userId/respond',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = z.object({ status: z.enum(['accepted', 'declined']) }).safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

      if (req.params.userId !== req.user.sub) {
        return reply.status(403).send({ error: 'Can only respond for yourself' });
      }

      const [row] = await db
        .update(gameParticipants)
        .set({ status: parsed.data.status, updatedAt: new Date() })
        .where(
          and(
            eq(gameParticipants.gameId, req.params.id),
            eq(gameParticipants.userId, req.user.sub),
          ),
        )
        .returning();

      if (!row) return reply.status(404).send({ error: 'Invite not found' });

      const [game] = await db
        .select()
        .from(badmintonGames)
        .where(eq(badmintonGames.id, req.params.id))
        .limit(1);

      return buildGameDTO(game!);
    },
  );
}
