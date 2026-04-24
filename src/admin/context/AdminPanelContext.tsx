import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getPermissionsForRole } from "@/admin/config/security";
import { createInitialAdminPanelState } from "@/admin/context/adminSeed";
import type {
  AdminPanelState,
  ChampionshipRecord,
  ErrorLog,
  ImageRequestStatus,
  LanguageRecord,
  ManagedUser,
  ModerationAction,
  PlayerRecord,
  PlayerStatus,
  SiteSettings,
  SupportTicket,
  TeamRecord,
  TeamStatus,
  UserStatus,
} from "@/admin/types";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  formatAdminPanelStoreError,
  getAdminPanelStorageMode,
  loadAdminPanelState,
  saveAdminPanelState,
  type AdminPanelStorageMode,
} from "@/lib/admin-panel-store";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getNow() {
  return new Date().toISOString();
}

type UserUpsertPayload = Partial<ManagedUser> & Pick<ManagedUser, "name" | "email" | "role">;
type PlayerUpsertPayload = Partial<PlayerRecord> &
  Pick<PlayerRecord, "name" | "email" | "platform" | "status">;
type TeamUpsertPayload = Partial<TeamRecord> &
  Pick<TeamRecord, "name" | "tag" | "captain" | "platform" | "status">;
type ChampionshipUpsertPayload = Partial<ChampionshipRecord> &
  Pick<ChampionshipRecord, "name" | "format" | "status" | "phase">;
type LanguageUpsertPayload = Partial<LanguageRecord> &
  Pick<LanguageRecord, "code" | "label" | "status" | "completion">;

interface AdminPanelContextValue {
  state: AdminPanelState;
  isLoading: boolean;
  storageMode: AdminPanelStorageMode;
  syncError: string | null;
  refreshState: () => Promise<void>;
  upsertUser: (payload: UserUpsertPayload) => void;
  setUserStatus: (id: string, status: UserStatus) => void;
  deleteUser: (id: string) => void;
  upsertPlayer: (payload: PlayerUpsertPayload) => void;
  setPlayerStatus: (id: string, status: PlayerStatus) => void;
  upsertTeam: (payload: TeamUpsertPayload) => void;
  setTeamStatus: (id: string, status: TeamStatus) => void;
  deleteTeam: (id: string) => void;
  upsertChampionship: (payload: ChampionshipUpsertPayload) => void;
  toggleChampionshipRegistration: (id: string) => void;
  deleteChampionship: (id: string) => void;
  moderateImageRequest: (id: string, status: ImageRequestStatus, reason?: string) => void;
  upsertLanguage: (payload: LanguageUpsertPayload) => void;
  toggleLanguageStatus: (id: string) => void;
  replyTicket: (id: string, message: string) => void;
  updateTicketMeta: (
    id: string,
    patch: Partial<Pick<SupportTicket, "status" | "priority" | "assignedTo">>,
  ) => void;
  updateErrorStatus: (id: string, status: ErrorLog["status"]) => void;
  updateSettings: (patch: Partial<SiteSettings>) => void;
}

const AdminPanelContext = createContext<AdminPanelContextValue | undefined>(undefined);

function appendAuditLog(
  current: AdminPanelState,
  actorName: string,
  module: string,
  action: string,
  target: string,
  severity: "info" | "warning" | "critical" | "success" = "info",
) {
  return {
    ...current,
    auditLogs: [
      {
        id: createId("audit"),
        actor: actorName,
        module,
        action,
        target,
        createdAt: getNow(),
        severity,
      },
      ...current.auditLogs,
    ].slice(0, 80),
  };
}

export function AdminPanelProvider({ children }: { children: ReactNode }) {
  const { displayName, isPrimaryAdmin, session } = useAdminAuth();
  const [state, setState] = useState<AdminPanelState>(() => createInitialAdminPanelState());
  const [isLoading, setIsLoading] = useState(getAdminPanelStorageMode() === "supabase");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const storageMode = getAdminPanelStorageMode();

  const actorName = useMemo(
    () => displayName ?? session?.username ?? "Administrador geral",
    [displayName, session?.username],
  );

  const refreshState = async () => {
    setIsLoading(true);

    try {
      const nextState = await loadAdminPanelState();
      setState(nextState);
      setSyncError(null);
    } catch (error) {
      setSyncError(formatAdminPanelStoreError(error));
      setState(createInitialAdminPanelState());
    } finally {
      setIsLoading(false);
      setHasHydrated(true);
    }
  };

  useEffect(() => {
    void refreshState();
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    let cancelled = false;

    const persistState = async () => {
      try {
        await saveAdminPanelState(state);

        if (!cancelled) {
          setSyncError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setSyncError(formatAdminPanelStoreError(error));
        }
      }
    };

    void persistState();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, state]);

  const ensurePrimaryAdminWriteAccess = () => {
    if (!isPrimaryAdmin) {
      return false;
    }

    return true;
  };

  const upsertUser = (payload: UserUpsertPayload) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) => {
      const isAdminRole =
        payload.role === "super_admin" ||
        payload.role === "operations_manager" ||
        payload.role === "moderator" ||
        payload.role === "support_manager";

      const nextUser: ManagedUser = {
        id: payload.id ?? createId("user"),
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        role: payload.role,
        status: payload.status ?? "active",
        permissions:
          payload.permissions ??
          (isAdminRole ? getPermissionsForRole(payload.role) : []),
        createdAt: payload.createdAt ?? getNow(),
        lastLoginAt: payload.lastLoginAt ?? "",
        history: payload.history ?? [],
      };

      const exists = current.users.some((item) => item.id === nextUser.id);
      const users = exists
        ? current.users.map((item) => (item.id === nextUser.id ? { ...item, ...nextUser } : item))
        : [nextUser, ...current.users];

      return appendAuditLog(
        { ...current, users },
        actorName,
        "Usuarios",
        exists ? "Atualizou usuario" : "Criou usuario",
        nextUser.name,
        "success",
      );
    });
  };

  const setUserStatus = (id: string, status: UserStatus) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) => {
      const target = current.users.find((item) => item.id === id);

      if (!target) {
        return current;
      }

      const historyEntry = {
        id: createId("history"),
        action: `Status alterado para ${status}`,
        actor: actorName,
        at: getNow(),
        description: `Conta marcada como ${status}.`,
      };

      return appendAuditLog(
        {
          ...current,
          users: current.users.map((item) =>
            item.id === id
              ? { ...item, status, history: [historyEntry, ...item.history] }
              : item,
          ),
        },
        actorName,
        "Usuarios",
        "Alterou status de usuario",
        target.name,
        status === "suspended" ? "warning" : "success",
      );
    });
  };

  const deleteUser = (id: string) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) => {
      const target = current.users.find((item) => item.id === id);

      if (!target) {
        return current;
      }

      return appendAuditLog(
        { ...current, users: current.users.filter((item) => item.id !== id) },
        actorName,
        "Usuarios",
        "Excluiu usuario",
        target.name,
        "critical",
      );
    });
  };

  const upsertPlayer = (payload: PlayerUpsertPayload) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) => {
      const nextPlayer: PlayerRecord = {
        id: payload.id ?? createId("player"),
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        platform: payload.platform,
        status: payload.status,
        linkedTeam: payload.linkedTeam ?? "Sem conta UT",
        isVerified: payload.isVerified ?? false,
        participationHistory: payload.participationHistory ?? [],
        createdAt: payload.createdAt ?? getNow(),
      };

      const exists = current.players.some((item) => item.id === nextPlayer.id);
      const players = exists
        ? current.players.map((item) => (item.id === nextPlayer.id ? { ...item, ...nextPlayer } : item))
        : [nextPlayer, ...current.players];

      return appendAuditLog(
        { ...current, players },
        actorName,
        "Jogadores",
        exists ? "Atualizou jogador" : "Criou jogador",
        nextPlayer.name,
        "success",
      );
    });
  };

  const setPlayerStatus = (id: string, status: PlayerStatus) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) => {
      const target = current.players.find((item) => item.id === id);

      if (!target) {
        return current;
      }

      return appendAuditLog(
        {
          ...current,
          players: current.players.map((item) =>
            item.id === id ? { ...item, status, isVerified: status === "approved" } : item,
          ),
        },
        actorName,
        "Jogadores",
        "Alterou status de jogador",
        target.name,
        status === "blocked" ? "warning" : "success",
      );
    });
  };

  const upsertTeam = (payload: TeamUpsertPayload) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) => {
      const nextTeam: TeamRecord = {
        id: payload.id ?? createId("team"),
        name: payload.name.trim(),
        tag: payload.tag.trim().toUpperCase(),
        captain: payload.captain.trim(),
        platform: payload.platform,
        status: payload.status,
        members: payload.members ?? [],
        championships: payload.championships ?? 0,
        summary: payload.summary ?? "Conta UT em acompanhamento pelo painel administrativo.",
        createdAt: payload.createdAt ?? getNow(),
      };

      const exists = current.teams.some((item) => item.id === nextTeam.id);
      const teams = exists
        ? current.teams.map((item) => (item.id === nextTeam.id ? { ...item, ...nextTeam } : item))
        : [nextTeam, ...current.teams];

      return appendAuditLog(
        { ...current, teams },
        actorName,
        "Contas UT",
        exists ? "Atualizou conta UT" : "Criou conta UT",
        nextTeam.name,
        "success",
      );
    });
  };

  const setTeamStatus = (id: string, status: TeamStatus) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) => {
      const target = current.teams.find((item) => item.id === id);

      if (!target) {
        return current;
      }

      return appendAuditLog(
        {
          ...current,
          teams: current.teams.map((item) => (item.id === id ? { ...item, status } : item)),
        },
        actorName,
        "Contas UT",
        "Alterou status da conta UT",
        target.name,
        status === "rejected" ? "warning" : "success",
      );
    });
  };

  const deleteTeam = (id: string) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) => {
      const target = current.teams.find((item) => item.id === id);

      if (!target) {
        return current;
      }

      return appendAuditLog(
        { ...current, teams: current.teams.filter((item) => item.id !== id) },
        actorName,
        "Contas UT",
        "Removeu conta UT",
        target.name,
        "critical",
      );
    });
  };

  const upsertChampionship = (payload: ChampionshipUpsertPayload) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) => {
      const nextChampionship: ChampionshipRecord = {
        id: payload.id ?? createId("championship"),
        name: payload.name.trim(),
        format: payload.format.trim(),
        status: payload.status,
        phase: payload.phase.trim(),
        registrationOpen: payload.registrationOpen ?? false,
        participants: payload.participants ?? [],
        rules: payload.rules ?? "Regras em definicao pelo painel administrativo.",
        startsAt: payload.startsAt ?? getNow(),
        endsAt: payload.endsAt ?? getNow(),
      };

      const exists = current.championships.some((item) => item.id === nextChampionship.id);
      const championships = exists
        ? current.championships.map((item) =>
            item.id === nextChampionship.id ? { ...item, ...nextChampionship } : item,
          )
        : [nextChampionship, ...current.championships];

      return appendAuditLog(
        { ...current, championships },
        actorName,
        "Campeonatos",
        exists ? "Atualizou campeonato" : "Criou campeonato",
        nextChampionship.name,
        "success",
      );
    });
  };

  const toggleChampionshipRegistration = (id: string) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) => {
      const target = current.championships.find((item) => item.id === id);

      if (!target) {
        return current;
      }

      return appendAuditLog(
        {
          ...current,
          championships: current.championships.map((item) =>
            item.id === id ? { ...item, registrationOpen: !item.registrationOpen } : item,
          ),
        },
        actorName,
        "Campeonatos",
        target.registrationOpen ? "Fechou inscricoes" : "Abriu inscricoes",
        target.name,
        "warning",
      );
    });
  };

  const deleteChampionship = (id: string) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) => {
      const target = current.championships.find((item) => item.id === id);

      if (!target) {
        return current;
      }

      return appendAuditLog(
        {
          ...current,
          championships: current.championships.filter((item) => item.id !== id),
        },
        actorName,
        "Campeonatos",
        "Excluiu campeonato",
        target.name,
        "critical",
      );
    });
  };

  const moderateImageRequest = (id: string, status: ImageRequestStatus, reason?: string) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) => {
      const target = current.imageRequests.find((item) => item.id === id);

      if (!target) {
        return current;
      }

      const moderationAction: ModerationAction = {
        id: createId("moderation"),
        actor: actorName,
        action: status === "approved" ? "approved" : "rejected",
        reason,
        at: getNow(),
      };

      return appendAuditLog(
        {
          ...current,
          imageRequests: current.imageRequests.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status,
                  moderationHistory: [moderationAction, ...item.moderationHistory],
                }
              : item,
          ),
        },
        actorName,
        "Solicitacoes de imagem",
        status === "approved" ? "Aprovou solicitacao de imagem" : "Rejeitou solicitacao de imagem",
        target.requesterName,
        status === "approved" ? "success" : "warning",
      );
    });
  };

  const upsertLanguage = (payload: LanguageUpsertPayload) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) => {
      const nextLanguage: LanguageRecord = {
        id: payload.id ?? createId("language"),
        code: payload.code.trim().toLowerCase(),
        label: payload.label.trim(),
        status: payload.status,
        completion: payload.completion,
        updatedAt: getNow(),
        sampleTranslations: payload.sampleTranslations ?? { dashboard: payload.label.trim() },
      };

      const exists = current.languages.some((item) => item.id === nextLanguage.id);
      const languages = exists
        ? current.languages.map((item) => (item.id === nextLanguage.id ? { ...item, ...nextLanguage } : item))
        : [nextLanguage, ...current.languages];

      return appendAuditLog(
        { ...current, languages },
        actorName,
        "Idiomas",
        exists ? "Atualizou idioma" : "Criou idioma",
        nextLanguage.label,
        "success",
      );
    });
  };

  const toggleLanguageStatus = (id: string) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) => {
      const target = current.languages.find((item) => item.id === id);

      if (!target) {
        return current;
      }

      const nextStatus = target.status === "active" ? "inactive" : "active";

      return appendAuditLog(
        {
          ...current,
          languages: current.languages.map((item) =>
            item.id === id ? { ...item, status: nextStatus, updatedAt: getNow() } : item,
          ),
        },
        actorName,
        "Idiomas",
        nextStatus === "active" ? "Ativou idioma" : "Desativou idioma",
        target.label,
        "warning",
      );
    });
  };

  const replyTicket = (id: string, message: string) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    setState((current) => {
      const target = current.tickets.find((item) => item.id === id);

      if (!target) {
        return current;
      }

      return appendAuditLog(
        {
          ...current,
          tickets: current.tickets.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "in_progress",
                  updatedAt: getNow(),
                  messages: [
                    {
                      id: createId("message"),
                      author: actorName,
                      role: "admin",
                      message: trimmedMessage,
                      createdAt: getNow(),
                    },
                    ...item.messages,
                  ],
                }
              : item,
          ),
        },
        actorName,
        "Suporte",
        "Respondeu ticket",
        target.subject,
        "success",
      );
    });
  };

  const updateTicketMeta = (
    id: string,
    patch: Partial<Pick<SupportTicket, "status" | "priority" | "assignedTo">>,
  ) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) => {
      const target = current.tickets.find((item) => item.id === id);

      if (!target) {
        return current;
      }

      return appendAuditLog(
        {
          ...current,
          tickets: current.tickets.map((item) =>
            item.id === id ? { ...item, ...patch, updatedAt: getNow() } : item,
          ),
        },
        actorName,
        "Suporte",
        "Atualizou ticket",
        target.subject,
        "warning",
      );
    });
  };

  const updateErrorStatus = (id: string, status: ErrorLog["status"]) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) => {
      const target = current.errorLogs.find((item) => item.id === id);

      if (!target) {
        return current;
      }

      return appendAuditLog(
        {
          ...current,
          errorLogs: current.errorLogs.map((item) => (item.id === id ? { ...item, status } : item)),
        },
        actorName,
        "Logs",
        "Atualizou erro do sistema",
        target.module,
        status === "resolved" ? "success" : "warning",
      );
    });
  };

  const updateSettings = (patch: Partial<SiteSettings>) => {
    if (!ensurePrimaryAdminWriteAccess()) {
      return;
    }

    setState((current) =>
      appendAuditLog(
        {
          ...current,
          settings: {
            ...current.settings,
            ...patch,
          },
        },
        actorName,
        "Configuracoes",
        "Atualizou configuracoes gerais",
        current.settings.siteName,
        "success",
      ),
    );
  };

  return (
    <AdminPanelContext.Provider
      value={{
        state,
        isLoading,
        storageMode,
        syncError,
        refreshState,
        upsertUser,
        setUserStatus,
        deleteUser,
        upsertPlayer,
        setPlayerStatus,
        upsertTeam,
        setTeamStatus,
        deleteTeam,
        upsertChampionship,
        toggleChampionshipRegistration,
        deleteChampionship,
        moderateImageRequest,
        upsertLanguage,
        toggleLanguageStatus,
        replyTicket,
        updateTicketMeta,
        updateErrorStatus,
        updateSettings,
      }}
    >
      {children}
    </AdminPanelContext.Provider>
  );
}

export function useAdminPanel() {
  const context = useContext(AdminPanelContext);

  if (!context) {
    throw new Error("useAdminPanel deve ser usado dentro de AdminPanelProvider.");
  }

  return context;
}
