import type { PostgrestError } from "@supabase/supabase-js";
import {
  normalizeFriendlyChallengeRecord,
  sortFriendlyChallenges,
} from "@/lib/friendly-challenges";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { FriendlyChallengeRecord } from "@/types/friendly-challenge";

const FRIENDLY_CHALLENGES_STORAGE_KEY = "gc_friendly_challenges_v1";
const FRIENDLY_CHALLENGES_TABLE = "friendly_challenges";
const FRIENDLY_CHALLENGES_READ_TIMEOUT_MS = 4_000;

type FriendlyChallengeRow = {
  id: string;
  championship_id: string | null;
  championship_name: string | null;
  from_team_id: string;
  to_team_id: string;
  from_player_id: string | null;
  from_player_email: string | null;
  to_player_id: string | null;
  to_player_email: string | null;
  from_team_name: string;
  to_team_name: string;
  from_flag_url: string | null;
  to_flag_url: string | null;
  date: string;
  time: string;
  message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type FriendlyChallengeStorageMode = "local" | "supabase";

function mapRowToRecord(row: FriendlyChallengeRow) {
  return normalizeFriendlyChallengeRecord({
    id: row.id,
    championshipId: row.championship_id,
    championshipName: row.championship_name,
    fromTeamId: row.from_team_id,
    toTeamId: row.to_team_id,
    fromPlayerId: row.from_player_id,
    fromPlayerEmail: row.from_player_email,
    toPlayerId: row.to_player_id,
    toPlayerEmail: row.to_player_email,
    fromTeamName: row.from_team_name,
    toTeamName: row.to_team_name,
    fromFlagUrl: row.from_flag_url,
    toFlagUrl: row.to_flag_url,
    date: row.date,
    time: row.time,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapRecordToRow(record: FriendlyChallengeRecord): FriendlyChallengeRow {
  return {
    id: record.id,
    championship_id: record.championshipId,
    championship_name: record.championshipName,
    from_team_id: record.fromTeamId,
    to_team_id: record.toTeamId,
    from_player_id: record.fromPlayerId,
    from_player_email: record.fromPlayerEmail,
    to_player_id: record.toPlayerId,
    to_player_email: record.toPlayerEmail,
    from_team_name: record.fromTeamName,
    to_team_name: record.toTeamName,
    from_flag_url: record.fromFlagUrl,
    to_flag_url: record.toFlagUrl,
    date: record.date,
    time: record.time,
    message: record.message,
    status: record.status,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function isFriendlyChallengesTableUnavailable(error: unknown) {
  const postgrestError = error as Partial<PostgrestError> | null;
  const errorCode = postgrestError?.code?.toUpperCase();
  const errorMessage = postgrestError?.message?.toLowerCase() ?? "";

  return (
    errorCode === "42P01" ||
    errorCode === "PGRST205" ||
    errorMessage.includes("could not find the table") ||
    errorMessage.includes("schema cache") ||
    errorMessage.includes('relation "public.friendly_challenges" does not exist')
  );
}

function shouldFallbackToLocal(error: unknown) {
  const postgrestError = error as Partial<PostgrestError> | null;
  const errorCode = postgrestError?.code?.toUpperCase();

  return isFriendlyChallengesTableUnavailable(error) || errorCode === "42501";
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

function isFriendlyChallengeNetworkError(error: unknown) {
  const errorMessage = getErrorMessage(error).toLowerCase();
  const errorName =
    error instanceof Error && typeof error.name === "string" ? error.name.toLowerCase() : "";

  return (
    errorName.includes("aborterror") ||
    errorMessage.includes("tempo limite") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("failed to fetch") ||
    errorMessage.includes("fetch failed") ||
    errorMessage.includes("load failed") ||
    errorMessage.includes("network error") ||
    errorMessage.includes("networkerror") ||
    errorMessage.includes("network request failed")
  );
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    Promise.resolve(promise)
      .then(resolve, reject)
      .finally(() => {
        globalThis.clearTimeout(timeoutId);
      });
  });
}

function mergeFriendlyChallengeCollections(...collections: FriendlyChallengeRecord[][]) {
  const registry = new Map<string, FriendlyChallengeRecord>();

  collections.flat().forEach((record) => {
    const current = registry.get(record.id);

    if (!current) {
      registry.set(record.id, record);
      return;
    }

    const currentUpdatedAt = new Date(current.updatedAt).getTime();
    const nextUpdatedAt = new Date(record.updatedAt).getTime();

    if (Number.isNaN(currentUpdatedAt) || nextUpdatedAt >= currentUpdatedAt) {
      registry.set(record.id, record);
    }
  });

  return sortFriendlyChallenges(Array.from(registry.values()));
}

function persistFriendlyChallengeLocally(record: FriendlyChallengeRecord) {
  const nextChallenges = mergeFriendlyChallengeCollections(readStoredFriendlyChallenges(), [record]);
  writeStoredFriendlyChallenges(nextChallenges);
}

export function readStoredFriendlyChallenges() {
  if (typeof window === "undefined") {
    return [] as FriendlyChallengeRecord[];
  }

  try {
    const rawValue = window.localStorage.getItem(FRIENDLY_CHALLENGES_STORAGE_KEY);

    if (!rawValue) {
      return [] as FriendlyChallengeRecord[];
    }

    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [] as FriendlyChallengeRecord[];
    }

    return sortFriendlyChallenges(
      parsed
        .map((item) => normalizeFriendlyChallengeRecord(item))
        .filter((item): item is FriendlyChallengeRecord => Boolean(item)),
    );
  } catch {
    return [] as FriendlyChallengeRecord[];
  }
}

export function writeStoredFriendlyChallenges(challenges: FriendlyChallengeRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    FRIENDLY_CHALLENGES_STORAGE_KEY,
    JSON.stringify(sortFriendlyChallenges(challenges)),
  );
}

export function getFriendlyChallengeStorageMode(): FriendlyChallengeStorageMode {
  return isSupabaseConfigured ? "supabase" : "local";
}

export async function listFriendlyChallenges() {
  if (!supabase) {
    return readStoredFriendlyChallenges();
  }

  let response;

  try {
    response = await withTimeout(
      supabase
        .from(FRIENDLY_CHALLENGES_TABLE)
        .select("*")
        .order("created_at", { ascending: false }),
      FRIENDLY_CHALLENGES_READ_TIMEOUT_MS,
      "Tempo limite ao carregar os desafios amistosos.",
    );
  } catch (error) {
    if (shouldFallbackToLocal(error) || isFriendlyChallengeNetworkError(error)) {
      return readStoredFriendlyChallenges();
    }

    throw error;
  }

  const { data, error } = response;

  if (error) {
    if (shouldFallbackToLocal(error) || isFriendlyChallengeNetworkError(error)) {
      return readStoredFriendlyChallenges();
    }

    throw error;
  }

  return mergeFriendlyChallengeCollections(
    (data ?? [])
      .map((row) => mapRowToRecord(row as FriendlyChallengeRow))
      .filter((item): item is FriendlyChallengeRecord => Boolean(item)),
    readStoredFriendlyChallenges(),
  );
}

export async function saveFriendlyChallengeRecord(
  record: FriendlyChallengeRecord,
  options: { mode?: "insert" | "update" } = {},
) {
  const mode = options.mode ?? "update";

  if (!supabase) {
    persistFriendlyChallengeLocally(record);
    return record;
  }

  const query =
    mode === "insert"
      ? supabase.from(FRIENDLY_CHALLENGES_TABLE).insert(mapRecordToRow(record))
      : supabase.from(FRIENDLY_CHALLENGES_TABLE).update(mapRecordToRow(record)).eq("id", record.id);

  const { data, error } = await query.select().single();

  if (error) {
    if (shouldFallbackToLocal(error)) {
      persistFriendlyChallengeLocally(record);
      return record;
    }

    throw error;
  }

  const savedRecord = mapRowToRecord(data as FriendlyChallengeRow);

  if (!savedRecord) {
    throw new Error("Nao foi possivel normalizar o desafio amistoso salvo.");
  }

  persistFriendlyChallengeLocally(savedRecord);
  return savedRecord;
}

export async function createFriendlyChallengeRecord(record: FriendlyChallengeRecord) {
  return saveFriendlyChallengeRecord(record, { mode: "insert" });
}

export function formatFriendlyChallengeStoreError(error: unknown) {
  const postgrestError = error as Partial<PostgrestError> | null;
  const errorCode = postgrestError?.code?.toUpperCase();
  const errorMessage = postgrestError?.message;

  if (errorCode === "42501") {
    return "O Supabase bloqueou a escrita dos desafios amistosos com RLS. O portal vai continuar usando a base local ate a permissao ser ajustada.";
  }

  if (errorCode === "42P01") {
    return "A tabela public.friendly_challenges ainda nao existe no Supabase. Rode a migration antes de usar o banco.";
  }

  if (errorCode === "PGRST205" || isFriendlyChallengesTableUnavailable(error)) {
    return "A tabela public.friendly_challenges ainda nao foi publicada no schema cache do Supabase. Rode a migration e atualize o schema.";
  }

  if (isFriendlyChallengeNetworkError(error)) {
    return "Nao foi possivel sincronizar os desafios amistosos agora. O portal liberou a tela usando o cache local.";
  }

  const safeMessage = getErrorMessage(error);

  if (safeMessage) {
    return safeMessage;
  }

  return "Nao foi possivel sincronizar os desafios amistosos.";
}
