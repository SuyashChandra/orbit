import type { NotificationChannel, NotificationType } from '../constants.js';

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  referenceId: string | null;
  scheduledFor: string;
  sentAt: string | null;
  channel: NotificationChannel;
  read: boolean;
  createdAt: string;
}

export interface PushSubscribeBody {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
