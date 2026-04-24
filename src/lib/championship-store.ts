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
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type {
  ChampionshipFormValues,
  ChampionshipRegistrationRequest,
  ChampionshipRecord,
  ChampionshipStatus,
} from "@/types/championship";

const CHAMPIONSHIPS_STORAGE_KEY = "gc_championships_v2";
const CHAMPIONSHIPS_TABLE = "championships";

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

function shouldFallbackToLocal(error: unknown) {
  const postgrestError = error as Partial<PostgrestError> | null;
  const errorCode = postgrestError?.code?.toUpperCase();

  return isChampionshipTableUnavailable(error) || errorCode === "42501";
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
  return isSupabaseConfigured ? "supabase" : "local";
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
  if (!supabase) {
    return readStoredChampionships();
  }

  const { data, error } = await supabase
    .from(CHAMPIONSHIPS_TABLE)
    .select("*")
    .order("start_date", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    if (shouldFallbackToLocal(error)) {
      return readStoredChampionships();
    }

    throw error;
  }

  return mergeChampionshipCollections(
    (data ?? []).map((row) => mapRowToRecord(row as ChampionshipRow)),
    readStoredChampionships(),
  );
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

  if (!supabase) {
    persistChampionshipLocally(record);
    return record;
  }

  const query =
    mode === "insert"
      ? supabase.from(CHAMPIONSHIPS_TABLE).insert(mapRecordToRow(record))
      : supabase.from(CHAMPIONSHIPS_TABLE).update(mapRecordToRow(record)).eq("id", record.id);

  const { data, error } = await query.select().single();

  if (error) {
    if (shouldFallbackToLocal(error)) {
      persistChampionshipLocally(record);
      return record;
    }

    throw error;
  }

  const savedRecord = mapRowToRecord(data as ChampionshipRow);
  persistChampionshipLocally(savedRecord);
  return savedRecord;
}

export async function deleteChampionshipRecord(id: string) {
  if (!supabase) {
    removeChampionshipLocally(id);
    return;
  }

  const { error } = await supabase.from(CHAMPIONSHIPS_TABLE).delete().eq("id", id);

  if (error) {
    if (shouldFallbackToLocal(error)) {
      removeChampionshipLocally(id);
      return;
    }

    throw error;
  }

  removeChampionshipLocally(id);
}

export function formatChampionshipStoreError(error: unknown) {
  const postgrestError = error as Partial<PostgrestError> | null;
  const errorCode = postgrestError?.code?.toUpperCase();
  const errorMessage = postgrestError?.message;

  if (errorCode === "42501") {
    return "O Supabase bloqueou a escrita com RLS. O portal vai continuar usando a base local ate a permissao ser ajustada.";
  }

  if (errorCode === "42P01") {
    return "A tabela public.championships ainda nao existe no Supabase. Rode a migration antes de usar o banco.";
  }

  if (errorCode === "PGRST205" || isChampionshipTableUnavailable(error)) {
    return "A tabela public.championships ainda nao foi publicada no schema cache do Supabase. Rode a migration e atualize o schema.";
  }

  if (typeof errorMessage === "string" && errorMessage.trim()) {
    return errorMessage;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Nao foi possivel sincronizar os campeonatos com o banco.";
}
