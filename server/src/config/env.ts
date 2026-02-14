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
  SUPABASE_URL: optionalUrl,
  SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString
});

export const env = EnvSchema.parse(process.env);
