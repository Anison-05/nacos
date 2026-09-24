import { createClient } from '@supabase/supabase-js';

// Production defaults so that client bundle connects reliably even if Vercel build lacks explicit env overrides
const defaultUrl = 'https://hsseypgtulmecdvkmkgs.supabase.co';
const defaultAnonKey = 'sb_publishable_tfzWkPHpsG7h7GyPdMM4pg_dPFHieOJ';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-ref.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
