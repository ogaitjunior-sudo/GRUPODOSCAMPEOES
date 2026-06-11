import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://dbktjneeglyohycyvydt.supabase.co";
const fallbackSupabaseAnonKey = "sb_publishable_bBNv6LyEuovMXOazxQlydA_2eA7EGAc";
export const ADMIN_SUPABASE_STORAGE_KEY = "gc_admin_supabase_auth";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || fallbackSupabaseUrl;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || fallbackSupabaseAnonKey;
const configuredPublicSiteUrl =
  import.meta.env.VITE_PUBLIC_SITE_URL?.trim() ||
  import.meta.env.VITE_SITE_URL?.trim() ||
  import.meta.env.VITE_APP_URL?.trim() ||
  "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseRestUrl = supabaseUrl;
export const supabaseRestAnonKey = supabaseAnonKey;
export const supabaseAuthSetupMessage =
  "O acesso oficial está temporariamente indisponível. Tente novamente em instantes.";

function normalizePublicOrigin(value: string) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function isLocalHostname(hostname: string) {
  const normalizedHostname = hostname.trim().toLowerCase();

  return (
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "0.0.0.0" ||
    normalizedHostname === "::1" ||
    normalizedHostname === "[::1]" ||
    normalizedHostname.endsWith(".localhost")
  );
}

export function getPublicSiteOrigin() {
  const configuredOrigin = normalizePublicOrigin(configuredPublicSiteUrl);

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (typeof window === "undefined" || !window.location.origin || window.location.origin === "null") {
    return undefined;
  }

  return window.location.origin;
}

export function isUsingLocalPasswordRecoveryRedirect() {
  if (normalizePublicOrigin(configuredPublicSiteUrl) || typeof window === "undefined") {
    return false;
  }

  return isLocalHostname(window.location.hostname);
}

export function getPasswordRecoveryRedirectUrl() {
  const publicOrigin = getPublicSiteOrigin();

  return publicOrigin ? `${publicOrigin}/recuperar-senha` : undefined;
}

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
