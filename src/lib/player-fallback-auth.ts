const PLAYER_FALLBACK_EMAIL_DOMAIN = "local.player";
const PLAYER_FALLBACK_ID_PREFIX = "player-fallback-";

type PlayerFallbackEnv = {
  VITE_PLAYER_LOGIN?: string;
  VITE_PLAYER_PASSWORD_HASH?: string;
};

export interface PlayerFallbackSession {
  id: string;
  email: string;
  displayName: string;
  loginAt: string;
  provider: "fallback";
}

export function getPlayerFallbackCredentials(env: PlayerFallbackEnv = import.meta.env) {
  const login = env.VITE_PLAYER_LOGIN?.trim() ?? "";
  const passwordHash = env.VITE_PLAYER_PASSWORD_HASH?.trim() ?? "";

  if (!login || !passwordHash) {
    return null;
  }

  return {
    login,
    passwordHash,
  };
}

function normalizePlayerIdentifier(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function createPlayerFallbackSlug(login: string) {
  return normalizePlayerIdentifier(login).replace(/\s+/g, "-");
}

export function isPlayerFallbackIdentifier(
  identifier: string,
  env: PlayerFallbackEnv = import.meta.env,
) {
  const credentials = getPlayerFallbackCredentials(env);

  if (!credentials) {
    return false;
  }

  return normalizePlayerIdentifier(identifier) === normalizePlayerIdentifier(credentials.login);
}

export function isPlayerFallbackSession(value: unknown): value is PlayerFallbackSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<PlayerFallbackSession>;

  return (
    session.provider === "fallback" &&
    typeof session.id === "string" &&
    session.id.startsWith(PLAYER_FALLBACK_ID_PREFIX) &&
    typeof session.email === "string" &&
    session.email.endsWith(`@${PLAYER_FALLBACK_EMAIL_DOMAIN}`) &&
    typeof session.displayName === "string" &&
    typeof session.loginAt === "string"
  );
}

export async function hashPlayerSecret(value: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
}

export function createPlayerFallbackSession(login: string, loginAt = new Date().toISOString()) {
  const slug = createPlayerFallbackSlug(login);

  return {
    id: `${PLAYER_FALLBACK_ID_PREFIX}${slug}`,
    email: `${slug}@${PLAYER_FALLBACK_EMAIL_DOMAIN}`,
    displayName: login.trim(),
    loginAt,
    provider: "fallback",
  } satisfies PlayerFallbackSession;
}

export async function authenticatePlayerFallback(
  identifier: string,
  password: string,
  env: PlayerFallbackEnv = import.meta.env,
) {
  const credentials = getPlayerFallbackCredentials(env);

  if (!credentials || !isPlayerFallbackIdentifier(identifier, env)) {
    return null;
  }

  const passwordHash = await hashPlayerSecret(password.trim());

  if (passwordHash !== credentials.passwordHash) {
    return {
      success: false as const,
      message: "Senha invalida para o acesso local do jogador.",
    };
  }

  return {
    success: true as const,
    playerName: credentials.login,
    session: createPlayerFallbackSession(credentials.login),
  };
}
