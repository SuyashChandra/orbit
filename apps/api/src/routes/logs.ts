import type { FastifyInstance } from 'fastify';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { workoutLogs, workoutLogSets, workouts } from '../db/schema.js';
import type { WorkoutLogDTO } from '@orbit/shared';

async function buildLogDTO(log: typeof workoutLogs.$inferSelect): Promise<WorkoutLogDTO> {
  const sets = await db
    .select()
    .from(workoutLogSets)
    .where(eq(workoutLogSets.workoutLogId, log.id))
    .orderBy(asc(workoutLogSets.setNumber));

  let workout: { id: string; name: string } | null = null;
  if (log.workoutId) {
    const [w] = await db
      .select({ id: workouts.id, name: workouts.name })
      .from(workouts)
      .where(eq(workouts.id, log.workoutId))
      .limit(1);
    if (w) workout = w;
  }

  return {
    id: log.id,
    date: log.date,
    workout,
    sets: sets.map((s) => ({
      id: s.id,
      exerciseId: s.exerciseId,
      setNumber: s.setNumber,
      reps: s.reps,
      weight: s.weight,
    })),
  };
}

const setSchema = z.object({
  exerciseId: z.string(),
  setNumber: z.number().int().min(1),
  reps: z.number().int().min(0),
  weight: z.number().min(0).optional(),
});

export async function logRoutes(app: FastifyInstance) {
  // POST /logs — create a workout log for a date
  app.post<{ Body: unknown }>('/logs', { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        workoutId: z.string().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

    const [log] = await db
      .insert(workoutLogs)
      .values({
        id: nanoid(),
        userId: req.user.sub,
        date: parsed.data.date,
        workoutId: parsed.data.workoutId ?? null,
      })
      .returning();

    return reply.status(201).send(await buildLogDTO(log!));
  });

  // GET /logs?date=YYYY-MM-DD
  app.get<{ Querystring: { date?: string } }>(
    '/logs',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { date } = req.query;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return reply.status(400).send({ error: 'date query param required (YYYY-MM-DD)' });
      }

      const logs = await db
        .select()
        .from(workoutLogs)
        .where(and(eq(workoutLogs.userId, req.user.sub), eq(workoutLogs.date, date)));

      return Promise.all(logs.map(buildLogDTO));
    },
  );

  // GET /logs/:id
  app.get<{ Params: { id: string } }>(
    '/logs/:id',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const [log] = await db
        .select()
        .from(workoutLogs)
        .where(and(eq(workoutLogs.id, req.params.id), eq(workoutLogs.userId, req.user.sub)))
        .limit(1);
      if (!log) return reply.status(404).send({ error: 'Not found' });
      return buildLogDTO(log);
    },
  );

  // POST /logs/:id/sets
  app.post<{ Params: { id: string }; Body: unknown }>(
    '/logs/:id/sets',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = setSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

      const [log] = await db
        .select({ id: workoutLogs.id })
        .from(workoutLogs)
        .where(and(eq(workoutLogs.id, req.params.id), eq(workoutLogs.userId, req.user.sub)))
        .limit(1);
      if (!log) return reply.status(404).send({ error: 'Log not found' });

      const [set] = await db
        .insert(workoutLogSets)
        .values({ id: nanoid(), workoutLogId: log.id, ...parsed.data })
        .returning();

      return reply.status(201).send({
        id: set!.id,
        exerciseId: set!.exerciseId,
        setNumber: set!.setNumber,
        reps: set!.reps,
        weight: set!.weight,
      });
    },
  );

  // PATCH /logs/:id/sets/:setId
  app.patch<{ Params: { id: string; setId: string }; Body: unknown }>(
    '/logs/:id/sets/:setId',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = setSchema.partial().safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

      const [log] = await db
        .select({ id: workoutLogs.id })
        .from(workoutLogs)
        .where(and(eq(workoutLogs.id, req.params.id), eq(workoutLogs.userId, req.user.sub)))
        .limit(1);
      if (!log) return reply.status(404).send({ error: 'Log not found' });

      const [set] = await db
        .update(workoutLogSets)
        .set(parsed.data)
        .where(
          and(eq(workoutLogSets.id, req.params.setId), eq(workoutLogSets.workoutLogId, log.id)),
        )
        .returning();

      if (!set) return reply.status(404).send({ error: 'Set not found' });
      return { id: set.id, exerciseId: set.exerciseId, setNumber: set.setNumber, reps: set.reps, weight: set.weight };
    },
  );

  // DELETE /logs/:id/sets/:setId
  app.delete<{ Params: { id: string; setId: string } }>(
    '/logs/:id/sets/:setId',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const [log] = await db
        .select({ id: workoutLogs.id })
        .from(workoutLogs)
        .where(and(eq(workoutLogs.id, req.params.id), eq(workoutLogs.userId, req.user.sub)))
        .limit(1);
      if (!log) return reply.status(404).send({ error: 'Not found' });

      await db
        .delete(workoutLogSets)
        .where(
          and(eq(workoutLogSets.id, req.params.setId), eq(workoutLogSets.workoutLogId, log.id)),
        );
      return { ok: true };
    },
  );

  // GET /logs/history/:exerciseId — max/avg weight per date for progress chart
  app.get<{ Params: { exerciseId: string } }>(
    '/logs/history/:exerciseId',
    { preHandler: app.authenticate },
    async (req) => {
      const sets = await db
        .select({
          date: workoutLogs.date,
          reps: workoutLogSets.reps,
          weight: workoutLogSets.weight,
        })
        .from(workoutLogSets)
        .innerJoin(workoutLogs, eq(workoutLogs.id, workoutLogSets.workoutLogId))
        .where(
          and(
            eq(workoutLogs.userId, req.user.sub),
            eq(workoutLogSets.exerciseId, req.params.exerciseId),
          ),
        )
        .orderBy(asc(workoutLogs.date));

      // Group by date: pick max weight per session
      const byDate = new Map<string, { maxWeight: number; totalReps: number }>();
      for (const s of sets) {
        const prev = byDate.get(s.date);
        const w = s.weight ?? 0;
        if (!prev) {
          byDate.set(s.date, { maxWeight: w, totalReps: s.reps });
        } else {
          byDate.set(s.date, {
            maxWeight: Math.max(prev.maxWeight, w),
            totalReps: prev.totalReps + s.reps,
          });
        }
      }

      return Array.from(byDate.entries()).map(([date, { maxWeight, totalReps }]) => ({
        date,
        maxWeight,
        totalReps,
      }));
    },
  );
}
