import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

export const getSupabaseAdminClient = () => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin env is missing. Fill SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
