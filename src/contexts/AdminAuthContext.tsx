import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getPermissionsForRole,
  hasAdminPermission,
  type AdminPermission,
  type AdminRole,
} from "@/admin/config/security";

interface AdminSession {
  username: string;
  displayName: string;
  role: AdminRole;
  permissions: AdminPermission[];
  loginAt: string;
}

interface LoginResult {
  success: boolean;
  message?: string;
}

interface AdminAuthContextValue {
  session: AdminSession | null;
  role: AdminRole | "usuario";
  isAdmin: boolean;
  displayName: string | null;
  permissions: AdminPermission[];
  login: (username: string, password: string) => Promise<LoginResult>;
  hasPermission: (permission: AdminPermission) => boolean;
  logout: () => void;
}

const ADMIN_SESSION_STORAGE_KEY = "gc_admin_session";
const ADMIN_USERNAME = (import.meta.env.VITE_ADMIN_USERNAME ?? "admin-geral").trim();
const ADMIN_PASSWORD_HASH =
  (import.meta.env.VITE_ADMIN_PASSWORD_HASH ??
    "53c69c94cc806f3a2d2e3ecf19860a4ffc797a424a8175beb155dfb2239b1159").trim();

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

function readStoredSession() {
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

    return {
      username: parsed.username,
      displayName: parsed.displayName,
      role: parsed.role,
      permissions: Array.isArray(parsed.permissions)
        ? (parsed.permissions as AdminPermission[])
        : getPermissionsForRole(parsed.role),
      loginAt: parsed.loginAt,
    } satisfies AdminSession;
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

  useEffect(() => {
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
        message: "Preencha usuário e senha de administrador.",
      };
    }

    if (normalizedUsername !== ADMIN_USERNAME) {
      return {
        success: false,
        message: "Acesso negado. Usuário de administrador inválido.",
      };
    }

    const passwordHash = await hashSecret(normalizedPassword);

    if (passwordHash !== ADMIN_PASSWORD_HASH) {
      return {
        success: false,
        message: "Acesso negado. Senha de administrador inválida.",
      };
    }

    const role: AdminRole = "super_admin";

    setSession({
      username: normalizedUsername,
      displayName: normalizedUsername,
      role,
      permissions: getPermissionsForRole(role),
      loginAt: new Date().toISOString(),
    });

    return { success: true };
  };

  const hasPermission = (permission: AdminPermission) => {
    if (!session) {
      return false;
    }

    return hasAdminPermission(session.permissions, permission);
  };

  const logout = () => {
    setSession(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        session,
        role: session?.role ?? "usuario",
        isAdmin: Boolean(session),
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
