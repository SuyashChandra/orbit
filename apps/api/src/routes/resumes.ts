import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { resumes } from '../db/schema.js';
import { uploadFile, deleteFile, getSignedUrl } from '../lib/gcs.js';
import type { ResumeDTO } from '@orbit/shared';

function toDTO(r: typeof resumes.$inferSelect): ResumeDTO {
  return { id: r.id, filename: r.filename, uploadedAt: r.uploadedAt.toISOString() };
}

export async function resumeRoutes(app: FastifyInstance) {
  // POST /resumes/upload
  app.post('/resumes/upload', { preHandler: app.authenticate }, async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: 'No file' });

    const allowedTypes = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Only PDF and Word documents allowed' });
    }

    const userId = req.user.sub;
    const ext = data.filename.split('.').pop() ?? 'pdf';
    const key = `resumes/${userId}/${nanoid()}.${ext}`;
    const buffer = await data.toBuffer();

    await uploadFile(key, buffer, data.mimetype);

    const [resume] = await db
      .insert(resumes)
      .values({ id: nanoid(), userId, filename: data.filename, gcsKey: key })
      .returning();

    return reply.status(201).send(toDTO(resume!));
  });

  // GET /resumes
  app.get('/resumes', { preHandler: app.authenticate }, async (req) => {
    const rows = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, req.user.sub))
      .orderBy(resumes.uploadedAt);
    return rows.map(toDTO);
  });

  // DELETE /resumes/:id
  app.delete<{ Params: { id: string } }>(
    '/resumes/:id',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const [resume] = await db
        .delete(resumes)
        .where(and(eq(resumes.id, req.params.id), eq(resumes.userId, req.user.sub)))
        .returning();

      if (!resume) return reply.status(404).send({ error: 'Not found' });
      await deleteFile(resume.gcsKey);
      return { ok: true };
    },
  );

  // GET /resumes/:id/download — returns a 15-min signed URL
  app.get<{ Params: { id: string } }>(
    '/resumes/:id/download',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const [resume] = await db
        .select()
        .from(resumes)
        .where(and(eq(resumes.id, req.params.id), eq(resumes.userId, req.user.sub)))
        .limit(1);

      if (!resume) return reply.status(404).send({ error: 'Not found' });
      const url = await getSignedUrl(resume.gcsKey, 900);
      return { url };
    },
  );
}
