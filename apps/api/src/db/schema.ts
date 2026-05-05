import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const friendStatusEnum = pgEnum('friend_status', [
  'pending',
  'accepted',
  'declined',
]);

export const jobStatusEnum = pgEnum('job_status', [
  'applied',
  'screening',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn',
]);

export const gameStatusEnum = pgEnum('game_status', [
  'upcoming',
  'ongoing',
  'completed',
  'cancelled',
]);

export const participantStatusEnum = pgEnum('participant_status', [
  'invited',
  'accepted',
  'declined',
]);

export const reactionTypeEnum = pgEnum('reaction_type', ['like', 'fire', 'strong']);

export const notificationTypeEnum = pgEnum('notification_type', [
  'job_followup_1d',
  'job_followup_3d',
  'job_followup_5d',
  'game_invite',
  'friend_request',
]);

export const notificationChannelEnum = pgEnum('notification_channel', ['push', 'email']);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    googleId: text('google_id').notNull(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    avatar: text('avatar'),
    friendCode: text('friend_code').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('users_google_id_idx').on(t.googleId),
    uniqueIndex('users_email_idx').on(t.email),
    uniqueIndex('users_friend_code_idx').on(t.friendCode),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  friends: many(friends, { relationName: 'user_friends' }),
  friendOf: many(friends, { relationName: 'friend_of' }),
  pushSubscriptions: many(pushSubscriptions),
  refreshTokens: many(refreshTokens),
  jobApplications: many(jobApplications),
  resumes: many(resumes),
  exercises: many(exercises),
  workouts: many(workouts),
  workoutLogs: many(workoutLogs),
  games: many(badmintonGames, { relationName: 'game_creator' }),
  gameParticipations: many(gameParticipants),
  posts: many(posts),
  reactions: many(reactions),
  comments: many(comments),
  notifications: many(notifications),
}));

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('refresh_tokens_token_idx').on(t.token)],
);

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('push_subscriptions_endpoint_idx').on(t.endpoint),
    index('push_subscriptions_user_id_idx').on(t.userId),
  ],
);

// ─── Friends ──────────────────────────────────────────────────────────────────

export const friends = pgTable(
  'friends',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    friendId: text('friend_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: friendStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('friends_pair_unique').on(t.userId, t.friendId),
    index('friends_user_id_idx').on(t.userId),
    index('friends_friend_id_idx').on(t.friendId),
  ],
);

export const friendsRelations = relations(friends, ({ one }) => ({
  user: one(users, {
    fields: [friends.userId],
    references: [users.id],
    relationName: 'user_friends',
  }),
  friend: one(users, {
    fields: [friends.friendId],
    references: [users.id],
    relationName: 'friend_of',
  }),
}));

// ─── Job Tracker ──────────────────────────────────────────────────────────────

export const jobApplications = pgTable(
  'job_applications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    companyName: text('company_name').notNull(),
    jobTitle: text('job_title').notNull(),
    location: text('location'),
    jobDescription: text('job_description'),
    status: jobStatusEnum('status').notNull().default('applied'),
    appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('job_applications_user_id_idx').on(t.userId)],
);

export const jobApplicationsRelations = relations(jobApplications, ({ one, many }) => ({
  user: one(users, { fields: [jobApplications.userId], references: [users.id] }),
  applicationResumes: many(applicationResumes),
  notifications: many(notifications),
}));

export const resumes = pgTable(
  'resumes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    gcsKey: text('gcs_key').notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('resumes_user_id_idx').on(t.userId)],
);

export const resumesRelations = relations(resumes, ({ one, many }) => ({
  user: one(users, { fields: [resumes.userId], references: [users.id] }),
  applicationResumes: many(applicationResumes),
}));

export const applicationResumes = pgTable(
  'application_resumes',
  {
    applicationId: text('application_id')
      .notNull()
      .references(() => jobApplications.id, { onDelete: 'cascade' }),
    resumeId: text('resume_id')
      .notNull()
      .references(() => resumes.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.applicationId, t.resumeId] })],
);

export const applicationResumesRelations = relations(applicationResumes, ({ one }) => ({
  application: one(jobApplications, {
    fields: [applicationResumes.applicationId],
    references: [jobApplications.id],
  }),
  resume: one(resumes, {
    fields: [applicationResumes.resumeId],
    references: [resumes.id],
  }),
}));

// ─── Gym ──────────────────────────────────────────────────────────────────────

export const exercises = pgTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    muscleGroups: text('muscle_groups').array().notNull().default([]),
    isCustom: boolean('is_custom').notNull().default(false),
    createdByUserId: text('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('exercises_category_idx').on(t.category)],
);

export const exercisesRelations = relations(exercises, ({ one }) => ({
  createdByUser: one(users, {
    fields: [exercises.createdByUserId],
    references: [users.id],
  }),
}));

export const workouts = pgTable(
  'workouts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('workouts_user_id_idx').on(t.userId)],
);

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  user: one(users, { fields: [workouts.userId], references: [users.id] }),
  workoutExercises: many(workoutExercises),
}));

export const workoutExercises = pgTable(
  'workout_exercises',
  {
    id: text('id').primaryKey(),
    workoutId: text('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull(),
  },
  (t) => [
    index('workout_exercises_workout_id_idx').on(t.workoutId),
    unique('workout_exercises_unique').on(t.workoutId, t.exerciseId),
  ],
);

export const workoutExercisesRelations = relations(workoutExercises, ({ one }) => ({
  workout: one(workouts, { fields: [workoutExercises.workoutId], references: [workouts.id] }),
  exercise: one(exercises, {
    fields: [workoutExercises.exerciseId],
    references: [exercises.id],
  }),
}));

export const workoutLogs = pgTable(
  'workout_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workoutId: text('workout_id').references(() => workouts.id, { onDelete: 'set null' }),
    date: text('date').notNull(), // YYYY-MM-DD
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('workout_logs_user_id_idx').on(t.userId),
    index('workout_logs_date_idx').on(t.date),
  ],
);

export const workoutLogsRelations = relations(workoutLogs, ({ one, many }) => ({
  user: one(users, { fields: [workoutLogs.userId], references: [users.id] }),
  workout: one(workouts, { fields: [workoutLogs.workoutId], references: [workouts.id] }),
  sets: many(workoutLogSets),
}));

export const workoutLogSets = pgTable('workout_log_sets', {
  id: text('id').primaryKey(),
  workoutLogId: text('workout_log_id')
    .notNull()
    .references(() => workoutLogs.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(),
  reps: integer('reps').notNull(),
  weight: real('weight'),
});

export const workoutLogSetsRelations = relations(workoutLogSets, ({ one }) => ({
  workoutLog: one(workoutLogs, {
    fields: [workoutLogSets.workoutLogId],
    references: [workoutLogs.id],
  }),
  exercise: one(exercises, { fields: [workoutLogSets.exerciseId], references: [exercises.id] }),
}));

// ─── Badminton ────────────────────────────────────────────────────────────────

export const badmintonGames = pgTable(
  'badminton_games',
  {
    id: text('id').primaryKey(),
    creatorId: text('creator_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    location: text('location'),
    notes: text('notes'),
    status: gameStatusEnum('status').notNull().default('upcoming'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('badminton_games_creator_id_idx').on(t.creatorId)],
);

export const badmintonGamesRelations = relations(badmintonGames, ({ one, many }) => ({
  creator: one(users, {
    fields: [badmintonGames.creatorId],
    references: [users.id],
    relationName: 'game_creator',
  }),
  participants: many(gameParticipants),
}));

export const gameParticipants = pgTable(
  'game_participants',
  {
    gameId: text('game_id')
      .notNull()
      .references(() => badmintonGames.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: participantStatusEnum('status').notNull().default('invited'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.userId] })],
);

export const gameParticipantsRelations = relations(gameParticipants, ({ one }) => ({
  game: one(badmintonGames, { fields: [gameParticipants.gameId], references: [badmintonGames.id] }),
  user: one(users, { fields: [gameParticipants.userId], references: [users.id] }),
}));

// ─── Social Feed ──────────────────────────────────────────────────────────────

export const posts = pgTable(
  'posts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    workoutLogId: text('workout_log_id').references(() => workoutLogs.id, {
      onDelete: 'set null',
    }),
    gameId: text('game_id').references(() => badmintonGames.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('posts_user_id_idx').on(t.userId),
    index('posts_created_at_idx').on(t.createdAt),
  ],
);

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, { fields: [posts.userId], references: [users.id] }),
  workoutLog: one(workoutLogs, { fields: [posts.workoutLogId], references: [workoutLogs.id] }),
  game: one(badmintonGames, { fields: [posts.gameId], references: [badmintonGames.id] }),
  images: many(postImages),
  reactions: many(reactions),
  comments: many(comments),
}));

export const postImages = pgTable('post_images', {
  id: text('id').primaryKey(),
  postId: text('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  gcsKey: text('gcs_key').notNull(),
  orderIndex: integer('order_index').notNull(),
});

export const postImagesRelations = relations(postImages, ({ one }) => ({
  post: one(posts, { fields: [postImages.postId], references: [posts.id] }),
}));

export const reactions = pgTable(
  'reactions',
  {
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: reactionTypeEnum('type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })],
);

export const reactionsRelations = relations(reactions, ({ one }) => ({
  post: one(posts, { fields: [reactions.postId], references: [posts.id] }),
  user: one(users, { fields: [reactions.userId], references: [users.id] }),
}));

export const comments = pgTable(
  'comments',
  {
    id: text('id').primaryKey(),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('comments_post_id_idx').on(t.postId),
    index('comments_user_id_idx').on(t.userId),
  ],
);

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}));

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    referenceId: text('reference_id'),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    channel: notificationChannelEnum('channel').notNull(),
    read: boolean('read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('notifications_user_id_idx').on(t.userId),
    index('notifications_scheduled_for_idx').on(t.scheduledFor),
    index('notifications_sent_at_idx').on(t.sentAt),
  ],
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
