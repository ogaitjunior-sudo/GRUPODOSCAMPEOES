import type { PostgrestError } from "@supabase/supabase-js";
import { adminSupabase, isSupabaseConfigured, supabase } from "@/lib/supabase";

const PLAYER_ACCOUNTS_TABLE = "player_accounts";
const PLAYER_ACCOUNTS_READ_TIMEOUT_MS = 6_000;

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

function normalizeDirectoryValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/^@+/, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
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

function withPlayerAccountsTimeout<T>(promise: Promise<T>, timeoutMs = PLAYER_ACCOUNTS_READ_TIMEOUT_MS) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      reject(new Error("Tempo limite ao consultar os cadastros de jogadores."));
    }, timeoutMs);

    promise
      .then(resolve, reject)
      .finally(() => {
        globalThis.clearTimeout(timeoutId);
      });
  });
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

export async function resolvePlayerAccountLoginEmail(identifier: string) {
  const readClient = supabase;
  const normalizedIdentifier = normalizeDirectoryValue(identifier);

  if (!normalizedIdentifier || !isSupabaseConfigured || !readClient) {
    return { email: null } as const;
  }

  const rpcResponse = await withPlayerAccountsTimeout(
    readClient.rpc("resolve_player_login_email", {
      p_identifier: identifier.trim(),
    }),
  ).catch(() => null);
  const rpcData = rpcResponse?.data as Array<{ email?: unknown; match_count?: unknown }> | null;
  const rpcError = rpcResponse?.error;

  if (!rpcError && Array.isArray(rpcData) && rpcData[0]) {
    const matchCount = Number(rpcData[0].match_count) || 0;
    const email = typeof rpcData[0].email === "string" ? normalizeEmail(rpcData[0].email) : "";

    if (matchCount === 1 && email) {
      return { email } as const;
    }

    if (matchCount > 1) {
      return {
        email: null,
        error: "Encontramos mais de uma conta com esse nome. Entre com o e-mail do jogador.",
      } as const;
    }
  }

  const { data, error } = await withPlayerAccountsTimeout(
    readClient
      .from(PLAYER_ACCOUNTS_TABLE)
      .select("name,email")
      .limit(500),
  ).catch(() => ({ data: null, error: null }));

  if (error || !Array.isArray(data)) {
    return { email: null } as const;
  }

  const matchingEmails = Array.from(
    new Set(
      data
        .filter((row) => row && typeof row === "object")
        .filter((row) => {
          const record = row as Pick<PlayerAccountRow, "name" | "email">;

          return (
            normalizeDirectoryValue(record.name) === normalizedIdentifier ||
            normalizeDirectoryValue(record.email) === normalizedIdentifier
          );
        })
        .map((row) => normalizeEmail((row as Pick<PlayerAccountRow, "email">).email))
        .filter(Boolean),
    ),
  );

  if (matchingEmails.length === 1) {
    return { email: matchingEmails[0] } as const;
  }

  if (matchingEmails.length > 1) {
    return {
      email: null,
      error: "Encontramos mais de uma conta com esse nome. Entre com o e-mail do jogador.",
    } as const;
  }

  return { email: null } as const;
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
