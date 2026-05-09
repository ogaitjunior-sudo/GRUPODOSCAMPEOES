import type { PostgrestError } from "@supabase/supabase-js";
import { adminSupabase, isSupabaseConfigured, supabase } from "@/lib/supabase";

const PLAYER_ACCOUNTS_TABLE = "player_accounts";

export interface PlayerAccountRecord {
  id: string;
  authUserId: string | null;
  name: string;
  email: string;
  provider: string;
  createdAt: string;
  lastLoginAt: string | null;
  updatedAt: string;
}

interface PlayerAccountPayload {
  id?: string;
  authUserId?: string | null;
  name: string;
  email: string;
  provider?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

type PlayerAccountRow = {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  provider: string;
  created_at: string;
  last_login_at: string | null;
  updated_at: string;
};

function createPlayerAccountId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `player-account-${crypto.randomUUID()}`;
  }

  return `player-account-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function mapRowToPlayerAccount(row: PlayerAccountRow): PlayerAccountRecord {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    name: row.name,
    email: row.email,
    provider: row.provider,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    updatedAt: row.updated_at,
  };
}

function getErrorMessage(error: unknown) {
  const postgrestError = error as Partial<PostgrestError> | null;

  if (typeof postgrestError?.message === "string" && postgrestError.message.trim()) {
    return postgrestError.message.trim();
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "";
}

export async function listPlayerAccounts() {
  const readClient = adminSupabase ?? supabase;

  if (!isSupabaseConfigured || !readClient) {
    return [] satisfies PlayerAccountRecord[];
  }

  const { data, error } = await readClient
    .from(PLAYER_ACCOUNTS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapRowToPlayerAccount(row as PlayerAccountRow));
}

export async function upsertPlayerAccount(payload: PlayerAccountPayload) {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const email = normalizeEmail(payload.email);
  const name = payload.name.trim();

  if (!email || !name) {
    return null;
  }

  const timestamp = payload.lastLoginAt ?? payload.createdAt ?? new Date().toISOString();
  const row = {
    id: payload.id ?? createPlayerAccountId(),
    auth_user_id: payload.authUserId ?? null,
    name,
    email,
    provider: payload.provider ?? "supabase",
    created_at: payload.createdAt ?? timestamp,
    last_login_at: payload.lastLoginAt ?? null,
  };

  const { data, error } = await supabase
    .from(PLAYER_ACCOUNTS_TABLE)
    .upsert(row, { onConflict: "email" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data ? mapRowToPlayerAccount(data as PlayerAccountRow) : null;
}

export function formatPlayerAccountsStoreError(error: unknown) {
  const postgrestError = error as Partial<PostgrestError> | null;
  const errorCode = postgrestError?.code?.toUpperCase();
  const message = getErrorMessage(error);

  if (errorCode === "42P01" || errorCode === "PGRST205" || message.toLowerCase().includes("schema cache")) {
    return "A tabela public.player_accounts ainda nao esta publicada no Supabase. Rode a migration para listar os cadastros.";
  }

  if (errorCode === "42501") {
    return "O Supabase bloqueou a leitura dos cadastros. Entre no admin novamente para ativar a sessao autenticada.";
  }

  return message || "Nao foi possivel carregar os cadastros de jogadores.";
}
