/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_SUPABASE_EMAIL?: string;
  readonly VITE_ADMIN_PASSWORD_HASH?: string;
  readonly VITE_ADMIN_USERNAME?: string;
  readonly VITE_PLAYER_LOGIN?: string;
  readonly VITE_PLAYER_PASSWORD_HASH?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
