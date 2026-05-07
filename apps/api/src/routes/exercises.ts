import type { FastifyInstance } from 'fastify';
import { and, eq, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { exercises } from '../db/schema.js';
import type { ExerciseDTO } from '@orbit/shared';

function toDTO(e: typeof exercises.$inferSelect): ExerciseDTO {
  return {
    id: e.id,
    name: e.name,
    category: e.category,
    muscleGroups: e.muscleGroups,
    isCustom: e.isCustom,
    createdByUserId: e.createdByUserId,
  };
}

const customSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  muscleGroups: z.array(z.string()).default([]),
});

export async function exerciseRoutes(app: FastifyInstance) {
  // GET /exercises — search, filter by category/muscle, paginated
  // Returns seeded + user's custom exercises
  app.get<{ Querystring: { q?: string; category?: string; muscle?: string; page?: string } }>(
    '/exercises',
    { preHandler: app.authenticate },
    async (req) => {
      const { q, category, muscle, page: pageStr } = req.query;
      const page = Math.max(1, parseInt(pageStr ?? '1', 10));
      const limit = 40;
      const userId = req.user.sub;

      const conditions = [
        // Global exercises (not custom) OR this user's custom exercises
        or(eq(exercises.isCustom, false), eq(exercises.createdByUserId, userId)),
      ];

      if (q) conditions.push(ilike(exercises.name, `%${q}%`));
      if (category) conditions.push(eq(exercises.category, category));

      const rows = await db
        .select()
        .from(exercises)
        .where(and(...conditions))
        .orderBy(exercises.name)
        .limit(limit)
        .offset((page - 1) * limit);

      // Client-side muscle filter (array contains) — simpler than SQL array overlap
      const filtered = muscle
        ? rows.filter((e) => e.muscleGroups.some((m) => m.toLowerCase() === muscle.toLowerCase()))
        : rows;

      return { exercises: filtered.map(toDTO), page, hasMore: rows.length === limit };
    },
  );

  // GET /exercises/categories — distinct categories
  app.get('/exercises/categories', { preHandler: app.authenticate }, async (req) => {
    const userId = req.user.sub;
    const rows = await db
      .selectDistinct({ category: exercises.category })
      .from(exercises)
      .where(or(eq(exercises.isCustom, false), eq(exercises.createdByUserId, userId)))
      .orderBy(exercises.category);
    return rows.map((r) => r.category);
  });

  // GET /exercises/:id
  app.get<{ Params: { id: string } }>(
    '/exercises/:id',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const userId = req.user.sub;
      const [ex] = await db
        .select()
        .from(exercises)
        .where(
          and(
            eq(exercises.id, req.params.id),
            or(eq(exercises.isCustom, false), eq(exercises.createdByUserId, userId)),
          ),
        )
        .limit(1);
      if (!ex) return reply.status(404).send({ error: 'Not found' });
      return toDTO(ex);
    },
  );

  // POST /exercises/custom
  app.post<{ Body: unknown }>(
    '/exercises/custom',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = customSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

      const [ex] = await db
        .insert(exercises)
        .values({
          id: nanoid(),
          ...parsed.data,
          isCustom: true,
          createdByUserId: req.user.sub,
        })
        .returning();

      return reply.status(201).send(toDTO(ex!));
    },
  );

  // DELETE /exercises/custom/:id
  app.delete<{ Params: { id: string } }>(
    '/exercises/custom/:id',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const [deleted] = await db
        .delete(exercises)
        .where(
          and(
            eq(exercises.id, req.params.id),
            eq(exercises.isCustom, true),
            eq(exercises.createdByUserId, req.user.sub),
          ),
        )
        .returning({ id: exercises.id });
      if (!deleted) return reply.status(404).send({ error: 'Not found' });
      return { ok: true };
    },
  );
}
