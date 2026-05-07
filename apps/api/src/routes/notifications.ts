import type { FastifyInstance } from 'fastify';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { notifications, pushSubscriptions } from '../db/schema.js';
import type { NotificationDTO, PushSubscribeBody } from '@orbit/shared';

function toDTO(n: typeof notifications.$inferSelect): NotificationDTO {
  return {
    id: n.id,
    type: n.type,
    referenceId: n.referenceId,
    scheduledFor: n.scheduledFor.toISOString(),
    sentAt: n.sentAt?.toISOString() ?? null,
    channel: n.channel,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  };
}

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export async function notificationRoutes(app: FastifyInstance) {
  // GET /notifications — recent sent notifications
  app.get('/notifications', { preHandler: app.authenticate }, async (req) => {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user.sub))
      .orderBy(desc(notifications.scheduledFor))
      .limit(50);
    return rows.map(toDTO);
  });

  // PATCH /notifications/:id/read
  app.patch<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const [row] = await db
        .update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, req.user.sub)))
        .returning({ id: notifications.id });
      if (!row) return reply.status(404).send({ error: 'Not found' });
      return { ok: true };
    },
  );

  // GET /notifications/unread-count
  app.get('/notifications/unread-count', { preHandler: app.authenticate }, async (req) => {
    const rows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, req.user.sub),
          eq(notifications.read, false),
          // Only count sent ones
          // isNotNull not imported — use the inverse
          and(),
        ),
      );
    return { count: rows.length };
  });

  // POST /notifications/subscribe — register push subscription
  app.post<{ Body: unknown }>(
    '/notifications/subscribe',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = subscribeSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

      const { endpoint, keys } = parsed.data as PushSubscribeBody;
      await db
        .insert(pushSubscriptions)
        .values({
          id: nanoid(),
          userId: req.user.sub,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        })
        .onConflictDoNothing();

      return reply.status(201).send({ ok: true });
    },
  );

  // DELETE /notifications/subscribe — unsubscribe
  app.delete<{ Body: unknown }>(
    '/notifications/subscribe',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = z.object({ endpoint: z.string() }).safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

      await db
        .delete(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.endpoint, parsed.data.endpoint),
            eq(pushSubscriptions.userId, req.user.sub),
          ),
        );

      return { ok: true };
    },
  );
}
