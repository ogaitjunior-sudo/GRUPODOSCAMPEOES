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
const ADMIN_PANEL_READ_TIMEOUT_MS = 6000;
const ADMIN_PANEL_WRITE_TIMEOUT_MS = 10000;
const ADMIN_PANEL_READ_TIMEOUT_MESSAGE =
  "A leitura do painel administrativo demorou mais que o esperado. Tente novamente em instantes.";
const ADMIN_PANEL_WRITE_TIMEOUT_MESSAGE =
  "A sincronizacao do painel administrativo demorou mais que o esperado. Tente novamente em instantes.";

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
  const errorCode = getErrorCode(error);
  const errorMessage = getErrorMessage(error).toLowerCase();

  return (
    errorCode === "42P01" ||
    errorCode === "PGRST205" ||
    errorMessage.includes("could not find the table") ||
    errorMessage.includes("schema cache") ||
    errorMessage.includes("relation \"public.admin_panel_state\" does not exist")
  );
}

function shouldFallbackToLocal(error: unknown) {
  const errorCode = getErrorCode(error);

  return isAdminPanelTableUnavailable(error) || errorCode === "42501";
}

function getErrorCode(error: unknown) {
  const code = (error as Partial<PostgrestError> | null)?.code;

  return typeof code === "string" ? code.toUpperCase() : "";
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

function isAdminPanelNetworkError(error: unknown) {
  const errorMessage = getErrorMessage(error).toLowerCase();
  const errorName =
    error instanceof Error && typeof error.name === "string" ? error.name.toLowerCase() : "";

  return (
    errorName.includes("typeerror") ||
    errorName.includes("aborterror") ||
    errorMessage.includes("failed to fetch") ||
    errorMessage.includes("fetch failed") ||
    errorMessage.includes("network error") ||
    errorMessage.includes("networkerror") ||
    errorMessage.includes("network request failed") ||
    errorMessage.includes("load failed") ||
    errorMessage.includes("abort")
  );
}

async function runAdminPanelWriteWithTimeout<T>(
  execute: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
) {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await execute(controller.signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(timeoutMessage);
    }

    const errorMessage = getErrorMessage(error).toLowerCase();

    if (errorMessage.includes("abort")) {
      throw new Error(timeoutMessage);
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

async function runAdminPanelReadWithTimeout<T>(execute: (signal: AbortSignal) => Promise<T>) {
  return runAdminPanelWriteWithTimeout(
    execute,
    ADMIN_PANEL_READ_TIMEOUT_MS,
    ADMIN_PANEL_READ_TIMEOUT_MESSAGE,
  );
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

export async function loadAdminPanelLoginDirectory() {
  if (!supabase) {
    const cachedState = readCachedAdminPanelState();
    return {
      users: cachedState.users,
      players: cachedState.players,
    };
  }

  const { data, error } = await runAdminPanelReadWithTimeout((signal) =>
    supabase
      .from(ADMIN_PANEL_TABLE)
      .select("users, players")
      .eq("id", ADMIN_PANEL_ROW_ID)
      .maybeSingle()
      .abortSignal(signal),
  );

  if (error) {
    if (shouldFallbackToLocal(error)) {
      const cachedState = readCachedAdminPanelState();
      return {
        users: cachedState.users,
        players: cachedState.players,
      };
    }

    throw error;
  }

  const nextState = data
    ? normalizeAdminPanelState({
        users: (data as Partial<AdminPanelRow>).users,
        players: (data as Partial<AdminPanelRow>).players,
      })
    : readCachedAdminPanelState();

  return {
    users: nextState.users,
    players: nextState.players,
  };
}

export async function loadAdminPanelState() {
  if (!supabase) {
    return readCachedAdminPanelState();
  }

  const { data, error } = await runAdminPanelReadWithTimeout((signal) =>
    supabase
      .from(ADMIN_PANEL_TABLE)
      .select("*")
      .eq("id", ADMIN_PANEL_ROW_ID)
      .maybeSingle()
      .abortSignal(signal),
  );

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

  const { error } = await runAdminPanelWriteWithTimeout(
    (signal) =>
      writeClient
        .from(ADMIN_PANEL_TABLE)
        .upsert(mapStateToRow(normalizedState), { onConflict: "id" })
        .abortSignal(signal),
    ADMIN_PANEL_WRITE_TIMEOUT_MS,
    ADMIN_PANEL_WRITE_TIMEOUT_MESSAGE,
  );

  if (error) {
    if (shouldFallbackToLocal(error)) {
      writeStoredAdminPanelState(normalizedState);
      return normalizedState;
    }

    throw error;
  }

  writeStoredAdminPanelState(normalizedState);
  return normalizedState;
}

export function formatAdminPanelStoreError(error: unknown) {
  const errorCode = getErrorCode(error);
  const errorMessage = getErrorMessage(error);

  if (errorCode === "42501") {
    return "O Supabase bloqueou a escrita do painel administrativo. Entre com a conta admin autenticada no Supabase ou ajuste as policies da tabela.";
  }

  if (errorCode === "42P01") {
    return "A tabela public.admin_panel_state ainda nao existe no Supabase. Rode a migration antes de usar o painel com banco real.";
  }

  if (errorCode === "PGRST205" || isAdminPanelTableUnavailable(error)) {
    return "A tabela public.admin_panel_state ainda nao foi publicada no schema cache do Supabase. Rode a migration e atualize o schema.";
  }

  if (isAdminPanelNetworkError(error)) {
    return ADMIN_PANEL_WRITE_TIMEOUT_MESSAGE;
  }

  if (typeof errorMessage === "string" && errorMessage.trim()) {
    return errorMessage;
  }

  return "Nao foi possivel sincronizar o painel administrativo com o banco.";
}
