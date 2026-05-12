import type { PostgrestError } from "@supabase/supabase-js";
import { normalizeChampionshipWorkspace } from "@/lib/championship-runtime";
import {
  adminSupabase,
  isSupabaseConfigured,
  supabase,
  supabaseRestAnonKey,
  supabaseRestUrl,
} from "@/lib/supabase";
import type { ChampionshipRecord } from "@/types/championship";
import type { ChampionshipWorkspaceRecord } from "@/types/championship-runtime";

const CHAMPIONSHIP_WORKSPACES_STORAGE_KEY = "gc_championship_workspaces_v2";
const CHAMPIONSHIP_WORKSPACES_TABLE = "championship_workspaces";
const CHAMPIONSHIP_WORKSPACE_READ_TIMEOUT_MS = 5_000;
const CHAMPIONSHIP_WORKSPACE_REST_READ_TIMEOUT_MS = 12_000;
const CHAMPIONSHIP_WORKSPACE_WRITE_TIMEOUT_MS = 10_000;
const isChampionshipWorkspaceStoreTestMode = import.meta.env.MODE === "test";

type ChampionshipWorkspaceRow = {
  championship_id: string;
  teams: unknown;
  groups: unknown;
  group_matches: unknown;
  bracket: unknown;
  scoring: unknown;
  created_at: string;
  updated_at: string;
};

function mapRowToRecord(row: ChampionshipWorkspaceRow): ChampionshipWorkspaceRecord {
  return {
    championshipId: row.championship_id,
    teams: Array.isArray(row.teams) ? (row.teams as ChampionshipWorkspaceRecord["teams"]) : [],
    groups: Array.isArray(row.groups) ? (row.groups as ChampionshipWorkspaceRecord["groups"]) : [],
    groupMatches: Array.isArray(row.group_matches)
      ? (row.group_matches as ChampionshipWorkspaceRecord["groupMatches"])
      : [],
    bracket:
      row.bracket && typeof row.bracket === "object"
        ? (row.bracket as ChampionshipWorkspaceRecord["bracket"])
        : {
            state: "not-generated",
            consistencyStatus: "idle",
            consistencyMessage: null,
            classificationSignature: null,
            generatedAt: null,
            rounds: [],
            matches: [],
          },
    scoring:
      row.scoring && typeof row.scoring === "object"
        ? (row.scoring as ChampionshipWorkspaceRecord["scoring"])
        : { winPoints: 3, drawPoints: 1, lossPoints: 0 },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecordToRow(record: ChampionshipWorkspaceRecord) {
  return {
    championship_id: record.championshipId,
    teams: record.teams,
    groups: record.groups,
    group_matches: record.groupMatches,
    bracket: record.bracket,
    scoring: record.scoring,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function readStoredWorkspaces() {
  if (typeof window === "undefined") {
    return [] as ChampionshipWorkspaceRecord[];
  }

  try {
    const rawValue = window.localStorage.getItem(CHAMPIONSHIP_WORKSPACES_STORAGE_KEY);

    if (!rawValue) {
      return [] as ChampionshipWorkspaceRecord[];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? (parsed as ChampionshipWorkspaceRecord[]) : [];
  } catch {
    return [] as ChampionshipWorkspaceRecord[];
  }
}

function writeStoredWorkspaces(workspaces: ChampionshipWorkspaceRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CHAMPIONSHIP_WORKSPACES_STORAGE_KEY, JSON.stringify(workspaces));
}

function persistWorkspaceLocally(record: ChampionshipWorkspaceRecord) {
  const existing = readStoredWorkspaces();
  const filtered = existing.filter((item) => item.championshipId !== record.championshipId);
  writeStoredWorkspaces([...filtered, record]);
}

function getLocalWorkspace(championshipId: string) {
  return readStoredWorkspaces().find((item) => item.championshipId === championshipId);
}

export function readStoredChampionshipWorkspaceRecord(championship: ChampionshipRecord) {
  if (!isChampionshipWorkspaceStoreTestMode && isSupabaseConfigured) {
    return null;
  }

  const localWorkspace = getLocalWorkspace(championship.id);

  if (!localWorkspace) {
    return null;
  }

  return normalizeChampionshipWorkspace(localWorkspace, championship);
}

function isWorkspaceTableUnavailable(error: unknown) {
  const postgrestError = error as Partial<PostgrestError> | null;
  const errorCode = postgrestError?.code?.toUpperCase();
  const errorMessage = postgrestError?.message?.toLowerCase() ?? "";

  return (
    errorCode === "42P01" ||
    errorCode === "PGRST205" ||
    errorMessage.includes("could not find the table") ||
    errorMessage.includes("schema cache") ||
    errorMessage.includes("relation \"public.championship_workspaces\" does not exist")
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

async function requestWorkspacePublicRest(path: string) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort();
  }, CHAMPIONSHIP_WORKSPACE_REST_READ_TIMEOUT_MS);

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
      `Supabase retornou HTTP ${response.status} ao ler o workspace do campeonato.`,
    );
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function readWorkspaceByIdFromPublicRest(championship: ChampionshipRecord) {
  const rows = await requestWorkspacePublicRest(
    `${CHAMPIONSHIP_WORKSPACES_TABLE}?select=*&championship_id=eq.${encodeURIComponent(championship.id)}&limit=1`,
  );
  const row = rows[0];

  return normalizeChampionshipWorkspace(
    row ? mapRowToRecord(row as ChampionshipWorkspaceRow) : undefined,
    championship,
  );
}

function isSupabaseNetworkError(error: unknown) {
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

export async function loadChampionshipWorkspaceRecord(championship: ChampionshipRecord) {
  const localWorkspace = getLocalWorkspace(championship.id);

  if (isChampionshipWorkspaceStoreTestMode || !supabase) {
    return normalizeChampionshipWorkspace(localWorkspace, championship);
  }

  try {
    const remoteWorkspace = await readWorkspaceByIdFromPublicRest(championship);
    persistWorkspaceLocally(remoteWorkspace);

    return remoteWorkspace;
  } catch (error) {
    if (isWorkspaceTableUnavailable(error)) {
      return normalizeChampionshipWorkspace(localWorkspace, championship);
    }

    console.error("[championship-workspace-store] public REST read failed", error);
  }

  let response;

  try {
    response = await withTimeout(
      supabase
        .from(CHAMPIONSHIP_WORKSPACES_TABLE)
        .select("*")
        .eq("championship_id", championship.id)
        .maybeSingle(),
      CHAMPIONSHIP_WORKSPACE_READ_TIMEOUT_MS,
      "Tempo limite ao carregar o workspace do campeonato.",
    );
  } catch (error) {
    if (isWorkspaceTableUnavailable(error)) {
      return normalizeChampionshipWorkspace(localWorkspace, championship);
    }

    throw error;
  }

  const { data, error } = response;

  if (error) {
    if (isWorkspaceTableUnavailable(error)) {
      return normalizeChampionshipWorkspace(localWorkspace, championship);
    }

    throw error;
  }

  if (!data) {
    return normalizeChampionshipWorkspace(undefined, championship);
  }

  const remoteWorkspace = normalizeChampionshipWorkspace(
    mapRowToRecord(data as ChampionshipWorkspaceRow),
    championship,
  );
  persistWorkspaceLocally(remoteWorkspace);

  return remoteWorkspace;
}

export async function saveChampionshipWorkspaceRecord(
  championship: ChampionshipRecord,
  workspace: ChampionshipWorkspaceRecord,
) {
  const normalizedWorkspace = normalizeChampionshipWorkspace(workspace, championship);
  const writeClient = adminSupabase ?? supabase;

  if (isChampionshipWorkspaceStoreTestMode || !writeClient) {
    persistWorkspaceLocally(normalizedWorkspace);
    return normalizedWorkspace;
  }

  const { data, error } = await withTimeout(
    writeClient
      .from(CHAMPIONSHIP_WORKSPACES_TABLE)
      .upsert(mapRecordToRow(normalizedWorkspace), { onConflict: "championship_id" })
      .select()
      .single(),
    CHAMPIONSHIP_WORKSPACE_WRITE_TIMEOUT_MS,
    "Tempo limite ao salvar o workspace do campeonato.",
  );

  if (error) {
    throw error;
  }

  const savedWorkspace = mapRowToRecord(data as ChampionshipWorkspaceRow);
  persistWorkspaceLocally(savedWorkspace);
  return normalizeChampionshipWorkspace(savedWorkspace, championship);
}

export function getChampionshipWorkspaceStorageMode() {
  return isSupabaseConfigured ? "supabase" : "local";
}

export function formatChampionshipWorkspaceStoreError(error: unknown) {
  const postgrestError = error as Partial<PostgrestError> | null;
  const errorCode = postgrestError?.code?.toUpperCase();
  const errorMessage = postgrestError?.message;

  if (isSupabaseNetworkError(error)) {
    return "Nao foi possivel sincronizar o workspace do campeonato com o Supabase agora. Tente novamente em instantes.";
  }

  if (errorCode === "42501") {
    return "O Supabase bloqueou a escrita do workspace do campeonato. Entre no painel com a conta admin autenticada no Supabase ou ajuste as policies da tabela.";
  }

  if (errorCode === "42P01") {
    return "A tabela public.championship_workspaces ainda nao existe no Supabase. Rode a migration antes de usar o banco.";
  }

  if (errorCode === "PGRST205" || isWorkspaceTableUnavailable(error)) {
    return "A tabela public.championship_workspaces ainda nao foi publicada no schema cache do Supabase. Rode a migration e atualize o schema.";
  }

  if (typeof errorMessage === "string" && errorMessage.trim()) {
    return errorMessage;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Nao foi possivel sincronizar os dados operacionais do campeonato.";
}
