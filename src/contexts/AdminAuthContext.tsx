import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  getPermissionsForRole,
  hasAdminPermission,
  type AdminPermission,
  type AdminRole,
} from "@/admin/config/security";
import { adminSupabase, isSupabaseConfigured } from "@/lib/supabase";

export interface AdminSession {
  username: string;
  displayName: string;
  email: string | null;
  role: AdminRole;
  permissions: AdminPermission[];
  loginAt: string;
  provider: "supabase" | "fallback";
}

interface LoginResult {
  success: boolean;
  message?: string;
}

interface AdminAuthContextValue {
  session: AdminSession | null;
  isReady: boolean;
  role: AdminRole | "usuario";
  isAdmin: boolean;
  isPrimaryAdmin: boolean;
  displayName: string | null;
  permissions: AdminPermission[];
  login: (username: string, password: string) => Promise<LoginResult>;
  hasPermission: (permission: AdminPermission) => boolean;
  logout: () => void;
}

export const ADMIN_SESSION_STORAGE_KEY = "gc_admin_session";
export const ADMIN_LOGIN_ROUTE = "/login";
export const ADMIN_DASHBOARD_ROUTE = "/admin/dashboard";
export const ADMIN_USERNAME = (import.meta.env.VITE_ADMIN_USERNAME ?? "ADMIN").trim();
const DEFAULT_ADMIN_SUPABASE_EMAIL = "admin@grupodecampeoes.com";
const ADMIN_SUPABASE_EMAIL = (
  import.meta.env.VITE_ADMIN_SUPABASE_EMAIL ?? DEFAULT_ADMIN_SUPABASE_EMAIL
)
  .trim()
  .toLowerCase();
const ADMIN_PASSWORD_HASH =
  (import.meta.env.VITE_ADMIN_PASSWORD_HASH ??
    "3dbc36f1068ab85bbf98397f0c40a0d4dfcbfaf300fa680205555a6d2de4bb80").trim();
const INVALID_ADMIN_CREDENTIALS_MESSAGE = "Usu\u00e1rio ou senha inv\u00e1lidos";
const ADMIN_SUPABASE_MISSING_EMAIL_MESSAGE =
  "O painel admin ainda nao esta vinculado ao Supabase. Configure VITE_ADMIN_SUPABASE_EMAIL com o e-mail do admin.";
const ADMIN_SUPABASE_ACCESS_DENIED_MESSAGE =
  "A conta autenticada no Supabase nao tem permissao para abrir o painel administrativo.";

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getExpectedAdminSupabaseEmail() {
  if (ADMIN_SUPABASE_EMAIL) {
    return ADMIN_SUPABASE_EMAIL;
  }

  if (isEmail(ADMIN_USERNAME)) {
    return ADMIN_USERNAME.toLowerCase();
  }

  return "";
}

const EXPECTED_ADMIN_SUPABASE_EMAIL = getExpectedAdminSupabaseEmail();
const canUseSupabaseAdminAuth = Boolean(isSupabaseConfigured && adminSupabase && EXPECTED_ADMIN_SUPABASE_EMAIL);

function isPrimaryAdminSession(
  session: Pick<AdminSession, "username" | "role" | "provider" | "email"> | null | undefined,
) {
  if (!session) {
    return false;
  }

  if (session.role !== "super_admin") {
    return false;
  }

  if (session.provider === "supabase") {
    return (
      typeof session.email === "string" &&
      session.email.trim().toLowerCase() === EXPECTED_ADMIN_SUPABASE_EMAIL
    );
  }

  return session.username.trim() === ADMIN_USERNAME;
}

function buildAdminSession(session: Session | null) {
  const user = session?.user;

  if (!user?.email || !EXPECTED_ADMIN_SUPABASE_EMAIL) {
    return null;
  }

  const email = user.email.trim().toLowerCase();

  if (email !== EXPECTED_ADMIN_SUPABASE_EMAIL) {
    return null;
  }

  const displayName =
    typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()
      ? user.user_metadata.display_name.trim()
      : typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
        ? user.user_metadata.name.trim()
        : ADMIN_USERNAME || email.split("@")[0];

  const role: AdminRole = "super_admin";

  return {
    username: ADMIN_USERNAME || email,
    displayName,
    email,
    role,
    permissions: getPermissionsForRole(role),
    loginAt: user.last_sign_in_at ?? user.created_at ?? new Date().toISOString(),
    provider: "supabase",
  } satisfies AdminSession;
}

function readStoredSession() {
  if (canUseSupabaseAdminAuth) {
    return null;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<AdminSession>;

    if (!parsed.username || !parsed.loginAt || !parsed.displayName) {
      return null;
    }

    if (
      parsed.role !== "super_admin" &&
      parsed.role !== "operations_manager" &&
      parsed.role !== "moderator" &&
      parsed.role !== "support_manager"
    ) {
      return null;
    }

    const nextSession = {
      username: parsed.username,
      displayName: parsed.displayName,
      email: typeof parsed.email === "string" && parsed.email.trim() ? parsed.email.trim() : null,
      role: parsed.role,
      permissions: Array.isArray(parsed.permissions)
        ? (parsed.permissions as AdminPermission[])
        : getPermissionsForRole(parsed.role),
      loginAt: parsed.loginAt,
      provider: "fallback",
    } satisfies AdminSession;

    return isPrimaryAdminSession(nextSession) ? nextSession : null;
  } catch {
    return null;
  }
}

async function hashSecret(value: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(() => readStoredSession());
  const [isReady, setIsReady] = useState(!canUseSupabaseAdminAuth);
  const isPrimaryAdmin = isPrimaryAdminSession(session);

  useEffect(() => {
    if (!canUseSupabaseAdminAuth || typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (!canUseSupabaseAdminAuth || !adminSupabase) {
      return;
    }

    let active = true;

    const syncSession = async () => {
      const { data } = await adminSupabase.auth.getSession();

      if (!active) {
        return;
      }

      setSession(buildAdminSession(data.session));
      setIsReady(true);
    };

    void syncSession();

    const {
      data: { subscription },
    } = adminSupabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(buildAdminSession(nextSession));
      setIsReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (canUseSupabaseAdminAuth) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    if (!session) {
      window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  const login = async (username: string, password: string): Promise<LoginResult> => {
    const normalizedUsername = username.trim();
    const normalizedPassword = password.trim();

    if (!normalizedUsername || !normalizedPassword) {
      return {
        success: false,
        message: INVALID_ADMIN_CREDENTIALS_MESSAGE,
      };
    }

    if (canUseSupabaseAdminAuth && adminSupabase) {
      const normalizedIdentifier = normalizedUsername.toLowerCase();

      if (
        normalizedIdentifier !== EXPECTED_ADMIN_SUPABASE_EMAIL &&
        normalizedUsername !== ADMIN_USERNAME
      ) {
        return {
          success: false,
          message: INVALID_ADMIN_CREDENTIALS_MESSAGE,
        };
      }

      const { data, error } = await adminSupabase.auth.signInWithPassword({
        email: EXPECTED_ADMIN_SUPABASE_EMAIL,
        password: normalizedPassword,
      });

      if (error) {
        return {
          success: false,
          message: error.message || INVALID_ADMIN_CREDENTIALS_MESSAGE,
        };
      }

      const nextSession = buildAdminSession(data.session);

      if (!nextSession) {
        await adminSupabase.auth.signOut({ scope: "local" }).catch(() => undefined);

        return {
          success: false,
          message: ADMIN_SUPABASE_ACCESS_DENIED_MESSAGE,
        };
      }

      setSession(nextSession);
      return { success: true };
    }

    if (isSupabaseConfigured && !canUseSupabaseAdminAuth) {
      return {
        success: false,
        message: ADMIN_SUPABASE_MISSING_EMAIL_MESSAGE,
      };
    }

    if (normalizedUsername !== ADMIN_USERNAME) {
      return {
        success: false,
        message: INVALID_ADMIN_CREDENTIALS_MESSAGE,
      };
    }

    const passwordHash = await hashSecret(normalizedPassword);

    if (passwordHash !== ADMIN_PASSWORD_HASH) {
      return {
        success: false,
        message: INVALID_ADMIN_CREDENTIALS_MESSAGE,
      };
    }

    const role: AdminRole = "super_admin";

    setSession({
      username: normalizedUsername,
      displayName: normalizedUsername,
      email: null,
      role,
      permissions: getPermissionsForRole(role),
      loginAt: new Date().toISOString(),
      provider: "fallback",
    });

    return { success: true };
  };

  const hasPermission = (permission: AdminPermission) => {
    if (!session || !isPrimaryAdmin) {
      return false;
    }

    return hasAdminPermission(session.permissions, permission);
  };

  const logout = () => {
    const currentSession = session;
    setSession(null);

    if (currentSession?.provider === "supabase" && adminSupabase) {
      void adminSupabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        session,
        isReady,
        role: session?.role ?? "usuario",
        isAdmin: isPrimaryAdmin,
        isPrimaryAdmin,
        displayName: session?.displayName ?? null,
        permissions: session?.permissions ?? [],
        login,
        hasPermission,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error("useAdminAuth deve ser usado dentro de AdminAuthProvider.");
  }

  return context;
}
