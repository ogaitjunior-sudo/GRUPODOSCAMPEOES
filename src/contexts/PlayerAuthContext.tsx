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

function normalizeAvatarUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : null;
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

function isSupabaseNetworkError(error: unknown) {
  const errorMessage = getAuthErrorMessage(error).toLowerCase();

  return (
    errorMessage.includes("failed to fetch") ||
    errorMessage.includes("fetch failed") ||
    errorMessage.includes("load failed") ||
    errorMessage.includes("network error") ||
    errorMessage.includes("networkerror") ||
    errorMessage.includes("network request failed")
  );
}

function resolveUserAvatar(
  email: string,
  metadata: Record<string, unknown> | undefined,
) {
  return (
    normalizeAvatarUrl(metadata?.avatar_url) ??
    normalizeAvatarUrl(metadata?.avatarUrl) ??
    normalizeAvatarUrl(metadata?.picture) ??
    readStoredPlayerAvatar(email)
  );
}

function resolveUserTeamPhoto(
  email: string,
  metadata: Record<string, unknown> | undefined,
) {
  return (
    normalizeAvatarUrl(metadata?.team_photo_url) ??
    normalizeAvatarUrl(metadata?.teamPhotoUrl) ??
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

      const fallbackSession = {
        ...fallbackAuth.session,
        avatarUrl: readStoredPlayerAvatar(fallbackAuth.session.email),
        teamPhotoUrl: readStoredPlayerTeamPhoto(fallbackAuth.session.email),
      } satisfies PlayerSession;

      setSession(fallbackSession);

      void syncPlayerAccessDirectoryEntry({
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
  }: {
    kind: "avatar" | "team-photo";
    value: string | null;
    usedLocalFallback?: boolean;
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
      : successMessage;
  };

  const updateProfileAvatar = async (avatarUrl: string | null): Promise<AuthResult> => {
    if (!session) {
      return {
        success: false,
        message: "Entre com sua conta para atualizar a foto do perfil.",
      };
    }

    const normalizedAvatarUrl = normalizeAvatarUrl(avatarUrl);
    setIsUpdatingProfile(true);

    try {
      if (session.provider === "fallback" || !isSupabaseConfigured || !supabase) {
        persistProfileMediaLocally({
          avatarUrl: normalizedAvatarUrl,
        });

        return {
          success: true,
          message: buildProfileMediaSuccessMessage({
            kind: "avatar",
            value: normalizedAvatarUrl,
          }),
        };
      }

      const { data: userData, error: getUserError } = await supabase.auth.getUser();

      if (getUserError) {
        if (isSupabaseNetworkError(getUserError)) {
          persistProfileMediaLocally({
            avatarUrl: normalizedAvatarUrl,
          });

          return {
            success: true,
            message: buildProfileMediaSuccessMessage({
              kind: "avatar",
              value: normalizedAvatarUrl,
              usedLocalFallback: true,
            }),
          };
        }

        return {
          success: false,
          message: getAuthErrorMessage(getUserError) || "Nao foi possivel atualizar a foto do perfil.",
        };
      }

      const currentMetadata =
        userData.user?.user_metadata && typeof userData.user.user_metadata === "object"
          ? userData.user.user_metadata
          : {};
      const nextMetadata = {
        ...currentMetadata,
        avatar_url: normalizedAvatarUrl,
      };
      const { error } = await supabase.auth.updateUser({
        data: nextMetadata,
      });

      if (error) {
        if (isSupabaseNetworkError(error)) {
          persistProfileMediaLocally({
            avatarUrl: normalizedAvatarUrl,
          });

          return {
            success: true,
            message: buildProfileMediaSuccessMessage({
              kind: "avatar",
              value: normalizedAvatarUrl,
              usedLocalFallback: true,
            }),
          };
        }

        return {
          success: false,
          message: getAuthErrorMessage(error) || "Nao foi possivel atualizar a foto do perfil.",
        };
      }

      persistProfileMediaLocally({
        avatarUrl: normalizedAvatarUrl,
      });

      return {
        success: true,
        message: buildProfileMediaSuccessMessage({
          kind: "avatar",
          value: normalizedAvatarUrl,
        }),
      };
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const updateTeamPhoto = async (teamPhotoUrl: string | null): Promise<AuthResult> => {
    if (!session) {
      return {
        success: false,
        message: "Entre com sua conta para atualizar a foto da equipe.",
      };
    }

    const normalizedTeamPhotoUrl = normalizeAvatarUrl(teamPhotoUrl);
    setIsUpdatingProfile(true);

    try {
      if (session.provider === "fallback" || !isSupabaseConfigured || !supabase) {
        persistProfileMediaLocally({
          teamPhotoUrl: normalizedTeamPhotoUrl,
        });

        return {
          success: true,
          message: buildProfileMediaSuccessMessage({
            kind: "team-photo",
            value: normalizedTeamPhotoUrl,
          }),
        };
      }

      const { data: userData, error: getUserError } = await supabase.auth.getUser();

      if (getUserError) {
        if (isSupabaseNetworkError(getUserError)) {
          persistProfileMediaLocally({
            teamPhotoUrl: normalizedTeamPhotoUrl,
          });

          return {
            success: true,
            message: buildProfileMediaSuccessMessage({
              kind: "team-photo",
              value: normalizedTeamPhotoUrl,
              usedLocalFallback: true,
            }),
          };
        }

        return {
          success: false,
          message: getAuthErrorMessage(getUserError) || "Nao foi possivel atualizar a foto da equipe.",
        };
      }

      const currentMetadata =
        userData.user?.user_metadata && typeof userData.user.user_metadata === "object"
          ? userData.user.user_metadata
          : {};
      const nextMetadata = {
        ...currentMetadata,
        team_photo_url: normalizedTeamPhotoUrl,
      };
      const { error } = await supabase.auth.updateUser({
        data: nextMetadata,
      });

      if (error) {
        if (isSupabaseNetworkError(error)) {
          persistProfileMediaLocally({
            teamPhotoUrl: normalizedTeamPhotoUrl,
          });

          return {
            success: true,
            message: buildProfileMediaSuccessMessage({
              kind: "team-photo",
              value: normalizedTeamPhotoUrl,
              usedLocalFallback: true,
            }),
          };
        }

        return {
          success: false,
          message: getAuthErrorMessage(error) || "Nao foi possivel atualizar a foto da equipe.",
        };
      }

      persistProfileMediaLocally({
        teamPhotoUrl: normalizedTeamPhotoUrl,
      });

      return {
        success: true,
        message: buildProfileMediaSuccessMessage({
          kind: "team-photo",
          value: normalizedTeamPhotoUrl,
        }),
      };
    } finally {
      setIsUpdatingProfile(false);
    }
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
        avatarUrl: session?.avatarUrl ?? null,
        teamPhotoUrl: session?.teamPhotoUrl ?? null,
        isUpdatingProfile,
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
