import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Expect Vite-style env vars. Define both for flexibility.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n' +
    'Create a .env (or .env.local) with:\n' +
    'VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY'
  );
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || '',
  SUPABASE_ANON_KEY || ''
);
