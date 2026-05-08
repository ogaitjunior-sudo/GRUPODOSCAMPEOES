import type { PostgrestError } from "@supabase/supabase-js";
import { createDefaultSiteSettings, createInitialAdminPanelState } from "@/admin/context/adminSeed";
import { adminSupabase, isSupabaseConfigured, supabase } from "@/lib/supabase";
import type {
  AdminPanelState,
  AuditLog,
  ChampionshipRecord,
  ErrorLog,
  ImageRequestRecord,
  LanguageRecord,
  ManagedUser,
  PlayerRecord,
  SiteSettings,
  SupportTicket,
  TeamRecord,
} from "@/admin/types";

const ADMIN_PANEL_CACHE_KEY = "gc_admin_panel_state_cache_v1";
const ADMIN_PANEL_TABLE = "admin_panel_state";
const ADMIN_PANEL_ROW_ID = "primary";

type AdminPanelRow = {
  id: string;
  users: unknown;
  players: unknown;
  teams: unknown;
  championships: unknown;
  image_requests: unknown;
  languages: unknown;
  tickets: unknown;
  audit_logs: unknown;
  error_logs: unknown;
  settings: unknown;
  created_at: string;
  updated_at: string;
};

export type AdminPanelStorageMode = "local" | "supabase";

function normalizeArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeSettings(value: unknown): SiteSettings {
  const defaults = createDefaultSiteSettings();

  if (!value || typeof value !== "object") {
    return defaults;
  }

  const source = value as Partial<SiteSettings> & {
    socialLinks?: Partial<SiteSettings["socialLinks"]>;
  };

  return {
    ...defaults,
    ...source,
    socialLinks: {
      ...defaults.socialLinks,
      ...(source.socialLinks ?? {}),
    },
    banners: Array.isArray(source.banners) ? source.banners : defaults.banners,
    staticPages: Array.isArray(source.staticPages) ? source.staticPages : defaults.staticPages,
  };
}

function normalizeAdminPanelState(value: unknown): AdminPanelState {
  const defaults = createInitialAdminPanelState();

  if (!value || typeof value !== "object") {
    return defaults;
  }

  const source = value as Partial<AdminPanelState>;

  return {
    users: normalizeArray<ManagedUser>(source.users),
    players: normalizeArray<PlayerRecord>(source.players),
    teams: normalizeArray<TeamRecord>(source.teams),
    championships: normalizeArray<ChampionshipRecord>(source.championships),
    imageRequests: normalizeArray<ImageRequestRecord>(source.imageRequests),
    languages: normalizeArray<LanguageRecord>(source.languages),
    tickets: normalizeArray<SupportTicket>(source.tickets),
    auditLogs: normalizeArray<AuditLog>(source.auditLogs),
    errorLogs: normalizeArray<ErrorLog>(source.errorLogs),
    settings: normalizeSettings(source.settings),
  };
}

function mapRowToState(row: AdminPanelRow): AdminPanelState {
  return normalizeAdminPanelState({
    users: row.users,
    players: row.players,
    teams: row.teams,
    championships: row.championships,
    imageRequests: row.image_requests,
    languages: row.languages,
    tickets: row.tickets,
    auditLogs: row.audit_logs,
    errorLogs: row.error_logs,
    settings: row.settings,
  });
}

function mapStateToRow(state: AdminPanelState) {
  const normalizedState = normalizeAdminPanelState(state);

  return {
    id: ADMIN_PANEL_ROW_ID,
    users: normalizedState.users,
    players: normalizedState.players,
    teams: normalizedState.teams,
    championships: normalizedState.championships,
    image_requests: normalizedState.imageRequests,
    languages: normalizedState.languages,
    tickets: normalizedState.tickets,
    audit_logs: normalizedState.auditLogs,
    error_logs: normalizedState.errorLogs,
    settings: normalizedState.settings,
  };
}

function isAdminPanelTableUnavailable(error: unknown) {
  const postgrestError = error as Partial<PostgrestError> | null;
  const errorCode = postgrestError?.code?.toUpperCase();
  const errorMessage = postgrestError?.message?.toLowerCase() ?? "";

  return (
    errorCode === "42P01" ||
    errorCode === "PGRST205" ||
    errorMessage.includes("could not find the table") ||
    errorMessage.includes("schema cache") ||
    errorMessage.includes("relation \"public.admin_panel_state\" does not exist")
  );
}

function shouldFallbackToLocal(error: unknown) {
  const postgrestError = error as Partial<PostgrestError> | null;
  const errorCode = postgrestError?.code?.toUpperCase();

  return isAdminPanelTableUnavailable(error) || errorCode === "42501";
}

function readStoredAdminPanelState() {
  if (typeof window === "undefined") {
    return createInitialAdminPanelState();
  }

  try {
    const rawValue = window.localStorage.getItem(ADMIN_PANEL_CACHE_KEY);

    if (!rawValue) {
      return createInitialAdminPanelState();
    }

    return normalizeAdminPanelState(JSON.parse(rawValue));
  } catch {
    return createInitialAdminPanelState();
  }
}

export function readCachedAdminPanelState() {
  return readStoredAdminPanelState();
}

function writeStoredAdminPanelState(state: AdminPanelState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ADMIN_PANEL_CACHE_KEY,
    JSON.stringify(normalizeAdminPanelState(state)),
  );
}

export function getAdminPanelStorageMode(): AdminPanelStorageMode {
  return isSupabaseConfigured ? "supabase" : "local";
}

export async function loadAdminPanelState() {
  if (!supabase) {
    return readCachedAdminPanelState();
  }

  const { data, error } = await supabase
    .from(ADMIN_PANEL_TABLE)
    .select("*")
    .eq("id", ADMIN_PANEL_ROW_ID)
    .maybeSingle();

  if (error) {
    if (shouldFallbackToLocal(error)) {
      return readCachedAdminPanelState();
    }

    throw error;
  }

  const nextState = data
    ? mapRowToState(data as AdminPanelRow)
    : readCachedAdminPanelState();

  writeStoredAdminPanelState(nextState);
  return nextState;
}

export async function saveAdminPanelState(state: AdminPanelState) {
  const normalizedState = normalizeAdminPanelState(state);
  const writeClient = adminSupabase ?? supabase;

  if (!writeClient) {
    writeStoredAdminPanelState(normalizedState);
    return normalizedState;
  }

  const { data, error } = await writeClient
    .from(ADMIN_PANEL_TABLE)
    .upsert(mapStateToRow(normalizedState), { onConflict: "id" })
    .select()
    .single();

  if (error) {
    throw error;
  }

  const savedState = mapRowToState(data as AdminPanelRow);
  writeStoredAdminPanelState(savedState);
  return savedState;
}

export function formatAdminPanelStoreError(error: unknown) {
  const postgrestError = error as Partial<PostgrestError> | null;
  const errorCode = postgrestError?.code?.toUpperCase();
  const errorMessage = postgrestError?.message;

  if (errorCode === "42501") {
    return "O Supabase bloqueou a escrita do painel administrativo. Entre com a conta admin autenticada no Supabase ou ajuste as policies da tabela.";
  }

  if (errorCode === "42P01") {
    return "A tabela public.admin_panel_state ainda nao existe no Supabase. Rode a migration antes de usar o painel com banco real.";
  }

  if (errorCode === "PGRST205" || isAdminPanelTableUnavailable(error)) {
    return "A tabela public.admin_panel_state ainda nao foi publicada no schema cache do Supabase. Rode a migration e atualize o schema.";
  }

  if (typeof errorMessage === "string" && errorMessage.trim()) {
    return errorMessage;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Nao foi possivel sincronizar o painel administrativo com o banco.";
}
