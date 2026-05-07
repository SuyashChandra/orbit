import type { FastifyInstance } from 'fastify';
import { and, eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { friends, users } from '../db/schema.js';
import type { FriendDTO } from '@orbit/shared';

type FriendStatus = 'pending' | 'accepted' | 'declined';

function toDTO(
  row: typeof friends.$inferSelect,
  otherUser: typeof users.$inferSelect,
): FriendDTO {
  return {
    id: row.id,
    user: {
      id: otherUser.id,
      name: otherUser.name,
      avatar: otherUser.avatar,
      friendCode: otherUser.friendCode,
    },
    status: row.status as FriendStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function friendRoutes(app: FastifyInstance) {
  // POST /friends/add — add by friend code
  app.post<{ Body: unknown }>(
    '/friends/add',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = z.object({ friendCode: z.string() }).safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

      const { friendCode } = parsed.data;
      const myId = req.user.sub;

      const [target] = await db
        .select()
        .from(users)
        .where(eq(users.friendCode, friendCode.toUpperCase()))
        .limit(1);

      if (!target) return reply.status(404).send({ error: 'User not found' });
      if (target.id === myId) return reply.status(400).send({ error: 'Cannot add yourself' });

      // Check if relationship already exists
      const [existing] = await db
        .select()
        .from(friends)
        .where(
          or(
            and(eq(friends.userId, myId), eq(friends.friendId, target.id)),
            and(eq(friends.userId, target.id), eq(friends.friendId, myId)),
          ),
        )
        .limit(1);

      if (existing) return reply.status(409).send({ error: 'Already connected or pending' });

      const [row] = await db
        .insert(friends)
        .values({ id: nanoid(), userId: myId, friendId: target.id, status: 'pending' })
        .returning();

      return toDTO(row!, target);
    },
  );

  // GET /friends/requests — incoming pending requests
  app.get('/friends/requests', { preHandler: app.authenticate }, async (req) => {
    const myId = req.user.sub;

    const rows = await db
      .select({ friend: friends, user: users })
      .from(friends)
      .innerJoin(users, eq(users.id, friends.userId))
      .where(and(eq(friends.friendId, myId), eq(friends.status, 'pending')));

    return rows.map(({ friend: row, user }) => toDTO(row, user));
  });

  // PATCH /friends/:id/accept
  app.patch<{ Params: { id: string } }>(
    '/friends/:id/accept',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const myId = req.user.sub;
      const [row] = await db
        .update(friends)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(and(eq(friends.id, req.params.id), eq(friends.friendId, myId)))
        .returning();

      if (!row) return reply.status(404).send({ error: 'Request not found' });

      const [otherUser] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
      return toDTO(row, otherUser!);
    },
  );

  // PATCH /friends/:id/decline
  app.patch<{ Params: { id: string } }>(
    '/friends/:id/decline',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const myId = req.user.sub;
      const [row] = await db
        .update(friends)
        .set({ status: 'declined', updatedAt: new Date() })
        .where(and(eq(friends.id, req.params.id), eq(friends.friendId, myId)))
        .returning();

      if (!row) return reply.status(404).send({ error: 'Request not found' });
      return { ok: true };
    },
  );

  // GET /friends — accepted friends list
  app.get('/friends', { preHandler: app.authenticate }, async (req) => {
    const myId = req.user.sub;

    // Friends where I'm the requester
    const sent = await db
      .select({ friend: friends, user: users })
      .from(friends)
      .innerJoin(users, eq(users.id, friends.friendId))
      .where(and(eq(friends.userId, myId), eq(friends.status, 'accepted')));

    // Friends where I'm the recipient
    const received = await db
      .select({ friend: friends, user: users })
      .from(friends)
      .innerJoin(users, eq(users.id, friends.userId))
      .where(and(eq(friends.friendId, myId), eq(friends.status, 'accepted')));

    return [
      ...sent.map(({ friend: row, user }) => toDTO(row, user)),
      ...received.map(({ friend: row, user }) => toDTO(row, user)),
    ];
  });
}
