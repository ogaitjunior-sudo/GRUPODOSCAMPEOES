import type { PostgrestError } from "@supabase/supabase-js";
import { normalizeChampionshipWorkspace } from "@/lib/championship-runtime";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { ChampionshipRecord } from "@/types/championship";
import type { ChampionshipWorkspaceRecord } from "@/types/championship-runtime";

const CHAMPIONSHIP_WORKSPACES_STORAGE_KEY = "gc_championship_workspaces_v2";
const CHAMPIONSHIP_WORKSPACES_TABLE = "championship_workspaces";

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

function shouldFallbackToLocal(error: unknown) {
  const postgrestError = error as Partial<PostgrestError> | null;
  const errorCode = postgrestError?.code?.toUpperCase();

  return isWorkspaceTableUnavailable(error) || errorCode === "42501";
}

function pickNewestRecord(
  left: ChampionshipWorkspaceRecord | undefined,
  right: ChampionshipWorkspaceRecord | undefined,
) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return new Date(left.updatedAt).getTime() >= new Date(right.updatedAt).getTime() ? left : right;
}

export async function loadChampionshipWorkspaceRecord(championship: ChampionshipRecord) {
  const localWorkspace = getLocalWorkspace(championship.id);

  if (!supabase) {
    return normalizeChampionshipWorkspace(localWorkspace, championship);
  }

  const { data, error } = await supabase
    .from(CHAMPIONSHIP_WORKSPACES_TABLE)
    .select("*")
    .eq("championship_id", championship.id)
    .maybeSingle();

  if (error) {
    if (shouldFallbackToLocal(error)) {
      return normalizeChampionshipWorkspace(localWorkspace, championship);
    }

    throw error;
  }

  const remoteWorkspace = data ? mapRowToRecord(data as ChampionshipWorkspaceRow) : undefined;
  const mergedWorkspace = pickNewestRecord(localWorkspace, remoteWorkspace);

  return normalizeChampionshipWorkspace(mergedWorkspace, championship);
}

export async function saveChampionshipWorkspaceRecord(
  championship: ChampionshipRecord,
  workspace: ChampionshipWorkspaceRecord,
) {
  const normalizedWorkspace = normalizeChampionshipWorkspace(workspace, championship);

  if (!supabase) {
    persistWorkspaceLocally(normalizedWorkspace);
    return normalizedWorkspace;
  }

  const { data, error } = await supabase
    .from(CHAMPIONSHIP_WORKSPACES_TABLE)
    .upsert(mapRecordToRow(normalizedWorkspace), { onConflict: "championship_id" })
    .select()
    .single();

  if (error) {
    if (shouldFallbackToLocal(error)) {
      persistWorkspaceLocally(normalizedWorkspace);
      return normalizedWorkspace;
    }

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

  if (errorCode === "42501") {
    return "O Supabase bloqueou a escrita do workspace do campeonato com RLS. O portal vai continuar usando a base local ate a permissao ser ajustada.";
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
