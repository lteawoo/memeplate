import { config } from 'dotenv';
import { z } from 'zod';

const nodeEnv = process.env.NODE_ENV ?? 'development';

config({ path: '.env' });
config({ path: `.env.${nodeEnv}`, override: true });

const optionalString = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().optional());

const optionalUrl = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().url().optional());

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(8080),
  API_HOST: z.string().min(1).default('0.0.0.0'),
  WEB_ORIGIN: z.string().url().default('http://localhost:5174'),
  WEB_DIST_DIR: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  GOOGLE_REDIRECT_URI: optionalUrl,
  JWT_ACCESS_SECRET: optionalString,
  JWT_REFRESH_SECRET: optionalString,
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().optional(),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().optional(),
  AUTH_SESSION_SECRET: optionalString,
  AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),
  SUPABASE_URL: optionalUrl,
  SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  R2_BUCKET_NAME: optionalString,
  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_ENDPOINT: optionalUrl,
  R2_PUBLIC_BASE_URL: optionalUrl,
  R2_UPLOAD_MAX_MB: z.coerce.number().int().positive().optional(),
  R2_UPLOAD_ALLOWED_MIME: optionalString
});

export const env = EnvSchema.parse(process.env);
