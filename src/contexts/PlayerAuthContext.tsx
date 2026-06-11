import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  getPasswordRecoveryRedirectUrl,
  isSupabaseConfigured,
  isUsingLocalPasswordRecoveryRedirect,
  supabase,
  supabaseAuthSetupMessage,
} from "@/lib/supabase";
import {
  authenticatePlayerFallback,
  createPlayerFallbackSession,
  getPlayerFallbackCredentials,
  isPlayerFallbackIdentifier,
  isPlayerFallbackSession,
  type PlayerFallbackSession,
} from "@/lib/player-fallback-auth";
import {
  resolvePlayerLoginEmail,
  syncPlayerAccessDirectoryEntry,
} from "@/lib/player-login-directory";
import {
  readStoredPlayerAvatar,
  readStoredPlayerTeamPhoto,
  writeStoredPlayerAvatar,
  writeStoredPlayerTeamPhoto,
} from "@/lib/player-profile-store";

interface PlayerSession {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  teamPhotoUrl: string | null;
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
  avatarUrl: string | null;
  teamPhotoUrl: string | null;
  isUpdatingProfile: boolean;
  isPasswordRecoverySession: boolean;
  login: (identifier: string, password: string) => Promise<AuthResult>;
  register: (payload: RegisterPayload) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  updateProfileAvatar: (avatarUrl: string | null) => Promise<AuthResult>;
  updateTeamPhoto: (teamPhotoUrl: string | null) => Promise<AuthResult>;
  logout: () => void;
}

const PlayerAuthContext = createContext<PlayerAuthContextValue | undefined>(undefined);
const PLAYER_FALLBACK_SESSION_STORAGE_KEY = "gc_player_fallback_session";
const PLAYER_LOGIN_DIRECTORY_TIMEOUT_MS = 8_000;
const PLAYER_LOGIN_SUPABASE_TIMEOUT_MS = 12_000;

function withPlayerAuthTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
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

function normalizeAvatarUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : null;
}

function isInlineProfileMedia(value: string | null) {
  return Boolean(value?.startsWith("data:"));
}

function normalizeMetadataProfileMedia(value: unknown) {
  const normalizedValue = normalizeAvatarUrl(value);

  return isInlineProfileMedia(normalizedValue) ? null : normalizedValue;
}

function getAuthErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "";
}

function hasPasswordRecoveryUrlParams() {
  if (typeof window === "undefined") {
    return false;
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  const hasRecoveryType = hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery";

  return (
    hasRecoveryType ||
    (window.location.pathname === "/recuperar-senha" &&
      (hashParams.has("access_token") || searchParams.has("code")))
  );
}

function resolveUserAvatar(
  email: string,
  metadata: Record<string, unknown> | undefined,
) {
  return (
    normalizeMetadataProfileMedia(metadata?.avatar_url) ??
    normalizeMetadataProfileMedia(metadata?.avatarUrl) ??
    normalizeAvatarUrl(metadata?.picture) ??
    readStoredPlayerAvatar(email)
  );
}

function resolveUserTeamPhoto(
  email: string,
  metadata: Record<string, unknown> | undefined,
) {
  return (
    normalizeMetadataProfileMedia(metadata?.team_photo_url) ??
    normalizeMetadataProfileMedia(metadata?.teamPhotoUrl) ??
    readStoredPlayerTeamPhoto(email)
  );
}

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
    avatarUrl: resolveUserAvatar(user.email, user.user_metadata),
    teamPhotoUrl: resolveUserTeamPhoto(user.email, user.user_metadata),
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

    return {
      ...expectedSession,
      avatarUrl: readStoredPlayerAvatar(expectedSession.email),
      teamPhotoUrl: readStoredPlayerTeamPhoto(expectedSession.email),
    } satisfies PlayerSession;
  } catch {
    window.localStorage.removeItem(PLAYER_FALLBACK_SESSION_STORAGE_KEY);
    return null;
  }
}

export function PlayerAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PlayerSession | null>(() => readStoredFallbackSession());
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isPasswordRecoverySession, setIsPasswordRecoverySession] = useState(() =>
    hasPasswordRecoveryUrlParams(),
  );
  const sessionRef = useRef<PlayerSession | null>(session);
  const profileMediaSyncQueueRef = useRef(Promise.resolve());
  const isSigningOutRef = useRef(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

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
    if (session?.provider === "fallback" || !isSupabaseConfigured || !supabase || isSigningOutRef.current) {
      return;
    }

    let active = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (active) {
        setSession((current) => {
          if (isSigningOutRef.current) {
            return null;
          }

          const nextSession = buildPlayerSession(data.session);
          return nextSession ?? (current?.provider === "fallback" ? current : null);
        });
      }
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecoverySession(true);
      }

      if (!nextSession) {
        isSigningOutRef.current = false;
      }

      setSession((current) => {
        if (isSigningOutRef.current && nextSession) {
          return null;
        }

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
        authUserId: data.user?.id ?? null,
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
    const normalizedEmailIdentifier = normalizedIdentifier.toLowerCase();
    const isExplicitEmailIdentifier = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier);

    if (!normalizedIdentifier || !normalizedPassword) {
      return {
        success: false,
        message: "Preencha e-mail ou nome do jogador e senha para entrar.",
      };
    }

    if (isPlayerFallbackIdentifier(normalizedIdentifier)) {
      const fallbackAuth = await authenticatePlayerFallback(normalizedIdentifier, normalizedPassword);

      if (fallbackAuth) {
        if (!fallbackAuth.success) {
          return {
            success: false,
            message: fallbackAuth.message,
          };
        }

        const fallbackSession = {
          ...fallbackAuth.session,
          avatarUrl: readStoredPlayerAvatar(fallbackAuth.session.email),
          teamPhotoUrl: readStoredPlayerTeamPhoto(fallbackAuth.session.email),
        } satisfies PlayerSession;

        setSession(fallbackSession);

        void syncPlayerAccessDirectoryEntry({
          authUserId: fallbackSession.id,
          name: fallbackSession.displayName,
          email: fallbackSession.email,
          lastLoginAt: fallbackSession.loginAt,
          createdAt: fallbackSession.loginAt,
        });

          return {
          success: true,
          playerName: fallbackAuth.playerName,
          };
      }
    }

    if (!isSupabaseConfigured || !supabase) {
        return {
        success: false,
        message: supabaseAuthSetupMessage,
        };
      }

    let resolvedEmail = normalizedEmailIdentifier;

    if (!isExplicitEmailIdentifier) {
      try {
        const resolution = await withPlayerAuthTimeout(
          resolvePlayerLoginEmail(normalizedIdentifier),
          PLAYER_LOGIN_DIRECTORY_TIMEOUT_MS,
          "Tempo limite ao validar o jogador. Tente entrar com o e-mail cadastrado.",
        );

        if (!resolution.email) {
          return {
            success: false,
            message:
              resolution.error ??
              "Nao foi possivel localizar esse jogador agora. Tente entrar com o e-mail.",
          };
        }

        resolvedEmail = resolution.email;
      } catch (error) {
        return {
          success: false,
          message:
            getAuthErrorMessage(error) ||
            "Nao foi possivel validar o nome do jogador agora. Tente entrar com o e-mail.",
        };
      }
    }

    let authResponse;

    try {
      authResponse = await withPlayerAuthTimeout(
        supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password: normalizedPassword,
        }),
        PLAYER_LOGIN_SUPABASE_TIMEOUT_MS,
        "Tempo limite ao entrar no Supabase. Verifique sua conexao e tente novamente.",
      );
    } catch (error) {
      return {
        success: false,
        message:
          getAuthErrorMessage(error) ||
          "Nao foi possivel entrar agora. Verifique sua conexao e tente novamente.",
      };
    }

    const { data, error } = authResponse;

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
      authUserId: nextSession.id,
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

    const redirectTo = getPasswordRecoveryRedirectUrl();

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    if (isUsingLocalPasswordRecoveryRedirect()) {
      return {
        success: true,
        message:
          "Enviamos o link de recuperacao para o seu e-mail. Como o portal esta em localhost, abra o link no mesmo dispositivo ou configure VITE_PUBLIC_SITE_URL com a URL publica.",
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

    setIsPasswordRecoverySession(false);

    return {
      success: true,
      message: "Senha atualizada com sucesso.",
    };
  };

  const persistProfileMediaLocally = ({
    avatarUrl,
    teamPhotoUrl,
  }: {
    avatarUrl?: string | null;
    teamPhotoUrl?: string | null;
  }) => {
    if (!session) {
      return;
    }

    if (avatarUrl !== undefined) {
      writeStoredPlayerAvatar(session.email, avatarUrl);
    }

    if (teamPhotoUrl !== undefined) {
      writeStoredPlayerTeamPhoto(session.email, teamPhotoUrl);
    }

    setSession((current) =>
      current
        ? {
            ...current,
            avatarUrl: avatarUrl !== undefined ? avatarUrl : current.avatarUrl,
            teamPhotoUrl: teamPhotoUrl !== undefined ? teamPhotoUrl : current.teamPhotoUrl,
          }
        : current,
    );
  };

  const buildProfileMediaSuccessMessage = ({
    kind,
    value,
    usedLocalFallback = false,
    backgroundSync = false,
  }: {
    kind: "avatar" | "team-photo";
    value: string | null;
    usedLocalFallback?: boolean;
    backgroundSync?: boolean;
  }) => {
    const successMessage =
      kind === "avatar"
        ? value
          ? "Foto do perfil atualizada com sucesso."
          : "Foto do perfil removida com sucesso."
        : value
          ? "Foto da equipe atualizada com sucesso."
          : "Foto da equipe removida com sucesso.";

    return usedLocalFallback
      ? `${successMessage} O portal salvou a alteracao localmente e sincroniza de novo quando a conexao voltar.`
      : backgroundSync
        ? `${successMessage} A sincronizacao da conta continua em segundo plano.`
      : successMessage;
  };

  const getCurrentSupabaseUserMetadata = async () => {
    if (!supabase) {
      return {
        metadata: {} as Record<string, unknown>,
        error: null,
      };
    }

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return {
        metadata: null,
        error,
      };
    }

    return {
      metadata:
        data.session?.user.user_metadata && typeof data.session.user.user_metadata === "object"
          ? data.session.user.user_metadata
          : {},
      error: null,
    };
  };

  const queueProfileMediaSync = () => {
    if (!supabase) {
      return;
    }

    profileMediaSyncQueueRef.current = profileMediaSyncQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const currentSession = sessionRef.current;

        if (!currentSession || currentSession.provider !== "supabase") {
          return;
        }

        const { metadata } = await getCurrentSupabaseUserMetadata();

        if (!metadata) {
          return;
        }

        const nextAvatarUrl = normalizeAvatarUrl(currentSession.avatarUrl);
        const nextTeamPhotoUrl = normalizeAvatarUrl(currentSession.teamPhotoUrl);
        const nextMetadata = {
          ...metadata,
          avatar_url: isInlineProfileMedia(nextAvatarUrl) ? null : nextAvatarUrl,
          team_photo_url: isInlineProfileMedia(nextTeamPhotoUrl) ? null : nextTeamPhotoUrl,
        };

        delete nextMetadata.avatarUrl;
        delete nextMetadata.teamPhotoUrl;

        await supabase.auth.updateUser({
          data: nextMetadata,
        });
      });
  };

  const updateProfileAvatar = async (avatarUrl: string | null): Promise<AuthResult> => {
    if (!session) {
      return {
        success: false,
        message: "Entre com sua conta para atualizar a foto do perfil.",
      };
    }

    const normalizedAvatarUrl = normalizeAvatarUrl(avatarUrl);
    persistProfileMediaLocally({
      avatarUrl: normalizedAvatarUrl,
    });

    if (session.provider === "fallback" || !isSupabaseConfigured || !supabase) {
      return {
        success: true,
        message: buildProfileMediaSuccessMessage({
          kind: "avatar",
          value: normalizedAvatarUrl,
        }),
      };
    }

    setIsUpdatingProfile(true);
    queueProfileMediaSync();
    setIsUpdatingProfile(false);

    return {
      success: true,
      message: buildProfileMediaSuccessMessage({
        kind: "avatar",
        value: normalizedAvatarUrl,
        backgroundSync: true,
      }),
    };
  };

  const updateTeamPhoto = async (teamPhotoUrl: string | null): Promise<AuthResult> => {
    if (!session) {
      return {
        success: false,
        message: "Entre com sua conta para atualizar a foto da equipe.",
      };
    }

    const normalizedTeamPhotoUrl = normalizeAvatarUrl(teamPhotoUrl);
    persistProfileMediaLocally({
      teamPhotoUrl: normalizedTeamPhotoUrl,
    });

    if (session.provider === "fallback" || !isSupabaseConfigured || !supabase) {
      return {
        success: true,
        message: buildProfileMediaSuccessMessage({
          kind: "team-photo",
          value: normalizedTeamPhotoUrl,
        }),
      };
    }

    setIsUpdatingProfile(true);
    queueProfileMediaSync();
    setIsUpdatingProfile(false);

    return {
      success: true,
      message: buildProfileMediaSuccessMessage({
        kind: "team-photo",
        value: normalizedTeamPhotoUrl,
        backgroundSync: true,
      }),
    };
  };

  const logout = () => {
    const currentSession = session;

    if (currentSession?.provider !== "fallback" && supabase) {
      isSigningOutRef.current = true;
    }

    setSession(null);
    setIsPasswordRecoverySession(false);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PLAYER_FALLBACK_SESSION_STORAGE_KEY);
    }

    if (currentSession?.provider === "fallback" || !supabase) {
      isSigningOutRef.current = false;
      return;
    }

    void supabase.auth
      .signOut({ scope: "local" })
      .catch(() => undefined)
      .finally(() => {
        isSigningOutRef.current = false;
        setSession((current) => (current?.provider === "fallback" ? current : null));
      });
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
        avatarUrl: session?.avatarUrl ?? null,
        teamPhotoUrl: session?.teamPhotoUrl ?? null,
        isUpdatingProfile,
        isPasswordRecoverySession,
        login,
        register,
        requestPasswordReset,
        updatePassword,
        updateProfileAvatar,
        updateTeamPhoto,
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
