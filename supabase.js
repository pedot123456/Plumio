import { createClient } from '@supabase/supabase-js';

// The base URL from your screenshot (without the /rest/v1/ at the end)
const supabaseUrl = 'https://ghyetlnogbswxzbtnrwe.supabase.co';

const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoeWV0bG5vZ2Jzd3h6YnRucndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzk1NjIsImV4cCI6MjA5NTk1NTU2Mn0.mcbhygQP3XH79pBSuv7P-Hkc7JUESe4IU47xsWgP0MA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);