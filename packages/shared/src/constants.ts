export const FRIEND_CODE_LENGTH = 6;
export const FRIEND_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export const JOB_FOLLOW_UP_DAYS = [1, 3, 5] as const;

export const MAX_POST_IMAGES = 4;
export const MAX_RESUME_SIZE_MB = 10;
export const MAX_IMAGE_SIZE_MB = 5;

export const REACTION_TYPES = ['like', 'fire', 'strong'] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export const FRIEND_STATUS = ['pending', 'accepted', 'declined'] as const;
export type FriendStatus = (typeof FRIEND_STATUS)[number];

export const GAME_STATUS = ['upcoming', 'ongoing', 'completed', 'cancelled'] as const;
export type GameStatus = (typeof GAME_STATUS)[number];

export const PARTICIPANT_STATUS = ['invited', 'accepted', 'declined'] as const;
export type ParticipantStatus = (typeof PARTICIPANT_STATUS)[number];

export const JOB_STATUS = [
  'applied',
  'screening',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn',
] as const;
export type JobStatus = (typeof JOB_STATUS)[number];

export const NOTIFICATION_CHANNEL = ['push', 'email'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[number];

export const NOTIFICATION_TYPE = [
  'job_followup_1d',
  'job_followup_3d',
  'job_followup_5d',
  'game_invite',
  'friend_request',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPE)[number];
