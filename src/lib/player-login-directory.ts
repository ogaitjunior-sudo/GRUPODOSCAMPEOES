import type { AdminPanelState } from "@/admin/types";
import {
  loadAdminPanelLoginDirectory,
  loadAdminPanelState,
  readCachedAdminPanelState,
  saveAdminPanelState,
} from "@/lib/admin-panel-store";
import {
  resolvePlayerAccountLoginEmail,
  upsertPlayerAccount,
} from "@/lib/player-accounts-store";

interface PlayerLoginResolution {
  email: string | null;
  error?: string;
}

interface SyncPlayerAccessPayload {
  authUserId?: string | null;
  name: string;
  email: string;
  createdAt?: string;
  lastLoginAt?: string;
}

type LoginDirectoryState = Pick<AdminPanelState, "users" | "players">;

function createDirectoryId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeDirectoryValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/^@+/, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isEmailIdentifier(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function collectMatchingEmails(identifier: string, state: LoginDirectoryState) {
  const normalizedIdentifier = normalizeDirectoryValue(identifier);
  const emails = new Set<string>();

  state.users.forEach((user) => {
    const normalizedEmail = normalizeEmail(user.email);

    if (!normalizedEmail) {
      return;
    }

    if (
      normalizeDirectoryValue(user.name) === normalizedIdentifier ||
      normalizeDirectoryValue(user.email) === normalizedIdentifier
    ) {
      emails.add(normalizedEmail);
    }
  });

  state.players.forEach((player) => {
    const normalizedEmail = normalizeEmail(player.email);

    if (!normalizedEmail) {
      return;
    }

    if (
      normalizeDirectoryValue(player.name) === normalizedIdentifier ||
      normalizeDirectoryValue(player.email) === normalizedIdentifier
    ) {
      emails.add(normalizedEmail);
    }
  });

  return Array.from(emails);
}

export function resolvePlayerLoginEmailFromState(
  identifier: string,
  state: LoginDirectoryState,
): PlayerLoginResolution {
  const trimmedIdentifier = identifier.trim();

  if (!trimmedIdentifier) {
    return { email: null };
  }

  if (isEmailIdentifier(trimmedIdentifier)) {
    return { email: normalizeEmail(trimmedIdentifier) };
  }

  const matchingEmails = collectMatchingEmails(trimmedIdentifier, state);

  if (matchingEmails.length === 1) {
    return { email: matchingEmails[0] };
  }

  if (matchingEmails.length > 1) {
    return {
      email: null,
      error: "Encontramos mais de uma conta com esse nome. Entre com o e-mail do jogador.",
    };
  }

  return {
    email: null,
    error: "Nao encontramos um jogador com esse nome. Entre com o e-mail usado no cadastro.",
  };
}

export async function resolvePlayerLoginEmail(identifier: string) {
  const trimmedIdentifier = identifier.trim();

  if (!trimmedIdentifier) {
    return { email: null } satisfies PlayerLoginResolution;
  }

  if (isEmailIdentifier(trimmedIdentifier)) {
    return { email: normalizeEmail(trimmedIdentifier) } satisfies PlayerLoginResolution;
  }

  const cachedResolution = resolvePlayerLoginEmailFromState(
    trimmedIdentifier,
    readCachedAdminPanelState(),
  );

  if (cachedResolution.email) {
    return cachedResolution;
  }

  const state = await loadAdminPanelLoginDirectory();
  const remoteResolution = resolvePlayerLoginEmailFromState(trimmedIdentifier, state);

  if (remoteResolution.email || remoteResolution.error?.includes("mais de uma conta")) {
    return remoteResolution;
  }

  const accountResolution = await resolvePlayerAccountLoginEmail(trimmedIdentifier);

  if (accountResolution.email || accountResolution.error) {
    return accountResolution;
  }

  return remoteResolution;
}

export async function syncPlayerAccessDirectoryEntry(payload: SyncPlayerAccessPayload) {
  const normalizedName = payload.name.trim();
  const normalizedEmail = normalizeEmail(payload.email);

  if (!normalizedName || !normalizedEmail) {
    return;
  }

  const timestamp = payload.lastLoginAt ?? payload.createdAt ?? new Date().toISOString();
  await upsertPlayerAccount({
    authUserId: payload.authUserId,
    name: normalizedName,
    email: normalizedEmail,
    createdAt: payload.createdAt ?? timestamp,
    lastLoginAt: payload.lastLoginAt,
  });

  const state = await loadAdminPanelState();

  const existingUser = state.users.find((user) => normalizeEmail(user.email) === normalizedEmail);

  const nextUser = existingUser
    ? {
        ...existingUser,
        name: normalizedName,
        email: normalizedEmail,
        lastLoginAt: payload.lastLoginAt ?? existingUser.lastLoginAt,
      }
    : {
        id: createDirectoryId("user"),
        name: normalizedName,
        email: normalizedEmail,
        role: "player" as const,
        status: "active" as const,
        permissions: [],
        createdAt: payload.createdAt ?? timestamp,
        lastLoginAt: payload.lastLoginAt ?? "",
        history: [],
      };

  const users = existingUser
    ? state.users.map((user) => (normalizeEmail(user.email) === normalizedEmail ? nextUser : user))
    : [nextUser, ...state.users];

  await saveAdminPanelState({
    ...state,
    users,
  });
}
