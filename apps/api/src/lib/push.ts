import webpush from 'web-push';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { pushSubscriptions } from '../db/schema.js';
import { env } from './env.js';

webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<boolean> {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subs.length === 0) return false;

  const json = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        json,
      ),
    ),
  );

  // Remove expired/invalid subscriptions (410 Gone)
  const dead = subs.filter((_, i) => {
    const r = results[i];
    return r?.status === 'rejected' && (r.reason as { statusCode?: number })?.statusCode === 410;
  });
  if (dead.length > 0) {
    await Promise.all(
      dead.map((sub) => db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id))),
    );
  }

  return results.some((r) => r.status === 'fulfilled');
}
