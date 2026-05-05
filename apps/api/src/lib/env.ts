import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  GCS_BUCKET: z.string(),
  GCP_PROJECT_ID: z.string(),
  VAPID_PUBLIC_KEY: z.string(),
  VAPID_PRIVATE_KEY: z.string(),
  VAPID_SUBJECT: z.string(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;
