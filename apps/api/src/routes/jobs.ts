import type { FastifyInstance } from 'fastify';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { jobApplications, applicationResumes, resumes } from '../db/schema.js';
import { scheduleJobFollowUps } from '../lib/scheduler.js';
import type { CreateJobBody, JobApplicationDTO, UpdateJobBody } from '@orbit/shared';
import { JOB_STATUS } from '@orbit/shared';

const createSchema = z.object({
  companyName: z.string().min(1).max(200),
  jobTitle: z.string().min(1).max(200),
  location: z.string().max(200).optional(),
  jobDescription: z.string().max(10000).optional(),
  status: z.enum(JOB_STATUS).optional(),
  appliedAt: z.string().datetime().optional(),
});

const updateSchema = createSchema.partial();

async function buildDTO(
  job: typeof jobApplications.$inferSelect,
  linkedResumes: (typeof resumes.$inferSelect)[],
): Promise<JobApplicationDTO> {
  return {
    id: job.id,
    companyName: job.companyName,
    jobTitle: job.jobTitle,
    location: job.location,
    jobDescription: job.jobDescription,
    status: job.status,
    appliedAt: job.appliedAt.toISOString(),
    createdAt: job.createdAt.toISOString(),
    resumes: linkedResumes.map((r) => ({
      id: r.id,
      filename: r.filename,
      uploadedAt: r.uploadedAt.toISOString(),
    })),
  };
}

async function getLinkedResumes(applicationId: string) {
  const rows = await db
    .select({ resume: resumes })
    .from(applicationResumes)
    .innerJoin(resumes, eq(resumes.id, applicationResumes.resumeId))
    .where(eq(applicationResumes.applicationId, applicationId));
  return rows.map((r) => r.resume);
}

export async function jobRoutes(app: FastifyInstance) {
  // POST /jobs
  app.post<{ Body: unknown }>('/jobs', { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

    const { companyName, jobTitle, location, jobDescription, status, appliedAt } = parsed.data;
    const userId = req.user.sub;

    const [job] = await db
      .insert(jobApplications)
      .values({
        id: nanoid(),
        userId,
        companyName,
        jobTitle,
        location: location ?? null,
        jobDescription: jobDescription ?? null,
        status: status ?? 'applied',
        appliedAt: appliedAt ? new Date(appliedAt) : new Date(),
      })
      .returning();

    await scheduleJobFollowUps(userId, job!.id);

    return reply.status(201).send(await buildDTO(job!, []));
  });

  // GET /jobs
  app.get<{ Querystring: { status?: string; page?: string } }>(
    '/jobs',
    { preHandler: app.authenticate },
    async (req) => {
      const userId = req.user.sub;
      const status = req.query.status as (typeof JOB_STATUS)[number] | undefined;
      const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
      const limit = 20;

      const where = status
        ? and(eq(jobApplications.userId, userId), eq(jobApplications.status, status))
        : eq(jobApplications.userId, userId);

      const jobs = await db
        .select()
        .from(jobApplications)
        .where(where)
        .orderBy(desc(jobApplications.appliedAt))
        .limit(limit)
        .offset((page - 1) * limit);

      const withResumes = await Promise.all(
        jobs.map(async (job) => buildDTO(job, await getLinkedResumes(job.id))),
      );

      return { jobs: withResumes, page, hasMore: jobs.length === limit };
    },
  );

  // GET /jobs/:id
  app.get<{ Params: { id: string } }>(
    '/jobs/:id',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const [job] = await db
        .select()
        .from(jobApplications)
        .where(and(eq(jobApplications.id, req.params.id), eq(jobApplications.userId, req.user.sub)))
        .limit(1);

      if (!job) return reply.status(404).send({ error: 'Not found' });
      return buildDTO(job, await getLinkedResumes(job.id));
    },
  );

  // PATCH /jobs/:id
  app.patch<{ Params: { id: string }; Body: unknown }>(
    '/jobs/:id',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

      const data = parsed.data as UpdateJobBody;
      const [job] = await db
        .update(jobApplications)
        .set({
          ...data,
          appliedAt: data.appliedAt ? new Date(data.appliedAt) : undefined,
          updatedAt: new Date(),
        })
        .where(
          and(eq(jobApplications.id, req.params.id), eq(jobApplications.userId, req.user.sub)),
        )
        .returning();

      if (!job) return reply.status(404).send({ error: 'Not found' });
      return buildDTO(job, await getLinkedResumes(job.id));
    },
  );

  // DELETE /jobs/:id
  app.delete<{ Params: { id: string } }>(
    '/jobs/:id',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const [deleted] = await db
        .delete(jobApplications)
        .where(
          and(eq(jobApplications.id, req.params.id), eq(jobApplications.userId, req.user.sub)),
        )
        .returning({ id: jobApplications.id });

      if (!deleted) return reply.status(404).send({ error: 'Not found' });
      return { ok: true };
    },
  );

  // POST /jobs/:id/resumes — link resume to job
  app.post<{ Params: { id: string }; Body: unknown }>(
    '/jobs/:id/resumes',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = z.object({ resumeId: z.string() }).safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

      const userId = req.user.sub;
      const [job] = await db
        .select({ id: jobApplications.id })
        .from(jobApplications)
        .where(and(eq(jobApplications.id, req.params.id), eq(jobApplications.userId, userId)))
        .limit(1);
      if (!job) return reply.status(404).send({ error: 'Job not found' });

      const [resume] = await db
        .select({ id: resumes.id })
        .from(resumes)
        .where(and(eq(resumes.id, parsed.data.resumeId), eq(resumes.userId, userId)))
        .limit(1);
      if (!resume) return reply.status(404).send({ error: 'Resume not found' });

      await db
        .insert(applicationResumes)
        .values({ applicationId: job.id, resumeId: resume.id })
        .onConflictDoNothing();

      return { ok: true };
    },
  );

  // DELETE /jobs/:id/resumes/:resumeId
  app.delete<{ Params: { id: string; resumeId: string } }>(
    '/jobs/:id/resumes/:resumeId',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const userId = req.user.sub;
      const [job] = await db
        .select({ id: jobApplications.id })
        .from(jobApplications)
        .where(and(eq(jobApplications.id, req.params.id), eq(jobApplications.userId, userId)))
        .limit(1);
      if (!job) return reply.status(404).send({ error: 'Not found' });

      await db
        .delete(applicationResumes)
        .where(
          and(
            eq(applicationResumes.applicationId, job.id),
            eq(applicationResumes.resumeId, req.params.resumeId),
          ),
        );

      return { ok: true };
    },
  );
}
