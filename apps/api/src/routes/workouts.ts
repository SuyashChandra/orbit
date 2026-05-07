import type { FastifyInstance } from 'fastify';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { workouts, workoutExercises, exercises } from '../db/schema.js';
import type { WorkoutDTO } from '@orbit/shared';

async function buildWorkoutDTO(workout: typeof workouts.$inferSelect): Promise<WorkoutDTO> {
  const rows = await db
    .select({ we: workoutExercises, ex: exercises })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(eq(workoutExercises.workoutId, workout.id))
    .orderBy(asc(workoutExercises.orderIndex));

  return {
    id: workout.id,
    name: workout.name,
    createdAt: workout.createdAt.toISOString(),
    exercises: rows.map(({ we, ex }) => ({
      id: we.id,
      orderIndex: we.orderIndex,
      exercise: {
        id: ex.id,
        name: ex.name,
        category: ex.category,
        muscleGroups: ex.muscleGroups,
        isCustom: ex.isCustom,
        createdByUserId: ex.createdByUserId,
      },
    })),
  };
}

export async function workoutRoutes(app: FastifyInstance) {
  // POST /workouts
  app.post<{ Body: unknown }>('/workouts', { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = z.object({ name: z.string().min(1).max(200) }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

    const [workout] = await db
      .insert(workouts)
      .values({ id: nanoid(), userId: req.user.sub, name: parsed.data.name })
      .returning();

    return reply.status(201).send(await buildWorkoutDTO(workout!));
  });

  // GET /workouts
  app.get('/workouts', { preHandler: app.authenticate }, async (req) => {
    const rows = await db
      .select()
      .from(workouts)
      .where(eq(workouts.userId, req.user.sub))
      .orderBy(workouts.createdAt);

    return Promise.all(rows.map(buildWorkoutDTO));
  });

  // GET /workouts/:id
  app.get<{ Params: { id: string } }>(
    '/workouts/:id',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const [workout] = await db
        .select()
        .from(workouts)
        .where(and(eq(workouts.id, req.params.id), eq(workouts.userId, req.user.sub)))
        .limit(1);
      if (!workout) return reply.status(404).send({ error: 'Not found' });
      return buildWorkoutDTO(workout);
    },
  );

  // DELETE /workouts/:id
  app.delete<{ Params: { id: string } }>(
    '/workouts/:id',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const [deleted] = await db
        .delete(workouts)
        .where(and(eq(workouts.id, req.params.id), eq(workouts.userId, req.user.sub)))
        .returning({ id: workouts.id });
      if (!deleted) return reply.status(404).send({ error: 'Not found' });
      return { ok: true };
    },
  );

  // POST /workouts/:id/exercises — add exercise
  app.post<{ Params: { id: string }; Body: unknown }>(
    '/workouts/:id/exercises',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = z
        .object({ exerciseId: z.string(), orderIndex: z.number().int().min(0) })
        .safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

      const [workout] = await db
        .select({ id: workouts.id })
        .from(workouts)
        .where(and(eq(workouts.id, req.params.id), eq(workouts.userId, req.user.sub)))
        .limit(1);
      if (!workout) return reply.status(404).send({ error: 'Workout not found' });

      await db
        .insert(workoutExercises)
        .values({ id: nanoid(), workoutId: workout.id, ...parsed.data })
        .onConflictDoNothing();

      await db
        .update(workouts)
        .set({ updatedAt: new Date() })
        .where(eq(workouts.id, workout.id));

      return buildWorkoutDTO((await db.select().from(workouts).where(eq(workouts.id, workout.id)).limit(1))[0]!);
    },
  );

  // DELETE /workouts/:id/exercises/:exerciseId
  app.delete<{ Params: { id: string; exerciseId: string } }>(
    '/workouts/:id/exercises/:exerciseId',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const [workout] = await db
        .select({ id: workouts.id })
        .from(workouts)
        .where(and(eq(workouts.id, req.params.id), eq(workouts.userId, req.user.sub)))
        .limit(1);
      if (!workout) return reply.status(404).send({ error: 'Not found' });

      await db
        .delete(workoutExercises)
        .where(
          and(
            eq(workoutExercises.workoutId, workout.id),
            eq(workoutExercises.exerciseId, req.params.exerciseId),
          ),
        );

      return { ok: true };
    },
  );

  // PATCH /workouts/:id/exercises — reorder: [{ id: weId, orderIndex: n }]
  app.patch<{ Params: { id: string }; Body: unknown }>(
    '/workouts/:id/exercises',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = z
        .object({ exercises: z.array(z.object({ id: z.string(), orderIndex: z.number().int().min(0) })) })
        .safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

      const [workout] = await db
        .select({ id: workouts.id })
        .from(workouts)
        .where(and(eq(workouts.id, req.params.id), eq(workouts.userId, req.user.sub)))
        .limit(1);
      if (!workout) return reply.status(404).send({ error: 'Not found' });

      await Promise.all(
        parsed.data.exercises.map(({ id, orderIndex }) =>
          db
            .update(workoutExercises)
            .set({ orderIndex })
            .where(and(eq(workoutExercises.id, id), eq(workoutExercises.workoutId, workout.id))),
        ),
      );

      return buildWorkoutDTO((await db.select().from(workouts).where(eq(workouts.id, workout.id)).limit(1))[0]!);
    },
  );
}
