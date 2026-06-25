import { createClient } from '@supabase/supabase-js';

// This securely pulls the variables from Vercel instead of exposing them in the code
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
