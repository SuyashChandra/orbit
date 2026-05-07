import cron from 'node-cron';
import { and, eq, isNull, lte } from 'drizzle-orm';
import { db } from '../db/client.js';
import { notifications } from '../db/schema.js';
import { sendPushToUser } from './push.js';
import { env } from './env.js';

const FOLLOW_UP_LABELS: Record<string, string> = {
  job_followup_1d: '1 day',
  job_followup_3d: '3 days',
  job_followup_5d: '5 days',
};

async function dispatchPendingNotifications() {
  const pending = await db
    .select()
    .from(notifications)
    .where(and(isNull(notifications.sentAt), lte(notifications.scheduledFor, new Date())));

  for (const notif of pending) {
    let pushed = false;

    if (notif.type.startsWith('job_followup') && notif.referenceId) {
      const job = await db.query.jobApplications.findFirst({
        where: (t, { eq }) => eq(t.id, notif.referenceId!),
        columns: { companyName: true, status: true },
      });

      if (job && job.status !== 'rejected' && job.status !== 'withdrawn') {
        const label = FOLLOW_UP_LABELS[notif.type] ?? '';
        pushed = await sendPushToUser(notif.userId, {
          title: 'Follow up on your application',
          body: `It's been ${label} since you applied to ${job.companyName}. Time to follow up!`,
          url: `${env.APP_URL}/jobs/${notif.referenceId}`,
        });
      }
    }

    await db
      .update(notifications)
      .set({ sentAt: new Date(), channel: pushed ? 'push' : 'push' })
      .where(eq(notifications.id, notif.id));
  }
}

export function startCron() {
  cron.schedule('*/5 * * * *', () => {
    dispatchPendingNotifications().catch(console.error);
  });
}
