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
const CHAMPIONSHIP_WRITE_MAX_ATTEMPTS = 1;
const CHAMPIONSHIP_WRITE_RETRY_DELAY_MS = 900;
const CHAMPIONSHIP_AUTH_TIMEOUT_MS = 4_000;
const CHAMPIONSHIP_REST_WRITE_TIMEOUT_MS = 20_000;
const CHAMPIONSHIP_REST_READ_TIMEOUT_MS = 12_000;
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
  const errorCode = getErrorCode(error);
  const errorMessage = getErrorMessage(error).toLowerCase();

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

function getErrorCode(error: unknown) {
  const code = (error as Partial<PostgrestError> | null)?.code;

  return typeof code === "string" ? code.toUpperCase() : "";
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then(resolve, reject)
      .finally(() => {
        globalThis.clearTimeout(timeoutId);
      });
  });
}

function logChampionshipStoreError(operation: string, error: unknown) {
  console.error(`[championship-store] ${operation}`, error);
}

async function parseSupabaseRestError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  const message =
    typeof payload?.message === "string" && payload.message.trim()
      ? payload.message
      : fallback;

  return {
    code: typeof payload?.code === "string" ? payload.code : `${response.status}`,
    message,
    details: payload?.details,
    hint: payload?.hint,
  } satisfies Partial<PostgrestError>;
}

async function requestChampionshipsPublicRest(path: string) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort();
  }, CHAMPIONSHIP_REST_READ_TIMEOUT_MS);

  try {
    const response = await fetch(`${supabaseRestUrl}/rest/v1/${path}`, {
      method: "GET",
      headers: {
        apikey: supabaseRestAnonKey,
        Authorization: `Bearer ${supabaseRestAnonKey}`,
      },
      signal: controller.signal,
    });

    if (response.ok) {
      return (await response.json()) as unknown[];
    }

    throw await parseSupabaseRestError(
      response,
      `Supabase retornou HTTP ${response.status} ao ler os campeonatos.`,
    );
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function readChampionshipByIdFromPublicRest(id: string) {
  const rows = await requestChampionshipsPublicRest(
    `${CHAMPIONSHIPS_TABLE}?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
  );
  const row = rows[0];

  if (!row) {
    throw new Error(
      "O Supabase aceitou o salvamento, mas o campeonato ainda nao voltou na leitura publica. Verifique as policies de SELECT da tabela public.championships.",
    );
  }

  return mapRowToRecord(row as ChampionshipRow);
}

async function getSupabaseWriteAccessToken() {
  const adminSession = adminSupabase
    ? await withTimeout(
        adminSupabase.auth.getSession(),
        CHAMPIONSHIP_AUTH_TIMEOUT_MS,
        "Tempo limite ao validar a sessao admin do Supabase.",
      ).catch(() => null)
    : null;
  const adminAccessToken = adminSession?.data.session?.access_token;

  if (adminAccessToken) {
    return adminAccessToken;
  }

  const refreshedAdminSession = adminSupabase
    ? await withTimeout(
        adminSupabase.auth.refreshSession(),
        CHAMPIONSHIP_AUTH_TIMEOUT_MS,
        "Tempo limite ao renovar a sessao admin do Supabase.",
      ).catch(() => null)
    : null;
  const refreshedAdminAccessToken = refreshedAdminSession?.data.session?.access_token;

  if (refreshedAdminAccessToken) {
    return refreshedAdminAccessToken;
  }

  const publicSession = supabase
    ? await withTimeout(
        supabase.auth.getSession(),
        CHAMPIONSHIP_AUTH_TIMEOUT_MS,
        "Tempo limite ao validar a sessao do jogador no Supabase.",
      ).catch(() => null)
    : null;
  const publicAccessToken = publicSession?.data.session?.access_token;

  if (publicAccessToken) {
    return publicAccessToken;
  }

  throw new Error(
    "A sessao autenticada do Supabase nao esta ativa. Saia do painel, entre novamente como ADMIN e tente salvar outra vez.",
  );
}

async function getSupabasePlayerWriteAccessToken() {
  const publicSession = supabase
    ? await withTimeout(
        supabase.auth.getSession(),
        CHAMPIONSHIP_AUTH_TIMEOUT_MS,
        "Tempo limite ao validar a sessao do jogador no Supabase.",
      ).catch(() => null)
    : null;
  const publicAccessToken = publicSession?.data.session?.access_token;

  if (publicAccessToken) {
    return publicAccessToken;
  }

  throw new Error(
    "Entre com uma conta criada no site para participar. O pedido precisa de uma sessao oficial do Supabase para aparecer ao admin.",
  );
}

async function requestChampionshipsRestWithAccessToken(
  path: string,
  options: {
    method: "POST" | "PATCH" | "DELETE";
    body?: unknown;
    returnRepresentation?: boolean;
  },
  accessToken: string,
) {
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
        Prefer: options.returnRepresentation ? "return=representation" : "return=minimal",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (response.ok) {
      if (options.returnRepresentation) {
        return (await response.json()) as unknown[];
      }

      return [] as unknown[];
    }

    throw await parseSupabaseRestError(
      response,
      `Supabase retornou HTTP ${response.status} ao salvar o campeonato.`,
    );
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function requestChampionshipsRest(
  path: string,
  options: {
    method: "POST" | "PATCH" | "DELETE";
    body?: unknown;
    returnRepresentation?: boolean;
  },
) {
  return requestChampionshipsRestWithAccessToken(
    path,
    options,
    await getSupabaseWriteAccessToken(),
  );
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

  if (!isSupabaseConfigured) {
    throw new Error(CHAMPIONSHIP_SHARED_SUPABASE_REQUIRED_MESSAGE);
  }

  try {
    const rows = await requestChampionshipsPublicRest(
      `${CHAMPIONSHIPS_TABLE}?select=*&order=start_date.asc,updated_at.desc`,
    );

    return sortChampionships(rows.map((row) => mapRowToRecord(row as ChampionshipRow)));
  } catch (error) {
    logChampionshipStoreError("listChampionships failed", error);
    throw error;
  }
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
  const rows = await runSupabaseWriteWithRetry(
    () =>
      mode === "insert"
        ? requestChampionshipsRest(CHAMPIONSHIPS_TABLE, {
            method: "POST",
            body: row,
            returnRepresentation: true,
          })
        : requestChampionshipsRest(
            `${CHAMPIONSHIPS_TABLE}?id=eq.${encodeURIComponent(record.id)}`,
            {
              method: "PATCH",
              body: row,
              returnRepresentation: true,
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

  const writtenRecord = rows[0] ? mapRowToRecord(rows[0] as ChampionshipRow) : record;
  return readChampionshipByIdFromPublicRest(writtenRecord.id);
}

export async function saveChampionshipRegistrationReviewRecord(record: ChampionshipRecord) {
  if (isChampionshipStoreTestMode) {
    persistChampionshipLocally(record);
    return record;
  }

  if (!isSupabaseConfigured) {
    throw new Error(CHAMPIONSHIP_SHARED_SUPABASE_REQUIRED_MESSAGE);
  }

  const rows = await runSupabaseWriteWithRetry(
    () =>
      requestChampionshipsRest(`${CHAMPIONSHIPS_TABLE}?id=eq.${encodeURIComponent(record.id)}`, {
        method: "PATCH",
        body: {
          status: record.status,
          configuration: {
            settings: record.configuration,
            registrationRequests: record.registrationRequests,
          } satisfies ChampionshipConfigurationPayload,
          updated_at: record.updatedAt,
        },
        returnRepresentation: true,
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

  if (!rows[0]) {
    throw new Error(
      "O Supabase nao retornou a revisao salva. Verifique as policies de UPDATE da tabela public.championships.",
    );
  }

  return mapRowToRecord(rows[0] as ChampionshipRow);
}

export async function submitChampionshipRegistrationRecord(
  currentRecord: ChampionshipRecord,
  request: ChampionshipRegistrationRequest,
) {
  if (isChampionshipStoreTestMode) {
    const updatedRecord = {
      ...currentRecord,
      registrationRequests: [request, ...currentRecord.registrationRequests],
      updatedAt: request.requestedAt,
    } satisfies ChampionshipRecord;

    persistChampionshipLocally(updatedRecord);
    return updatedRecord;
  }

  if (!isSupabaseConfigured) {
    throw new Error(CHAMPIONSHIP_SHARED_SUPABASE_REQUIRED_MESSAGE);
  }

  const [freshRecord, playerAccessToken] = await Promise.all([
    readChampionshipByIdFromPublicRest(currentRecord.id),
    getSupabasePlayerWriteAccessToken(),
  ]);

  if (freshRecord.status !== "REGISTRATION") {
    throw new Error("Este campeonato nao esta aceitando pedidos no momento.");
  }

  if (freshRecord.configuration.registrationMode !== "public") {
    throw new Error("Este campeonato usa entrada privada pela organizacao.");
  }

  const normalizedEmail = request.playerEmail.trim().toLowerCase();
  const existingRequest = freshRecord.registrationRequests.find(
    (item) =>
      item.playerId === request.playerId ||
      item.playerEmail.trim().toLowerCase() === normalizedEmail,
  );

  if (existingRequest) {
    return freshRecord;
  }

  const occupiedSlots = freshRecord.registrationRequests.filter(
    (item) => item.status === "approved" || item.status === "pending",
  ).length;

  if (occupiedSlots >= freshRecord.teamCount) {
    throw new Error("O limite maximo de participantes deste campeonato ja foi atingido.");
  }

  const nextRegistrationRequests = [
    {
      ...request,
      playerName: request.playerName.trim() || "Jogador",
      playerEmail: normalizedEmail,
    },
    ...freshRecord.registrationRequests,
  ] satisfies ChampionshipRegistrationRequest[];

  const rows = await runSupabaseWriteWithRetry(
    () =>
      requestChampionshipsRestWithAccessToken(
        `${CHAMPIONSHIPS_TABLE}?id=eq.${encodeURIComponent(freshRecord.id)}`,
        {
          method: "PATCH",
          body: {
            configuration: {
              settings: freshRecord.configuration,
              registrationRequests: nextRegistrationRequests,
            } satisfies ChampionshipConfigurationPayload,
            updated_at: request.requestedAt,
          },
          returnRepresentation: true,
        },
        playerAccessToken,
      ),
    {},
  );

  if (!rows[0]) {
    throw new Error(
      "O Supabase nao retornou a inscricao salva. Verifique as policies de UPDATE da tabela public.championships.",
    );
  }

  const writtenRecord = mapRowToRecord(rows[0] as ChampionshipRow);
  return readChampionshipByIdFromPublicRest(writtenRecord.id);
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
  const errorCode = getErrorCode(error);
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
