import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createChampionshipRecord,
  deleteChampionshipRecord,
  formatChampionshipStoreError,
  getChampionshipStorageMode,
  listChampionships,
  readStoredChampionships,
  saveChampionshipRecord,
  updateChampionshipRecord,
} from "@/lib/championship-store";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  createChampionshipRegistrationId,
  sortChampionships,
} from "@/lib/championships";
import type {
  ChampionshipFormValues,
  ChampionshipRecord,
  ChampionshipRegistrationStatus,
} from "@/types/championship";

interface ChampionshipContextValue {
  championships: ChampionshipRecord[];
  featuredChampionships: ChampionshipRecord[];
  isLoading: boolean;
  storageMode: "local" | "supabase";
  syncError: string | null;
  getChampionshipById: (id: string) => ChampionshipRecord | undefined;
  refreshChampionships: () => Promise<void>;
  createChampionship: (values: ChampionshipFormValues) => Promise<ChampionshipRecord>;
  updateChampionship: (id: string, values: ChampionshipFormValues) => Promise<ChampionshipRecord>;
  submitChampionshipRegistration: (payload: {
    championshipId: string;
    playerId: string;
    playerName: string;
    playerEmail: string;
  }) => Promise<ChampionshipRecord>;
  reviewChampionshipRegistration: (payload: {
    championshipId: string;
    requestId: string;
    status: Extract<ChampionshipRegistrationStatus, "approved" | "rejected">;
    reviewedBy: string;
  }) => Promise<ChampionshipRecord>;
  removeChampionship: (id: string) => Promise<void>;
}

const ChampionshipContext = createContext<ChampionshipContextValue | undefined>(undefined);

export function ChampionshipProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAdminAuth();
  const storageMode = getChampionshipStorageMode();
  const [championships, setChampionships] = useState<ChampionshipRecord[]>(() =>
    sortChampionships(readStoredChampionships()),
  );
  const [isLoading, setIsLoading] = useState(storageMode === "supabase");
  const [syncError, setSyncError] = useState<string | null>(null);

  const ensureAdminAccess = () => {
    if (!isAdmin) {
      throw new Error("Somente administradores podem criar campeonatos.");
    }
  };

  const commitChampionship = (nextChampionship: ChampionshipRecord) => {
    setChampionships((current) =>
      sortChampionships(
        current.some((item) => item.id === nextChampionship.id)
          ? current.map((item) => (item.id === nextChampionship.id ? nextChampionship : item))
          : [...current, nextChampionship],
      ),
    );
    setSyncError(null);
  };

  const getChampionshipById = (id: string) => championships.find((item) => item.id === id);

  const refreshChampionships = async () => {
    setIsLoading(true);

    try {
      const nextChampionships = await listChampionships();
      setChampionships(sortChampionships(nextChampionships));
      setSyncError(null);
    } catch (error) {
      setSyncError(formatChampionshipStoreError(error));
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

    const loadChampionships = async () => {
      setIsLoading(true);

      try {
        const nextChampionships = await listChampionships();

        if (!isActive) {
          return;
        }

        setChampionships(sortChampionships(nextChampionships));
        setSyncError(null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSyncError(formatChampionshipStoreError(error));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadChampionships();

    return () => {
      isActive = false;
    };
  }, [storageMode]);

  const createChampionship = async (values: ChampionshipFormValues) => {
    ensureAdminAccess();

    const nextChampionship = await createChampionshipRecord(values);
    commitChampionship(nextChampionship);

    return nextChampionship;
  };

  const updateChampionship = async (id: string, values: ChampionshipFormValues) => {
    ensureAdminAccess();

    const existingChampionship = getChampionshipById(id);

    if (!existingChampionship) {
      throw new Error("Campeonato nao encontrado.");
    }

    const updatedChampionship = await updateChampionshipRecord(existingChampionship, values);
    commitChampionship(updatedChampionship);

    return updatedChampionship;
  };

  const submitChampionshipRegistration = async ({
    championshipId,
    playerId,
    playerName,
    playerEmail,
  }: {
    championshipId: string;
    playerId: string;
    playerName: string;
    playerEmail: string;
  }) => {
    const championship = getChampionshipById(championshipId);

    if (!championship) {
      throw new Error("Campeonato nao encontrado.");
    }

    if (championship.status !== "Inscricoes abertas") {
      throw new Error("Este campeonato nao esta aceitando pedidos no momento.");
    }

    if (championship.configuration.registrationMode !== "public") {
      throw new Error("Este campeonato usa entrada privada pela organizacao.");
    }

    const existingRequest = championship.registrationRequests.find(
      (request) => request.playerId === playerId,
    );

    if (existingRequest) {
      return championship;
    }

    const timestamp = new Date().toISOString();
    const updatedChampionship = await saveChampionshipRecord({
      ...championship,
      registrationRequests: [
        {
          id: createChampionshipRegistrationId(),
          playerId,
          playerName: playerName.trim() || "Jogador",
          playerEmail: playerEmail.trim().toLowerCase(),
          status: "pending",
          requestedAt: timestamp,
          reviewedAt: null,
          reviewedBy: null,
        },
        ...championship.registrationRequests,
      ],
      updatedAt: timestamp,
    });

    commitChampionship(updatedChampionship);
    return updatedChampionship;
  };

  const reviewChampionshipRegistration = async ({
    championshipId,
    requestId,
    status,
    reviewedBy,
  }: {
    championshipId: string;
    requestId: string;
    status: Extract<ChampionshipRegistrationStatus, "approved" | "rejected">;
    reviewedBy: string;
  }) => {
    ensureAdminAccess();

    const championship = getChampionshipById(championshipId);

    if (!championship) {
      throw new Error("Campeonato nao encontrado.");
    }

    const request = championship.registrationRequests.find((item) => item.id === requestId);

    if (!request) {
      throw new Error("Solicitacao de participacao nao encontrada.");
    }

    if (request.status !== "pending") {
      return championship;
    }

    const timestamp = new Date().toISOString();
    const updatedChampionship = await saveChampionshipRecord({
      ...championship,
      registrationRequests: championship.registrationRequests.map((item) =>
        item.id === requestId
          ? {
              ...item,
              status,
              reviewedAt: timestamp,
              reviewedBy: reviewedBy.trim() || "Administrador",
            }
          : item,
      ),
      updatedAt: timestamp,
    });

    commitChampionship(updatedChampionship);
    return updatedChampionship;
  };

  const removeChampionship = async (id: string) => {
    ensureAdminAccess();

    await deleteChampionshipRecord(id);
    setChampionships((current) => current.filter((item) => item.id !== id));
    setSyncError(null);
  };

  return (
    <ChampionshipContext.Provider
      value={{
        championships,
        featuredChampionships: championships.slice(0, 4),
        isLoading,
        storageMode,
        syncError,
        getChampionshipById,
        refreshChampionships,
        createChampionship,
        updateChampionship,
        submitChampionshipRegistration,
        reviewChampionshipRegistration,
        removeChampionship,
      }}
    >
      {children}
    </ChampionshipContext.Provider>
  );
}

export function useChampionships() {
  const context = useContext(ChampionshipContext);

  if (!context) {
    throw new Error("useChampionships deve ser usado dentro de ChampionshipProvider.");
  }

  return context;
}
