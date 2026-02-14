import { config } from 'dotenv';
import { z } from 'zod';

config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(8080),
  API_HOST: z.string().min(1).default('0.0.0.0'),
  WEB_ORIGIN: z.string().url().default('http://localhost:5174'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional()
});

export const env = EnvSchema.parse(process.env);
