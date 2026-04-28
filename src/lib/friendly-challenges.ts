import type {
  CreateFriendlyChallengeInput,
  FriendlyChallengeIdentity,
  FriendlyChallengeRecord,
  FriendlyChallengeStatus,
} from "@/types/friendly-challenge";

function normalizeNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : null;
}

function normalizeEmail(value: unknown) {
  const normalizedValue = normalizeNullableString(value);
  return normalizedValue ? normalizedValue.toLowerCase() : null;
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const normalizedValue = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) ? normalizedValue : "";
}

function normalizeTime(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const normalizedValue = value.trim();
  return /^\d{2}:\d{2}$/.test(normalizedValue) ? normalizedValue : "";
}

export function createFriendlyChallengeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `friendly-challenge-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeFriendlyChallengeStatus(value: unknown): FriendlyChallengeStatus {
  if (value === "accepted" || value === "rejected") {
    return value;
  }

  return "pending";
}

export function normalizeFriendlyChallengeInput(
  input: CreateFriendlyChallengeInput,
): CreateFriendlyChallengeInput {
  return {
    championshipId: normalizeNullableString(input.championshipId),
    championshipName: normalizeNullableString(input.championshipName),
    fromTeamId: String(input.fromTeamId ?? "").trim(),
    toTeamId: String(input.toTeamId ?? "").trim(),
    fromPlayerId: normalizeNullableString(input.fromPlayerId),
    fromPlayerEmail: normalizeEmail(input.fromPlayerEmail),
    toPlayerId: normalizeNullableString(input.toPlayerId),
    toPlayerEmail: normalizeEmail(input.toPlayerEmail),
    fromTeamName: String(input.fromTeamName ?? "").trim() || "Meu time",
    toTeamName: String(input.toTeamName ?? "").trim() || "Adversario",
    fromFlagUrl: normalizeNullableString(input.fromFlagUrl),
    toFlagUrl: normalizeNullableString(input.toFlagUrl),
    date: normalizeDate(input.date),
    time: normalizeTime(input.time),
    message: normalizeNullableString(input.message),
  };
}

export function normalizeFriendlyChallengeRecord(value: unknown): FriendlyChallengeRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const challenge = value as Partial<FriendlyChallengeRecord>;
  const normalizedChallenge = normalizeFriendlyChallengeInput({
    championshipId: challenge.championshipId ?? null,
    championshipName: challenge.championshipName ?? null,
    fromTeamId: challenge.fromTeamId ?? "",
    toTeamId: challenge.toTeamId ?? "",
    fromPlayerId: challenge.fromPlayerId ?? null,
    fromPlayerEmail: challenge.fromPlayerEmail ?? null,
    toPlayerId: challenge.toPlayerId ?? null,
    toPlayerEmail: challenge.toPlayerEmail ?? null,
    fromTeamName: challenge.fromTeamName ?? "",
    toTeamName: challenge.toTeamName ?? "",
    fromFlagUrl: challenge.fromFlagUrl ?? null,
    toFlagUrl: challenge.toFlagUrl ?? null,
    date: challenge.date ?? "",
    time: challenge.time ?? "",
    message: challenge.message ?? null,
  });

  if (
    typeof challenge.id !== "string" ||
    !challenge.id.trim() ||
    !normalizedChallenge.fromTeamId ||
    !normalizedChallenge.toTeamId ||
    !normalizedChallenge.date ||
    !normalizedChallenge.time
  ) {
    return null;
  }

  const createdAt =
    typeof challenge.createdAt === "string" && challenge.createdAt.trim()
      ? challenge.createdAt
      : new Date().toISOString();
  const updatedAt =
    typeof challenge.updatedAt === "string" && challenge.updatedAt.trim()
      ? challenge.updatedAt
      : createdAt;

  return {
    id: challenge.id.trim(),
    ...normalizedChallenge,
    status: normalizeFriendlyChallengeStatus(challenge.status),
    createdAt,
    updatedAt,
  } satisfies FriendlyChallengeRecord;
}

export function sortFriendlyChallenges(items: FriendlyChallengeRecord[]) {
  return [...items].sort((left, right) => {
    const updatedDelta = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();

    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function findPendingFriendlyChallenge(
  challenges: FriendlyChallengeRecord[],
  scope: {
    championshipId: string | null;
    teamAId: string;
    teamBId: string;
  },
) {
  const normalizedChampionshipId = normalizeNullableString(scope.championshipId);
  const normalizedPair = [scope.teamAId.trim(), scope.teamBId.trim()].sort().join("::");

  if (!scope.teamAId.trim() || !scope.teamBId.trim() || scope.teamAId.trim() === scope.teamBId.trim()) {
    return null;
  }

  return (
    challenges.find((challenge) => {
      if (challenge.status !== "pending") {
        return false;
      }

      if ((challenge.championshipId ?? null) !== normalizedChampionshipId) {
        return false;
      }

      const challengePair = [challenge.fromTeamId, challenge.toTeamId].sort().join("::");
      return challengePair === normalizedPair;
    }) ?? null
  );
}

export function isFriendlyChallengeSender(
  challenge: Pick<FriendlyChallengeRecord, "fromPlayerId" | "fromPlayerEmail">,
  identity: FriendlyChallengeIdentity,
) {
  const normalizedEmail = normalizeEmail(identity.playerEmail);

  return Boolean(
    (identity.playerId && challenge.fromPlayerId === identity.playerId) ||
      (normalizedEmail && normalizeEmail(challenge.fromPlayerEmail) === normalizedEmail),
  );
}

export function isFriendlyChallengeRecipient(
  challenge: Pick<FriendlyChallengeRecord, "toPlayerId" | "toPlayerEmail">,
  identity: FriendlyChallengeIdentity,
) {
  const normalizedEmail = normalizeEmail(identity.playerEmail);

  return Boolean(
    (identity.playerId && challenge.toPlayerId === identity.playerId) ||
      (normalizedEmail && normalizeEmail(challenge.toPlayerEmail) === normalizedEmail),
  );
}

export function splitFriendlyChallengesForPlayer(
  challenges: FriendlyChallengeRecord[],
  identity: FriendlyChallengeIdentity,
) {
  const sent = challenges.filter((challenge) => isFriendlyChallengeSender(challenge, identity));
  const received = challenges.filter((challenge) =>
    isFriendlyChallengeRecipient(challenge, identity),
  );

  return {
    sent: sortFriendlyChallenges(sent),
    received: sortFriendlyChallenges(received),
  };
}
