import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://dbktjneeglyohycyvydt.supabase.co";
const fallbackSupabaseAnonKey = "sb_publishable_bBNv6LyEuovMXOazxQlydA_2eA7EGAc";
export const ADMIN_SUPABASE_STORAGE_KEY = "gc_admin_supabase_auth";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || fallbackSupabaseUrl;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || fallbackSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseAuthSetupMessage =
  "O acesso oficial está temporariamente indisponível. Tente novamente em instantes.";

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : null;

export const adminSupabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storageKey: ADMIN_SUPABASE_STORAGE_KEY,
      },
    })
  : null;
