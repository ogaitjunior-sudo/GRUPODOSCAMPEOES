const PLAYER_PROFILE_STORAGE_KEY = "gc_player_profile_settings_v1";

interface StoredPlayerProfileSettings {
  avatarUrl: string | null;
  teamPhotoUrl: string | null;
  updatedAt: string;
}

type StoredPlayerProfileRegistry = Record<string, StoredPlayerProfileSettings>;

function normalizePlayerEmail(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeAvatarUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : null;
}

function buildStoredPlayerProfileSettings(
  value: Partial<StoredPlayerProfileSettings>,
): StoredPlayerProfileSettings {
  return {
    avatarUrl: normalizeAvatarUrl(value.avatarUrl),
    teamPhotoUrl: normalizeAvatarUrl(value.teamPhotoUrl),
    updatedAt:
      typeof value.updatedAt === "string" && value.updatedAt.trim()
        ? value.updatedAt
        : new Date().toISOString(),
  };
}

function readStoredRegistry(): StoredPlayerProfileRegistry {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(PLAYER_PROFILE_STORAGE_KEY);

    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue);

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).flatMap(([email, value]) => {
        const normalizedEmail = normalizePlayerEmail(email);

        if (!normalizedEmail || !value || typeof value !== "object") {
          return [];
        }

        const settings = value as Partial<StoredPlayerProfileSettings>;

        return [
          [
            normalizedEmail,
            buildStoredPlayerProfileSettings(settings),
          ],
        ];
      }),
    );
  } catch {
    return {};
  }
}

function writeStoredRegistry(registry: StoredPlayerProfileRegistry) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(registry));
}

export function readStoredPlayerAvatar(email: string | null | undefined) {
  const normalizedEmail = normalizePlayerEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  return readStoredRegistry()[normalizedEmail]?.avatarUrl ?? null;
}

export function readStoredPlayerTeamPhoto(email: string | null | undefined) {
  const normalizedEmail = normalizePlayerEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  return readStoredRegistry()[normalizedEmail]?.teamPhotoUrl ?? null;
}

function writeStoredPlayerSettings(
  email: string | null | undefined,
  patch: Partial<Pick<StoredPlayerProfileSettings, "avatarUrl" | "teamPhotoUrl">>,
) {
  const normalizedEmail = normalizePlayerEmail(email);

  if (!normalizedEmail) {
    return;
  }

  const registry = readStoredRegistry();
  const currentSettings = registry[normalizedEmail];
  const nextAvatarUrl =
    "avatarUrl" in patch ? patch.avatarUrl ?? null : currentSettings?.avatarUrl ?? null;
  const nextTeamPhotoUrl =
    "teamPhotoUrl" in patch
      ? patch.teamPhotoUrl ?? null
      : currentSettings?.teamPhotoUrl ?? null;

  registry[normalizedEmail] = buildStoredPlayerProfileSettings({
    avatarUrl: nextAvatarUrl,
    teamPhotoUrl: nextTeamPhotoUrl,
    updatedAt: new Date().toISOString(),
  });
  writeStoredRegistry(registry);
}

export function writeStoredPlayerAvatar(email: string | null | undefined, avatarUrl: string | null) {
  writeStoredPlayerSettings(email, {
    avatarUrl: normalizeAvatarUrl(avatarUrl),
  });
}

export function writeStoredPlayerTeamPhoto(
  email: string | null | undefined,
  teamPhotoUrl: string | null,
) {
  writeStoredPlayerSettings(email, {
    teamPhotoUrl: normalizeAvatarUrl(teamPhotoUrl),
  });
}
