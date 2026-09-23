// ====================================================================
// Server-Side Supabase Client (For Vercel Serverless Functions)
// CRITICAL: Uses SUPABASE_SERVICE_ROLE_KEY which is NEVER sent to browser
// ====================================================================

import { createClient } from '@supabase/supabase-js';

export function getServiceSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server environment missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
