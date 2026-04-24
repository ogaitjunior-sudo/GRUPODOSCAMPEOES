import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  supabase,
  supabaseAuthSetupMessage,
} from "@/lib/supabase";
import {
  authenticatePlayerFallback,
  createPlayerFallbackSession,
  getPlayerFallbackCredentials,
  isPlayerFallbackSession,
  type PlayerFallbackSession,
} from "@/lib/player-fallback-auth";
import {
  resolvePlayerLoginEmail,
  syncPlayerAccessDirectoryEntry,
} from "@/lib/player-login-directory";

interface PlayerSession {
  id: string;
  email: string;
  displayName: string;
  loginAt: string;
  provider: "supabase" | "fallback";
}

interface AuthResult {
  success: boolean;
  message?: string;
  playerName?: string;
  requiresEmailConfirmation?: boolean;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

interface PlayerAuthContextValue {
  session: PlayerSession | null;
  isAuthenticated: boolean;
  isAuthConfigured: boolean;
  authConfigurationMessage: string;
  loginName: string | null;
  playerEmail: string | null;
  login: (identifier: string, password: string) => Promise<AuthResult>;
  register: (payload: RegisterPayload) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  logout: () => void;
}

const PlayerAuthContext = createContext<PlayerAuthContextValue | undefined>(undefined);
const PLAYER_FALLBACK_SESSION_STORAGE_KEY = "gc_player_fallback_session";

function buildPlayerSession(session: Session | null) {
  const user = session?.user;

  if (!user?.email) {
    return null;
  }

  const metadataName =
    typeof user.user_metadata?.player_name === "string"
      ? user.user_metadata.player_name
      : typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : user.email.split("@")[0];

  const displayName = metadataName.trim() || user.email.split("@")[0];

  return {
    id: user.id,
    email: user.email,
    displayName,
    loginAt: user.last_sign_in_at ?? user.created_at ?? new Date().toISOString(),
    provider: "supabase",
  } satisfies PlayerSession;
}

function readStoredFallbackSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const credentials = getPlayerFallbackCredentials();

  if (!credentials) {
    window.localStorage.removeItem(PLAYER_FALLBACK_SESSION_STORAGE_KEY);
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(PLAYER_FALLBACK_SESSION_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);

    if (!isPlayerFallbackSession(parsed)) {
      window.localStorage.removeItem(PLAYER_FALLBACK_SESSION_STORAGE_KEY);
      return null;
    }

    const expectedSession = createPlayerFallbackSession(
      credentials.login,
      parsed.loginAt,
    ) satisfies PlayerFallbackSession;

    if (
      parsed.id !== expectedSession.id ||
      parsed.email !== expectedSession.email ||
      parsed.displayName !== expectedSession.displayName
    ) {
      window.localStorage.removeItem(PLAYER_FALLBACK_SESSION_STORAGE_KEY);
      return null;
    }

    return expectedSession satisfies PlayerSession;
  } catch {
    window.localStorage.removeItem(PLAYER_FALLBACK_SESSION_STORAGE_KEY);
    return null;
  }
}

export function PlayerAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PlayerSession | null>(() => readStoredFallbackSession());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!session || session.provider !== "fallback") {
      window.localStorage.removeItem(PLAYER_FALLBACK_SESSION_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(PLAYER_FALLBACK_SESSION_STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    if (session?.provider === "fallback" || !isSupabaseConfigured || !supabase) {
      return;
    }

    let active = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (active) {
        setSession((current) => {
          const nextSession = buildPlayerSession(data.session);
          return nextSession ?? (current?.provider === "fallback" ? current : null);
        });
      }
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession((current) => {
        const nextPlayerSession = buildPlayerSession(nextSession);
        return nextPlayerSession ?? (current?.provider === "fallback" ? current : null);
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [session?.provider]);

  const register = async ({ name, email, password }: RegisterPayload): Promise<AuthResult> => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedName || !normalizedEmail || !normalizedPassword) {
      return {
        success: false,
        message: "Preencha nome, e-mail e senha para criar a conta.",
      };
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        message: supabaseAuthSetupMessage,
      };
    }

    const emailRedirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/entrar` : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: normalizedPassword,
      options: {
        data: {
          player_name: normalizedName,
          display_name: normalizedName,
        },
        emailRedirectTo,
      },
    });

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    const requiresEmailConfirmation = !data.session;

    try {
      await syncPlayerAccessDirectoryEntry({
        name: normalizedName,
        email: normalizedEmail,
        createdAt: data.user?.created_at ?? new Date().toISOString(),
      });
    } catch {
      // O cadastro principal ja foi concluido no Supabase Auth.
    }

    return {
      success: true,
      playerName: normalizedName,
      requiresEmailConfirmation,
      message: requiresEmailConfirmation
        ? "Conta criada. Confirme seu e-mail para liberar o primeiro acesso."
        : "Conta criada com sucesso.",
    };
  };

  const login = async (identifier: string, password: string): Promise<AuthResult> => {
    const normalizedIdentifier = identifier.trim();
    const normalizedPassword = password.trim();

    if (!normalizedIdentifier || !normalizedPassword) {
      return {
        success: false,
        message: "Preencha e-mail ou nome do jogador e senha para entrar.",
      };
    }

    const fallbackAuth = await authenticatePlayerFallback(normalizedIdentifier, normalizedPassword);

    if (fallbackAuth) {
      if (!fallbackAuth.success) {
        return {
          success: false,
          message: fallbackAuth.message,
        };
      }

      setSession(fallbackAuth.session);

      void syncPlayerAccessDirectoryEntry({
        name: fallbackAuth.session.displayName,
        email: fallbackAuth.session.email,
        lastLoginAt: fallbackAuth.session.loginAt,
        createdAt: fallbackAuth.session.loginAt,
      });

      return {
        success: true,
        playerName: fallbackAuth.playerName,
      };
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        message: supabaseAuthSetupMessage,
      };
    }

    let resolvedEmail = "";

    try {
      const resolution = await resolvePlayerLoginEmail(normalizedIdentifier);

      if (!resolution.email) {
        return {
          success: false,
          message:
            resolution.error ??
            "Não foi possível localizar esse jogador agora. Tente entrar com o e-mail.",
        };
      }

      resolvedEmail = resolution.email;
    } catch {
      return {
        success: false,
        message: "Não foi possível validar o nome do jogador agora. Tente entrar com o e-mail.",
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password: normalizedPassword,
    });

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    const nextSession = buildPlayerSession(data.session);

    if (!nextSession) {
      return {
        success: false,
        message: "Não foi possível recuperar a sessão do jogador após o login.",
      };
    }

    setSession(nextSession);

    void syncPlayerAccessDirectoryEntry({
      name: nextSession.displayName,
      email: nextSession.email,
      lastLoginAt: nextSession.loginAt,
      createdAt: nextSession.loginAt,
    });

    return {
      success: true,
      playerName: nextSession.displayName,
    };
  };

  const requestPasswordReset = async (email: string): Promise<AuthResult> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return {
        success: false,
        message: "Informe o e-mail usado na conta para recuperar a senha.",
      };
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        message: supabaseAuthSetupMessage,
      };
    }

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/recuperar-senha` : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: true,
      message: "Enviamos o link de recuperação para o seu e-mail.",
    };
  };

  const updatePassword = async (password: string): Promise<AuthResult> => {
    const normalizedPassword = password.trim();

    if (!normalizedPassword) {
      return {
        success: false,
        message: "Informe a nova senha para concluir a recuperação.",
      };
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        message: supabaseAuthSetupMessage,
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: normalizedPassword,
    });

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: true,
      message: "Senha atualizada com sucesso.",
    };
  };

  const logout = () => {
    setSession(null);

    if (session?.provider === "fallback" || !supabase) {
      return;
    }

    void supabase.auth.signOut();
  };

  return (
    <PlayerAuthContext.Provider
      value={{
        session,
        isAuthenticated: Boolean(session),
        isAuthConfigured: isSupabaseConfigured,
        authConfigurationMessage: supabaseAuthSetupMessage,
        loginName: session?.displayName ?? null,
        playerEmail: session?.email ?? null,
        login,
        register,
        requestPasswordReset,
        updatePassword,
        logout,
      }}
    >
      {children}
    </PlayerAuthContext.Provider>
  );
}

export function usePlayerAuth() {
  const context = useContext(PlayerAuthContext);

  if (!context) {
    throw new Error("usePlayerAuth deve ser usado dentro de PlayerAuthProvider.");
  }

  return context;
}
