import type { PostgrestError } from "@supabase/supabase-js";
import {
  createChampionshipId,
  createDefaultChampionshipConfiguration,
  normalizeChampionshipStatus,
  normalizeChampionshipConfiguration,
  normalizeChampionshipFormValues,
  normalizeChampionshipRegistrationRequests,
  sortChampionships,
} from "@/lib/championships";
import {
  adminSupabase,
  isSupabaseConfigured,
  supabase,
  supabaseRestAnonKey,
  supabaseRestUrl,
} from "@/lib/supabase";
import type {
  ChampionshipFormValues,
  ChampionshipRegistrationRequest,
  ChampionshipRecord,
  ChampionshipStatus,
} from "@/types/championship";

const CHAMPIONSHIPS_STORAGE_KEY = "gc_championships_v2";
const CHAMPIONSHIPS_TABLE = "championships";
const CHAMPIONSHIP_WRITE_MAX_ATTEMPTS = 2;
const CHAMPIONSHIP_WRITE_RETRY_DELAY_MS = 900;
const CHAMPIONSHIP_REST_WRITE_TIMEOUT_MS = 15_000;
const CHAMPIONSHIP_SHARED_SUPABASE_REQUIRED_MESSAGE =
  "O painel de campeonatos esta em modo local nesta versao do app. Atualize o app publicado e conecte o Supabase para que todos vejam os campeonatos criados.";

type ChampionshipRow = {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  team_count: number;
  rules: string;
  status: unknown;
  configuration?: unknown;
  created_at: string;
  updated_at: string;
};

type ChampionshipConfigurationPayload = {
  settings?: unknown;
  registrationRequests?: unknown;
};

export type ChampionshipStorageMode = "local" | "supabase";
const isChampionshipStoreTestMode = import.meta.env.MODE === "test";

function isChampionshipRecord(value: unknown): value is ChampionshipRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ChampionshipRecord).id === "string" &&
    typeof (value as ChampionshipRecord).name === "string" &&
    typeof (value as ChampionshipRecord).description === "string" &&
    typeof (value as ChampionshipRecord).startDate === "string" &&
    typeof (value as ChampionshipRecord).endDate === "string" &&
    typeof (value as ChampionshipRecord).teamCount === "number" &&
    typeof (value as ChampionshipRecord).rules === "string" &&
    typeof (value as ChampionshipRecord).status === "string" &&
    typeof (value as ChampionshipRecord).configuration === "object" &&
    (value as ChampionshipRecord).configuration !== null &&
    typeof (value as ChampionshipRecord).createdAt === "string" &&
    typeof (value as ChampionshipRecord).updatedAt === "string"
  );
}

function extractConfigurationPayload(
  value: unknown,
): { settings: unknown; registrationRequests: ChampionshipRegistrationRequest[] } {
  if (value && typeof value === "object" && ("settings" in value || "registrationRequests" in value)) {
    const payload = value as ChampionshipConfigurationPayload;

    return {
      settings: payload.settings,
      registrationRequests: normalizeChampionshipRegistrationRequests(payload.registrationRequests),
    };
  }

  return {
    settings: value,
    registrationRequests: [],
  };
}

function mapRowToRecord(row: ChampionshipRow): ChampionshipRecord {
  const payload = extractConfigurationPayload(row.configuration);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    teamCount: row.team_count,
    rules: row.rules,
    status: normalizeChampionshipStatus(row.status),
    configuration: normalizeChampionshipConfiguration(payload.settings as object | undefined),
    registrationRequests: payload.registrationRequests,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecordToRow(record: ChampionshipRecord): ChampionshipRow {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    start_date: record.startDate,
    end_date: record.endDate,
    team_count: record.teamCount,
    rules: record.rules,
    status: record.status,
    configuration: {
      settings: record.configuration,
      registrationRequests: record.registrationRequests,
    } satisfies ChampionshipConfigurationPayload,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function isChampionshipTableUnavailable(error: unknown) {
  const postgrestError = error as Partial<PostgrestError> | null;
  const errorCode = postgrestError?.code?.toUpperCase();
  const errorMessage = postgrestError?.message?.toLowerCase() ?? "";

  return (
    errorCode === "42P01" ||
    errorCode === "PGRST205" ||
    errorMessage.includes("could not find the table") ||
    errorMessage.includes("schema cache") ||
    errorMessage.includes("relation \"public.championships\" does not exist")
  );
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

function isSupabaseNetworkError(error: unknown) {
  const errorMessage = getErrorMessage(error).toLowerCase();
  const errorName =
    error instanceof Error && typeof error.name === "string" ? error.name.toLowerCase() : "";

  return (
    errorName.includes("aborterror") ||
    errorMessage.includes("aborterror") ||
    errorMessage.includes("operation was aborted") ||
    errorMessage.includes("signal is aborted") ||
    errorMessage.includes("signal aborted") ||
    errorMessage.includes("aborted without reason") ||
    errorMessage.includes("failed to fetch") ||
    errorMessage.includes("fetch failed") ||
    errorMessage.includes("load failed") ||
    errorMessage.includes("network error") ||
    errorMessage.includes("networkerror") ||
    errorMessage.includes("network request failed")
  );
}

function wait(delayMs: number) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });
}

function logChampionshipStoreError(operation: string, error: unknown) {
  console.error(`[championship-store] ${operation}`, error);
}

async function getSupabaseWriteAccessToken() {
  const adminSession = await adminSupabase?.auth.getSession().catch(() => null);
  const adminAccessToken = adminSession?.data.session?.access_token;

  if (adminAccessToken) {
    return adminAccessToken;
  }

  const refreshedAdminSession = await adminSupabase?.auth.refreshSession().catch(() => null);
  const refreshedAdminAccessToken = refreshedAdminSession?.data.session?.access_token;

  if (refreshedAdminAccessToken) {
    return refreshedAdminAccessToken;
  }

  const publicSession = await supabase?.auth.getSession().catch(() => null);
  const publicAccessToken = publicSession?.data.session?.access_token;

  if (publicAccessToken) {
    return publicAccessToken;
  }

  throw new Error(
    "A sessao autenticada do Supabase nao esta ativa. Saia do painel, entre novamente como ADMIN e tente salvar outra vez.",
  );
}

async function requestChampionshipsRest(
  path: string,
  options: {
    method: "POST" | "PATCH" | "DELETE";
    body?: unknown;
  },
) {
  const accessToken = await getSupabaseWriteAccessToken();
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort();
  }, CHAMPIONSHIP_REST_WRITE_TIMEOUT_MS);

  try {
    const response = await fetch(`${supabaseRestUrl}/rest/v1/${path}`, {
      method: options.method,
      headers: {
        apikey: supabaseRestAnonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (response.ok) {
      return;
    }

    const payload = await response.json().catch(() => null);
    const message =
      typeof payload?.message === "string" && payload.message.trim()
        ? payload.message
        : `Supabase retornou HTTP ${response.status} ao salvar o campeonato.`;

    throw {
      code: typeof payload?.code === "string" ? payload.code : `${response.status}`,
      message,
      details: payload?.details,
      hint: payload?.hint,
    } satisfies Partial<PostgrestError>;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function runSupabaseWriteWithRetry<T>(
  execute: () => Promise<T>,
  options: {
    maxAttempts?: number;
    retryDelayMs?: number;
    beforeRetry?: (attempt: number, error: unknown) => Promise<void> | void;
  },
) {
  const maxAttempts = options.maxAttempts ?? CHAMPIONSHIP_WRITE_MAX_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? CHAMPIONSHIP_WRITE_RETRY_DELAY_MS;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await execute();
    } catch (error) {
      lastError = error;

      if (!isSupabaseNetworkError(error) || attempt === maxAttempts) {
        throw error;
      }

      await options.beforeRetry?.(attempt, error);
      await wait(retryDelayMs * attempt);
    }
  }

  throw lastError;
}

function mergeChampionshipCollections(...collections: ChampionshipRecord[][]) {
  const registry = new Map<string, ChampionshipRecord>();

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

  return sortChampionships(Array.from(registry.values()));
}

function persistChampionshipLocally(record: ChampionshipRecord) {
  const nextChampionships = mergeChampionshipCollections(readStoredChampionships(), [record]);
  writeStoredChampionships(nextChampionships);
}

function removeChampionshipLocally(id: string) {
  const nextChampionships = readStoredChampionships().filter((item) => item.id !== id);
  writeStoredChampionships(nextChampionships);
}

export function getChampionshipStorageMode(): ChampionshipStorageMode {
  return !isChampionshipStoreTestMode && isSupabaseConfigured ? "supabase" : "local";
}

export function readStoredChampionships(): ChampionshipRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(CHAMPIONSHIPS_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortChampionships(
      parsed
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          if (isChampionshipRecord(item)) {
            return {
              ...item,
              status: normalizeChampionshipStatus(item.status),
              configuration: normalizeChampionshipConfiguration(item.configuration),
              registrationRequests: normalizeChampionshipRegistrationRequests(
                item.registrationRequests,
              ),
            } satisfies ChampionshipRecord;
          }

          const legacyItem = item as Partial<ChampionshipRecord>;

          if (
            typeof legacyItem.id !== "string" ||
            typeof legacyItem.name !== "string" ||
            typeof legacyItem.description !== "string" ||
            typeof legacyItem.startDate !== "string" ||
            typeof legacyItem.endDate !== "string" ||
            typeof legacyItem.teamCount !== "number" ||
            typeof legacyItem.rules !== "string" ||
            typeof legacyItem.status !== "string" ||
            typeof legacyItem.createdAt !== "string" ||
            typeof legacyItem.updatedAt !== "string"
          ) {
            return null;
          }

          return {
            id: legacyItem.id,
            name: legacyItem.name,
            description: legacyItem.description,
            startDate: legacyItem.startDate,
            endDate: legacyItem.endDate,
            teamCount: legacyItem.teamCount,
            rules: legacyItem.rules,
            status: normalizeChampionshipStatus(legacyItem.status),
            configuration: createDefaultChampionshipConfiguration(),
            registrationRequests: [],
            createdAt: legacyItem.createdAt,
            updatedAt: legacyItem.updatedAt,
          } satisfies ChampionshipRecord;
        })
        .filter((item): item is ChampionshipRecord => Boolean(item)),
    );
  } catch {
    return [];
  }
}

export function writeStoredChampionships(championships: ChampionshipRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    CHAMPIONSHIPS_STORAGE_KEY,
    JSON.stringify(sortChampionships(championships)),
  );
}

export async function listChampionships() {
  if (isChampionshipStoreTestMode) {
    return readStoredChampionships();
  }

  if (!supabase) {
    throw new Error(CHAMPIONSHIP_SHARED_SUPABASE_REQUIRED_MESSAGE);
  }

  const { data, error } = await supabase
    .from(CHAMPIONSHIPS_TABLE)
    .select("*")
    .order("start_date", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    logChampionshipStoreError("listChampionships failed", error);
    throw error;
  }

  return sortChampionships((data ?? []).map((row) => mapRowToRecord(row as ChampionshipRow)));
}

export async function createChampionshipRecord(values: ChampionshipFormValues) {
  const normalizedValues = normalizeChampionshipFormValues(values);
  const timestamp = new Date().toISOString();
  const nextRecord: ChampionshipRecord = {
    id: createChampionshipId(),
    ...normalizedValues,
    registrationRequests: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return saveChampionshipRecord(nextRecord, { mode: "insert" });
}

export async function updateChampionshipRecord(
  currentRecord: ChampionshipRecord,
  values: ChampionshipFormValues,
) {
  const updatedRecord: ChampionshipRecord = {
    ...currentRecord,
    ...normalizeChampionshipFormValues(values),
    updatedAt: new Date().toISOString(),
  };

  return saveChampionshipRecord(updatedRecord, { mode: "update" });
}

export async function saveChampionshipRecord(
  record: ChampionshipRecord,
  options: { mode?: "insert" | "update" } = {},
) {
  const mode = options.mode ?? "update";

  if (isChampionshipStoreTestMode) {
    persistChampionshipLocally(record);
    return record;
  }

  if (!isSupabaseConfigured) {
    throw new Error(CHAMPIONSHIP_SHARED_SUPABASE_REQUIRED_MESSAGE);
  }

  const row = mapRecordToRow(record);
  await runSupabaseWriteWithRetry(
    () =>
      mode === "insert"
        ? requestChampionshipsRest(CHAMPIONSHIPS_TABLE, {
            method: "POST",
            body: row,
          })
        : requestChampionshipsRest(
            `${CHAMPIONSHIPS_TABLE}?id=eq.${encodeURIComponent(record.id)}`,
            {
              method: "PATCH",
              body: row,
            },
          ),
    {
      beforeRetry: async () => {
        if (!adminSupabase) {
          return;
        }

        await adminSupabase.auth.refreshSession().catch(() => undefined);
      },
    },
  );

  return record;
}

export async function deleteChampionshipRecord(id: string) {
  if (isChampionshipStoreTestMode) {
    removeChampionshipLocally(id);
    return;
  }

  if (!isSupabaseConfigured) {
    throw new Error(CHAMPIONSHIP_SHARED_SUPABASE_REQUIRED_MESSAGE);
  }

  await runSupabaseWriteWithRetry(
    () =>
      requestChampionshipsRest(`${CHAMPIONSHIPS_TABLE}?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    {
      beforeRetry: async () => {
        if (!adminSupabase) {
          return;
        }

        await adminSupabase.auth.refreshSession().catch(() => undefined);
      },
    },
  );
}

export function formatChampionshipStoreError(error: unknown) {
  const postgrestError = error as Partial<PostgrestError> | null;
  const errorCode = postgrestError?.code?.toUpperCase();
  const errorMessage = getErrorMessage(error);

  if (errorMessage === CHAMPIONSHIP_SHARED_SUPABASE_REQUIRED_MESSAGE) {
    return errorMessage;
  }

  if (errorCode === "42501") {
    return "O Supabase bloqueou a escrita do campeonato. Entre no painel com a conta admin autenticada no Supabase ou ajuste as policies da tabela.";
  }

  if (errorCode === "42P01") {
    return "A tabela public.championships ainda nao existe no Supabase. Rode a migration antes de usar o banco.";
  }

  if (errorCode === "PGRST205" || isChampionshipTableUnavailable(error)) {
    return "A tabela public.championships ainda nao foi publicada no schema cache do Supabase. Rode a migration e atualize o schema.";
  }

  if (isSupabaseNetworkError(error)) {
    return "Nao foi possivel sincronizar com o Supabase agora. Verifique sua conexao e tente novamente em alguns instantes.";
  }

  if (typeof errorMessage === "string" && errorMessage.trim()) {
    return errorMessage;
  }

  return "Nao foi possivel sincronizar os campeonatos com o banco.";
}
