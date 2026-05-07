import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import type { UserDTO } from '@orbit/shared';

const updateBody = z.object({
  name: z.string().min(1).max(80).optional(),
});

function toDTO(user: typeof users.$inferSelect): UserDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    friendCode: user.friendCode,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function userRoutes(app: FastifyInstance) {
  // GET /users/me
  app.get('/users/me', { preHandler: app.authenticate }, async (req) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.sub))
      .limit(1);

    if (!user) return { error: 'User not found' };
    return toDTO(user);
  });

  // PATCH /users/me
  app.patch<{ Body: unknown }>(
    '/users/me',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = updateBody.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

      const { name } = parsed.data;
      if (!name) return reply.status(400).send({ error: 'Nothing to update' });

      const [updated] = await db
        .update(users)
        .set({ name, updatedAt: new Date() })
        .where(eq(users.id, req.user.sub))
        .returning();

      return toDTO(updated!);
    },
  );
}
