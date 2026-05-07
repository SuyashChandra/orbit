import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { notifications } from '../db/schema.js';
import { JOB_FOLLOW_UP_DAYS } from '@orbit/shared';

const FOLLOW_UP_TYPES = [
  'job_followup_1d',
  'job_followup_3d',
  'job_followup_5d',
] as const;

export async function scheduleJobFollowUps(userId: string, jobId: string): Promise<void> {
  const now = Date.now();
  await db.insert(notifications).values(
    JOB_FOLLOW_UP_DAYS.map((days, i) => ({
      id: nanoid(),
      userId,
      type: FOLLOW_UP_TYPES[i]!,
      referenceId: jobId,
      scheduledFor: new Date(now + days * 24 * 60 * 60 * 1000),
      channel: 'push' as const,
    })),
  );
}
