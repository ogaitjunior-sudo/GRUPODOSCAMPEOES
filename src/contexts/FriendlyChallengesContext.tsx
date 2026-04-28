import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createFriendlyChallengeId,
  findPendingFriendlyChallenge,
  isFriendlyChallengeRecipient,
  isFriendlyChallengeSender,
  normalizeFriendlyChallengeInput,
  sortFriendlyChallenges,
} from "@/lib/friendly-challenges";
import {
  createFriendlyChallengeRecord,
  formatFriendlyChallengeStoreError,
  getFriendlyChallengeStorageMode,
  listFriendlyChallenges,
  readStoredFriendlyChallenges,
  saveFriendlyChallengeRecord,
} from "@/lib/friendly-challenge-store";
import { usePlayerAuth } from "@/contexts/PlayerAuthContext";
import type {
  CreateFriendlyChallengeInput,
  FriendlyChallengeRecord,
  FriendlyChallengeStatus,
} from "@/types/friendly-challenge";

interface FriendlyChallengesContextValue {
  challenges: FriendlyChallengeRecord[];
  isLoading: boolean;
  storageMode: "local" | "supabase";
  syncError: string | null;
  refreshChallenges: () => Promise<void>;
  createChallenge: (payload: CreateFriendlyChallengeInput) => Promise<FriendlyChallengeRecord>;
  updateChallengeStatus: (payload: {
    challengeId: string;
    status: Extract<FriendlyChallengeStatus, "accepted" | "rejected">;
  }) => Promise<FriendlyChallengeRecord>;
  getPendingChallengeBetween: (scope: {
    championshipId: string | null;
    teamAId: string;
    teamBId: string;
  }) => FriendlyChallengeRecord | null;
}

const FriendlyChallengesContext = createContext<FriendlyChallengesContextValue | undefined>(
  undefined,
);

export function FriendlyChallengesProvider({ children }: { children: ReactNode }) {
  const { session, playerEmail } = usePlayerAuth();
  const storageMode = getFriendlyChallengeStorageMode();
  const [challenges, setChallenges] = useState<FriendlyChallengeRecord[]>(() =>
    sortFriendlyChallenges(readStoredFriendlyChallenges()),
  );
  const [isLoading, setIsLoading] = useState(storageMode === "supabase");
  const [syncError, setSyncError] = useState<string | null>(null);

  const currentIdentity = {
    playerId: session?.id ?? null,
    playerEmail,
  };

  const ensureAuthenticated = () => {
    if (!session) {
      throw new Error("Entre com sua conta para desafiar outro time.");
    }
  };

  const refreshChallenges = async () => {
    setIsLoading(true);

    try {
      const nextChallenges = await listFriendlyChallenges();
      setChallenges(sortFriendlyChallenges(nextChallenges));
      setSyncError(null);
    } catch (error) {
      setSyncError(formatFriendlyChallengeStoreError(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (storageMode === "local") {
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const loadChallenges = async () => {
      setIsLoading(true);

      try {
        const nextChallenges = await listFriendlyChallenges();

        if (!isActive) {
          return;
        }

        setChallenges(sortFriendlyChallenges(nextChallenges));
        setSyncError(null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSyncError(formatFriendlyChallengeStoreError(error));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadChallenges();

    return () => {
      isActive = false;
    };
  }, [storageMode]);

  const commitChallenge = (nextChallenge: FriendlyChallengeRecord) => {
    setChallenges((current) =>
      sortFriendlyChallenges(
        current.some((item) => item.id === nextChallenge.id)
          ? current.map((item) => (item.id === nextChallenge.id ? nextChallenge : item))
          : [nextChallenge, ...current],
      ),
    );
    setSyncError(null);
  };

  const getPendingChallengeBetween = (scope: {
    championshipId: string | null;
    teamAId: string;
    teamBId: string;
  }) => findPendingFriendlyChallenge(challenges, scope);

  const createChallenge = async (payload: CreateFriendlyChallengeInput) => {
    ensureAuthenticated();

    const normalizedPayload = normalizeFriendlyChallengeInput(payload);

    if (!normalizedPayload.fromTeamId || !normalizedPayload.toTeamId) {
      throw new Error("Nao foi possivel identificar os times deste amistoso.");
    }

    if (normalizedPayload.fromTeamId === normalizedPayload.toTeamId) {
      throw new Error("Voce nao pode desafiar o proprio time.");
    }

    if (!normalizedPayload.date || !normalizedPayload.time) {
      throw new Error("Informe a data e o horario do amistoso.");
    }

    if (
      !isFriendlyChallengeSender(
        {
          fromPlayerId: normalizedPayload.fromPlayerId,
          fromPlayerEmail: normalizedPayload.fromPlayerEmail,
        },
        currentIdentity,
      )
    ) {
      throw new Error("Voce nao pode enviar desafios em nome deste time.");
    }

    if (
      getPendingChallengeBetween({
        championshipId: normalizedPayload.championshipId,
        teamAId: normalizedPayload.fromTeamId,
        teamBId: normalizedPayload.toTeamId,
      })
    ) {
      throw new Error("Ja existe um desafio pendente com este time.");
    }

    const timestamp = new Date().toISOString();
    const nextChallenge: FriendlyChallengeRecord = {
      id: createFriendlyChallengeId(),
      ...normalizedPayload,
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      const savedChallenge = await createFriendlyChallengeRecord(nextChallenge);
      commitChallenge(savedChallenge);
      return savedChallenge;
    } catch (error) {
      const postgrestError = error as { code?: string; message?: string } | null;

      if (
        postgrestError?.code === "23505" ||
        postgrestError?.message?.toLowerCase().includes("friendly_challenges_pending_pair_idx")
      ) {
        throw new Error("Ja existe um desafio pendente com este time.");
      }

      throw error;
    }
  };

  const updateChallengeStatus = async ({
    challengeId,
    status,
  }: {
    challengeId: string;
    status: Extract<FriendlyChallengeStatus, "accepted" | "rejected">;
  }) => {
    ensureAuthenticated();

    const challenge = challenges.find((item) => item.id === challengeId);

    if (!challenge) {
      throw new Error("Desafio amistoso nao encontrado.");
    }

    if (challenge.status !== "pending") {
      throw new Error("Este desafio ja foi respondido.");
    }

    if (!isFriendlyChallengeRecipient(challenge, currentIdentity)) {
      throw new Error("Somente o time desafiado pode responder este convite.");
    }

    const nextChallenge: FriendlyChallengeRecord = {
      ...challenge,
      status,
      updatedAt: new Date().toISOString(),
    };
    const savedChallenge = await saveFriendlyChallengeRecord(nextChallenge);
    commitChallenge(savedChallenge);
    return savedChallenge;
  };

  return (
    <FriendlyChallengesContext.Provider
      value={{
        challenges,
        isLoading,
        storageMode,
        syncError,
        refreshChallenges,
        createChallenge,
        updateChallengeStatus,
        getPendingChallengeBetween,
      }}
    >
      {children}
    </FriendlyChallengesContext.Provider>
  );
}

export function useFriendlyChallenges() {
  const context = useContext(FriendlyChallengesContext);

  if (!context) {
    throw new Error("useFriendlyChallenges deve ser usado dentro de FriendlyChallengesProvider.");
  }

  return context;
}
