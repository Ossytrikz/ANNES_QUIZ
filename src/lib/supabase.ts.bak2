import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Debug environment variables
console.log('Environment variables:', {
  NODE_ENV: import.meta.env.MODE,
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? '***' : 'MISSING',
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '***' : 'MISSING'
});

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const error = new Error('Missing Supabase environment variables');
  console.error('Supabase configuration error:', {
    message: error.message,
    VITE_SUPABASE_URL: !!supabaseUrl,
    VITE_SUPABASE_ANON_KEY: !!supabaseAnonKey
  });
  throw error;
}

// Validate URL format
if (!supabaseUrl.startsWith('https://')) {
  const error = new Error('Invalid Supabase URL. Must start with https://');
  console.error('Supabase URL validation failed:', { supabaseUrl });
  throw error;
}

console.log('Initializing Supabase client with URL:', supabaseUrl);

const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      debug: true
    },
    global: {
      headers: {
        'X-Client-Info': 'anne-quiz/1.0.0'
      }
    }
  }
);

// Test the connection in the background
(async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('Supabase connection test:', { data, error });
  } catch (e) {
    console.error('Supabase connection test failed:', e);
  }
})();

// Export the supabase client instance
export { supabase };

export default supabase;