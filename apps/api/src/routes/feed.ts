import type { FastifyInstance } from 'fastify';
import { and, count, desc, eq, inArray, lt, or } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import {
  posts,
  postImages,
  reactions,
  comments,
  users,
  friends,
  workoutLogs,
  workouts,
  badmintonGames,
} from '../db/schema.js';
import { uploadFile, getSignedUrl } from '../lib/gcs.js';
import type { CommentDTO, PostDTO, ReactionSummary } from '@orbit/shared';
import { REACTION_TYPES } from '@orbit/shared';

const IMAGE_URL_TTL = 3600; // 1 hour for feed images

async function getAcceptedFriendIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ friendId: friends.friendId, userId: friends.userId })
    .from(friends)
    .where(
      and(
        eq(friends.status, 'accepted'),
        or(eq(friends.userId, userId), eq(friends.friendId, userId)),
      ),
    );
  return rows.map((r) => (r.userId === userId ? r.friendId : r.userId));
}

async function buildPostDTO(post: typeof posts.$inferSelect, viewerId: string): Promise<PostDTO> {
  const [author] = await db
    .select({ id: users.id, name: users.name, avatar: users.avatar })
    .from(users)
    .where(eq(users.id, post.userId))
    .limit(1);

  const images = await db
    .select()
    .from(postImages)
    .where(eq(postImages.postId, post.id))
    .orderBy(postImages.orderIndex);

  const signedImages = await Promise.all(
    images.map(async (img) => ({
      id: img.id,
      url: await getSignedUrl(img.gcsKey, IMAGE_URL_TTL),
      orderIndex: img.orderIndex,
    })),
  );

  const allReactions = await db
    .select({ type: reactions.type })
    .from(reactions)
    .where(eq(reactions.postId, post.id));

  const reactionMap = new Map<string, number>();
  let userReaction: string | null = null;
  for (const r of allReactions) {
    reactionMap.set(r.type, (reactionMap.get(r.type) ?? 0) + 1);
  }

  const myReaction = await db
    .select({ type: reactions.type })
    .from(reactions)
    .where(and(eq(reactions.postId, post.id), eq(reactions.userId, viewerId)))
    .limit(1);
  userReaction = myReaction[0]?.type ?? null;

  const reactionSummary: ReactionSummary[] = REACTION_TYPES
    .filter((t) => reactionMap.has(t))
    .map((t) => ({ type: t, count: reactionMap.get(t)! }));

  const [commentCountRow] = await db
    .select({ count: count() })
    .from(comments)
    .where(eq(comments.postId, post.id));

  let workoutLog: PostDTO['workoutLog'] = null;
  if (post.workoutLogId) {
    const [log] = await db
      .select({ id: workoutLogs.id, date: workoutLogs.date, workoutId: workoutLogs.workoutId })
      .from(workoutLogs)
      .where(eq(workoutLogs.id, post.workoutLogId))
      .limit(1);
    if (log) {
      let workoutName: string | null = null;
      if (log.workoutId) {
        const [w] = await db
          .select({ name: workouts.name })
          .from(workouts)
          .where(eq(workouts.id, log.workoutId))
          .limit(1);
        workoutName = w?.name ?? null;
      }
      workoutLog = { id: log.id, date: log.date, workoutName };
    }
  }

  let game: PostDTO['game'] = null;
  if (post.gameId) {
    const [g] = await db
      .select({ id: badmintonGames.id, scheduledAt: badmintonGames.scheduledAt, location: badmintonGames.location })
      .from(badmintonGames)
      .where(eq(badmintonGames.id, post.gameId))
      .limit(1);
    if (g) game = { id: g.id, scheduledAt: g.scheduledAt.toISOString(), location: g.location };
  }

  return {
    id: post.id,
    author: author ?? { id: post.userId, name: 'Unknown', avatar: null },
    content: post.content,
    images: signedImages,
    workoutLog,
    game,
    reactions: reactionSummary,
    commentCount: commentCountRow?.count ?? 0,
    userReaction: userReaction as PostDTO['userReaction'],
    createdAt: post.createdAt.toISOString(),
  };
}

const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  workoutLogId: z.string().optional(),
  gameId: z.string().optional(),
});

export async function feedRoutes(app: FastifyInstance) {
  // GET /feed — cursor-paginated posts from self + accepted friends
  app.get<{ Querystring: { cursor?: string; limit?: string } }>(
    '/feed',
    { preHandler: app.authenticate },
    async (req) => {
      const userId = req.user.sub;
      const limit = Math.min(parseInt(req.query.limit ?? '20', 10), 50);
      const cursor = req.query.cursor;

      const friendIds = await getAcceptedFriendIds(userId);
      const authorIds = [userId, ...friendIds];

      const conditions = [inArray(posts.userId, authorIds)];
      if (cursor) conditions.push(lt(posts.createdAt, new Date(cursor)));

      const rows = await db
        .select()
        .from(posts)
        .where(and(...conditions))
        .orderBy(desc(posts.createdAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const page = rows.slice(0, limit);
      const nextCursor = hasMore ? page[page.length - 1]?.createdAt.toISOString() : null;

      const dtos = await Promise.all(page.map((p) => buildPostDTO(p, userId)));
      return { posts: dtos, nextCursor };
    },
  );

  // POST /posts
  app.post<{ Body: unknown }>('/posts', { preHandler: app.authenticate }, async (req, reply) => {
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

    const { content, workoutLogId, gameId } = parsed.data;
    const [post] = await db
      .insert(posts)
      .values({
        id: nanoid(),
        userId: req.user.sub,
        content,
        workoutLogId: workoutLogId ?? null,
        gameId: gameId ?? null,
      })
      .returning();

    return reply.status(201).send(await buildPostDTO(post!, req.user.sub));
  });

  // DELETE /posts/:id
  app.delete<{ Params: { id: string } }>(
    '/posts/:id',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const [deleted] = await db
        .delete(posts)
        .where(and(eq(posts.id, req.params.id), eq(posts.userId, req.user.sub)))
        .returning({ id: posts.id });
      if (!deleted) return reply.status(404).send({ error: 'Not found' });
      return { ok: true };
    },
  );

  // POST /posts/:id/images — multipart, up to 4 images
  app.post<{ Params: { id: string } }>(
    '/posts/:id/images',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const [post] = await db
        .select({ id: posts.id })
        .from(posts)
        .where(and(eq(posts.id, req.params.id), eq(posts.userId, req.user.sub)))
        .limit(1);
      if (!post) return reply.status(404).send({ error: 'Post not found' });

      const existingCount = await db
        .select({ count: count() })
        .from(postImages)
        .where(eq(postImages.postId, post.id));
      if ((existingCount[0]?.count ?? 0) >= 4) {
        return reply.status(400).send({ error: 'Max 4 images per post' });
      }

      const file = await req.file();
      if (!file) return reply.status(400).send({ error: 'No file' });

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.mimetype)) {
        return reply.status(400).send({ error: 'Only images allowed' });
      }

      const ext = file.filename.split('.').pop() ?? 'jpg';
      const key = `posts/${post.id}/${nanoid()}.${ext}`;
      const buffer = await file.toBuffer();
      await uploadFile(key, buffer, file.mimetype);

      const orderIndex = existingCount[0]?.count ?? 0;
      const [img] = await db
        .insert(postImages)
        .values({ id: nanoid(), postId: post.id, gcsKey: key, orderIndex })
        .returning();

      return reply.status(201).send({
        id: img!.id,
        url: await getSignedUrl(key, IMAGE_URL_TTL),
        orderIndex: img!.orderIndex,
      });
    },
  );

  // POST /posts/:id/reactions — upsert one reaction per user
  app.post<{ Params: { id: string }; Body: unknown }>(
    '/posts/:id/reactions',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = z.object({ type: z.enum(REACTION_TYPES) }).safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

      await db
        .insert(reactions)
        .values({ postId: req.params.id, userId: req.user.sub, type: parsed.data.type })
        .onConflictDoUpdate({
          target: [reactions.postId, reactions.userId],
          set: { type: parsed.data.type },
        });

      return { ok: true };
    },
  );

  // DELETE /posts/:id/reactions
  app.delete<{ Params: { id: string } }>(
    '/posts/:id/reactions',
    { preHandler: app.authenticate },
    async (req) => {
      await db
        .delete(reactions)
        .where(and(eq(reactions.postId, req.params.id), eq(reactions.userId, req.user.sub)));
      return { ok: true };
    },
  );

  // POST /posts/:id/comments
  app.post<{ Params: { id: string }; Body: unknown }>(
    '/posts/:id/comments',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = z.object({ content: z.string().min(1).max(2000) }).safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

      const [comment] = await db
        .insert(comments)
        .values({ id: nanoid(), postId: req.params.id, userId: req.user.sub, content: parsed.data.content })
        .returning();

      const [author] = await db
        .select({ id: users.id, name: users.name, avatar: users.avatar })
        .from(users)
        .where(eq(users.id, req.user.sub))
        .limit(1);

      const dto: CommentDTO = {
        id: comment!.id,
        content: comment!.content,
        createdAt: comment!.createdAt.toISOString(),
        author: author ?? { id: req.user.sub, name: 'Unknown', avatar: null },
      };
      return reply.status(201).send(dto);
    },
  );

  // GET /posts/:id/comments
  app.get<{ Params: { id: string }; Querystring: { page?: string } }>(
    '/posts/:id/comments',
    { preHandler: app.authenticate },
    async (req) => {
      const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
      const limit = 20;

      const rows = await db
        .select({ c: comments, u: users })
        .from(comments)
        .innerJoin(users, eq(users.id, comments.userId))
        .where(eq(comments.postId, req.params.id))
        .orderBy(comments.createdAt)
        .limit(limit)
        .offset((page - 1) * limit);

      const dtos: CommentDTO[] = rows.map(({ c, u }) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        author: { id: u.id, name: u.name, avatar: u.avatar },
      }));

      return { comments: dtos, page, hasMore: rows.length === limit };
    },
  );

  // DELETE /comments/:id
  app.delete<{ Params: { id: string } }>(
    '/comments/:id',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const [deleted] = await db
        .delete(comments)
        .where(and(eq(comments.id, req.params.id), eq(comments.userId, req.user.sub)))
        .returning({ id: comments.id });
      if (!deleted) return reply.status(404).send({ error: 'Not found' });
      return { ok: true };
    },
  );
}
