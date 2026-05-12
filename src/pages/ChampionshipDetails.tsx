import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  ListChecks,
  Medal,
  RefreshCcw,
  Save,
  Settings2,
  Share2,
  ShieldAlert,
  Swords,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { AdminPageHeader } from "@/admin/components/AdminPageHeader";
import {
  TeamCrest,
  TeamFlagBadge,
} from "@/components/championship/TeamIdentity";
import { TeamPhotoBadge } from "@/components/profile/TeamPhotoBadge";
import {
  ChallengeModal,
} from "@/components/championship/ChallengeModal";
import {
  TeamProfileDialog,
} from "@/components/championship/TeamProfileDialog";
import {
  UltimateTeamChampionshipShell,
  UltimateTeamGroupDashboard,
  type UltimateTeamMatchEntry,
  type UltimateTeamStandingsEntry,
} from "@/components/championship/UltimateTeamDashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateBracket, updateBracketMatch, validateBracketGeneration } from "@/lib/championship-bracket";
import { buildChampionshipRankingByTeamId } from "@/lib/championship-ranking";
import { buildChampionshipTeamProfileLookup } from "@/lib/championship-team-profile";
import { findPendingFriendlyChallenge } from "@/lib/friendly-challenges";
import {
  readStoredPlayerTeamPhoto,
} from "@/lib/player-profile-store";
import {
  hasChampionshipTable,
  syncApprovedParticipantsToChampionshipWorkspace,
  validateChampionshipTableGeneration,
} from "@/lib/championship-table";
import {
  computeGroupStandings,
  getChampionshipProgressSummary,
  getQualifiedTeams,
  rebuildGroupsAndSchedule,
  renameTeam,
  updateGroupMatch,
  updateScoringSettings,
  updateTeamAdjustment,
  updateTeamProfile,
} from "@/lib/championship-runtime";
import {
  formatChampionshipWorkspaceStoreError,
  getChampionshipWorkspaceStorageMode,
  loadChampionshipWorkspaceRecord,
  readStoredChampionshipWorkspaceRecord,
  saveChampionshipWorkspaceRecord,
} from "@/lib/championship-workspace-store";
import {
  buildChampionshipDescription,
  formatChampionshipAvailableSlots,
  getChampionshipRegistrationByPlayer,
  getChampionshipRegistrationStatusLabel,
  buildChampionshipRules,
  formatChampionshipDateRange,
  getChampionshipStatusLabel,
  getFormatOption,
} from "@/lib/championships";
import {
  formatChampionshipStoreError,
  readChampionshipById,
} from "@/lib/championship-store";
import { toast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useChampionships } from "@/contexts/ChampionshipContext";
import { useFriendlyChallenges } from "@/contexts/FriendlyChallengesContext";
import { usePlayerAuth } from "@/contexts/PlayerAuthContext";
import { toSafeText, toSafeUpperText } from "@/lib/utils";
import type {
  ChampionshipConfiguration,
  ChampionshipFormValues,
  ChampionshipRecord,
  ChampionshipRegistrationRequest,
  ChampionshipRegistrationStatus,
} from "@/types/championship";
import type {
  BracketMatchUpdateInput,
  ChampionshipBracketMatch,
  ChampionshipGroup,
  ChampionshipGroupMatch,
  ChampionshipTeam,
  ChampionshipTeamProfile,
  ChampionshipWorkspaceRecord,
  GroupMatchUpdateInput,
} from "@/types/championship-runtime";

const inputClassName =
  "h-11 w-full rounded-xl border border-border bg-background/70 px-4 text-sm text-foreground outline-none transition-colors focus:border-primary/50";
const textareaClassName =
  "min-h-28 w-full rounded-xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50";

function toChampionshipFormValues(
  championship: ChampionshipRecord,
  configuration: ChampionshipConfiguration,
): ChampionshipFormValues {
  return {
    name: championship.name,
    description: buildChampionshipDescription(configuration),
    startDate: championship.startDate,
    endDate: championship.endDate,
    teamCount: championship.teamCount,
    rules: buildChampionshipRules(configuration),
    status: championship.status,
    configuration,
  };
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function formatMatchDateTime(value: string | null) {
  if (!value) {
    return "A definir";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "A definir";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toDisplayText(value: unknown, fallback = "A definir") {
  return toSafeText(value, fallback);
}

function getTeamName(teams: ChampionshipTeam[], teamId: string | null) {
  if (!teamId) {
    return "A definir";
  }

  return toDisplayText(teams.find((team) => team.id === teamId)?.name, "A definir");
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function getRegistrationBadgeClassName(status: ChampionshipRegistrationStatus) {
  if (status === "approved") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  }

  if (status === "rejected") {
    return "border-red-500/20 bg-red-500/10 text-red-100";
  }

  return "border-amber-500/20 bg-amber-500/10 text-amber-100";
}

function getRegistrationStatusIcon(status: ChampionshipRegistrationStatus) {
  if (status === "approved") {
    return CheckCircle2;
  }

  if (status === "rejected") {
    return XCircle;
  }

  return CalendarClock;
}

function getRegistrationActionLabel(
  championship: ChampionshipRecord,
  request: ChampionshipRegistrationRequest | null,
) {
  if (request) {
    return getChampionshipRegistrationStatusLabel(request.status);
  }

  if (championship.status === "REGISTRATION") {
    return "Participar";
  }

  if (championship.status === "STARTED") {
    return "Acompanhar disputa";
  }

  return "Ver regulamento";
}

function formatCoachHandle(
  request: Pick<ChampionshipRegistrationRequest, "playerName" | "playerEmail"> | null,
  fallbackSeed: number,
) {
  if (request?.playerEmail?.includes("@")) {
    return `@${request.playerEmail.split("@")[0]}`;
  }

  if (request?.playerName?.trim()) {
    return request.playerName.trim();
  }

  return `Tecnico seed ${String(fallbackSeed).padStart(2, "0")}`;
}

function calculateEfficiency(points: number, played: number) {
  if (played <= 0) {
    return 0;
  }

  return Math.round((points / (played * 3)) * 100);
}

function buildPublicTeamMetaMap(
  teams: ChampionshipTeam[],
  registrationRequests: ChampionshipRegistrationRequest[],
) {
  const approvedRequests = registrationRequests.filter((request) => request.status === "approved");
  const requestsByPlayerId = new Map(
    approvedRequests
      .filter((request) => request.playerId)
      .map((request) => [request.playerId, request] as const),
  );
  const requestsByEmail = new Map(
    approvedRequests
      .filter((request) => request.playerEmail.trim())
      .map((request) => [request.playerEmail.trim().toLowerCase(), request] as const),
  );

  return new Map(
    [...teams]
      .sort((left, right) => left.seed - right.seed)
      .map((team) => {
        const approvedRequest =
          (team.playerId ? requestsByPlayerId.get(team.playerId) : null) ??
          (team.playerEmail ? requestsByEmail.get(team.playerEmail.trim().toLowerCase()) : null) ??
          null;
        const captainName = team.captainName?.trim() || approvedRequest?.playerName?.trim() || null;
        const roster = team.roster.length > 0 ? team.roster : captainName ? [captainName] : [];

        return [
          team.id,
          {
            handle: approvedRequest
              ? formatCoachHandle(approvedRequest, team.seed)
              : captainName ?? `Tecnico seed ${String(team.seed).padStart(2, "0")}`,
            crestLabel: team.name,
            captainName,
            captainEmail: team.playerEmail ?? approvedRequest?.playerEmail ?? null,
            flagUrl: team.flagUrl,
            teamPhotoUrl: readStoredPlayerTeamPhoto(
              team.playerEmail ?? approvedRequest?.playerEmail ?? null,
            ),
            roster,
          },
        ] as const;
      }),
  );
}

interface ChampionshipWorkspacePageProps {
  mode?: "public" | "admin";
}

export function ChampionshipWorkspacePage({
  mode = "public",
}: ChampionshipWorkspacePageProps) {
  const { championshipId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = mode === "admin";
  const isParticipationAction = searchParams.get("acao") === "participar";
  const shouldUseLightParticipationView = !isAdmin && isParticipationAction;
  const { displayName: adminDisplayName } = useAdminAuth();
  const {
    isLoading: areChampionshipsLoading,
    getChampionshipById,
    generateChampionshipTable,
    reviewChampionshipRegistration,
    submitChampionshipRegistration,
    updateChampionship,
  } = useChampionships();
  const {
    isAuthenticated: isPlayerAuthenticated,
    loginName,
    playerEmail,
    session: playerSession,
  } = usePlayerAuth();
  const contextChampionship = championshipId ? getChampionshipById(championshipId) : undefined;
  const [directChampionship, setDirectChampionship] = useState<ChampionshipRecord | null>(null);
  const [isDirectChampionshipLoading, setIsDirectChampionshipLoading] = useState(false);
  const [directChampionshipError, setDirectChampionshipError] = useState<string | null>(null);
  const championship = contextChampionship ?? directChampionship ?? undefined;
  const initialCachedWorkspace = championship ? readStoredChampionshipWorkspaceRecord(championship) : null;
  const [workspace, setWorkspace] = useState<ChampionshipWorkspaceRecord | null>(initialCachedWorkspace);
  const workspaceChampionshipIdRef = useRef<string | null>(championship?.id ?? null);
  const tabDefaultKeyRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(championship && !initialCachedWorkspace));
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmittingParticipation, setIsSubmittingParticipation] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [workspaceReloadToken, setWorkspaceReloadToken] = useState(0);
  const [teamNameDrafts, setTeamNameDrafts] = useState<Record<string, string>>({});
  const [adjustmentDrafts, setAdjustmentDrafts] = useState<Record<string, number>>({});
  const [scoringDraft, setScoringDraft] = useState({ winPoints: 3, drawPoints: 1, lossPoints: 0 });
  const [finalConfigDraft, setFinalConfigDraft] = useState<ChampionshipConfiguration | null>(
    championship?.configuration ?? null,
  );
  const [editingGroupMatch, setEditingGroupMatch] = useState<ChampionshipGroupMatch | null>(null);
  const [editingBracketMatch, setEditingBracketMatch] = useState<ChampionshipBracketMatch | null>(null);
  const [selectedGroupRounds, setSelectedGroupRounds] = useState<Record<string, number>>({});
  const [activeChampionshipTab, setActiveChampionshipTab] = useState("groups");
  const [selectedPublicGroupId, setSelectedPublicGroupId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [isSubmittingChallenge, setIsSubmittingChallenge] = useState(false);
  const [isParticipationDialogOpen, setIsParticipationDialogOpen] = useState(
    () => isParticipationAction,
  );
  const {
    challenges: friendlyChallenges,
    createChallenge,
    isLoading: isLoadingFriendlyChallenges,
  } = useFriendlyChallenges();
  const storageMode = getChampionshipWorkspaceStorageMode();
  const playerRegistrationRequest = useMemo(
    () => getChampionshipRegistrationByPlayer(championship ?? { registrationRequests: [] }, playerSession?.id),
    [championship, playerSession?.id],
  );
  const registrationActionLabel = championship
    ? getRegistrationActionLabel(championship, playerRegistrationRequest)
    : "Participar";
  const shouldDisableRegistrationAction = Boolean(
    championship &&
      isPlayerAuthenticated &&
      championship.status === "REGISTRATION" &&
      playerRegistrationRequest,
  );
  const pendingRegistrationRequests = useMemo(
    () => championship?.registrationRequests.filter((request) => request.status === "pending") ?? [],
    [championship],
  );
  const reviewedRegistrationRequests = useMemo(
    () =>
      championship?.registrationRequests.filter((request) => request.status !== "pending") ?? [],
    [championship],
  );
  const approvedRegistrationRequests = useMemo(
    () =>
      championship?.registrationRequests.filter((request) => request.status === "approved") ?? [],
    [championship],
  );

  useEffect(() => {
    if (!shouldUseLightParticipationView || !championshipId) {
      setDirectChampionship(null);
      setDirectChampionshipError(null);
      setIsDirectChampionshipLoading(false);
      return;
    }

    if (contextChampionship) {
      setDirectChampionship(null);
      setDirectChampionshipError(null);
      setIsDirectChampionshipLoading(false);
      return;
    }

    let isActive = true;

    setIsDirectChampionshipLoading(true);
    setDirectChampionshipError(null);

    void readChampionshipById(championshipId)
      .then((record) => {
        if (!isActive) {
          return;
        }

        setDirectChampionship(record);
        setDirectChampionshipError(null);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setDirectChampionship(null);
        setDirectChampionshipError(formatChampionshipStoreError(error));
      })
      .finally(() => {
        if (isActive) {
          setIsDirectChampionshipLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [championshipId, contextChampionship?.id, shouldUseLightParticipationView, workspaceReloadToken]);

  useEffect(() => {
    if (!championship) {
      workspaceChampionshipIdRef.current = null;
      setWorkspace(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    if (shouldUseLightParticipationView) {
      workspaceChampionshipIdRef.current = null;
      setWorkspace(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    const cachedWorkspace = readStoredChampionshipWorkspaceRecord(championship);
    const isSameChampionship = workspaceChampionshipIdRef.current === championship.id;

    if (!isSameChampionship) {
      setWorkspace(cachedWorkspace);
      setIsLoading(!cachedWorkspace);
    }

    setErrorMessage(null);

    let isActive = true;

    const loadWorkspace = async () => {
      try {
        const nextWorkspace = await loadChampionshipWorkspaceRecord(championship);

        if (!isActive) {
          return;
        }

        const syncedWorkspace = syncApprovedParticipantsToChampionshipWorkspace(
          nextWorkspace,
          championship,
          championship.registrationRequests,
        );

        workspaceChampionshipIdRef.current = championship.id;
        setWorkspace(syncedWorkspace);
        setErrorMessage(null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (!isSameChampionship && !cachedWorkspace) {
          setWorkspace(null);
        }

        setErrorMessage(formatChampionshipWorkspaceStoreError(error));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadWorkspace();

    return () => {
      isActive = false;
    };
  }, [championship?.id, championship?.updatedAt, shouldUseLightParticipationView, workspaceReloadToken]);

  useEffect(() => {
    if (!workspace) {
      return;
    }

    setTeamNameDrafts(
      Object.fromEntries(workspace.teams.map((team) => [team.id, team.name])),
    );
    setAdjustmentDrafts(
      Object.fromEntries(workspace.teams.map((team) => [team.id, team.pointsAdjustment])),
    );
    setScoringDraft(workspace.scoring);
  }, [workspace]);

  useEffect(() => {
    setFinalConfigDraft(championship?.configuration ?? null);
  }, [championship]);

  useEffect(() => {
    setIsParticipationDialogOpen(isParticipationAction);
  }, [isParticipationAction]);

  const openParticipationDialog = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("acao", "participar");
    setSearchParams(nextParams, { replace: true });
  };

  const closeParticipationDialog = () => {
    if (shouldUseLightParticipationView) {
      navigate("/campeonatos", { replace: true });
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("acao");
    setSearchParams(nextParams, { replace: true });
  };

  const standings = useMemo(() => (workspace ? computeGroupStandings(workspace) : []), [workspace]);
  const summary = useMemo(
    () => (workspace && championship ? getChampionshipProgressSummary(workspace, championship) : null),
    [championship, workspace],
  );
  const qualifiedTeams = useMemo(
    () => (workspace && championship ? getQualifiedTeams(workspace, championship) : []),
    [championship, workspace],
  );

  const persistWorkspace = async (nextWorkspace: ChampionshipWorkspaceRecord) => {
    if (!championship) {
      throw new Error("Campeonato nao encontrado.");
    }

    setIsSaving(true);

    try {
      const savedWorkspace = await saveChampionshipWorkspaceRecord(championship, nextWorkspace);
      setWorkspace(savedWorkspace);
      setErrorMessage(null);
      return savedWorkspace;
    } catch (error) {
      const nextErrorMessage = formatChampionshipWorkspaceStoreError(error);
      setErrorMessage(nextErrorMessage);
      throw new Error(nextErrorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const saveWorkspace = async (nextWorkspace: ChampionshipWorkspaceRecord, successDescription: string) => {
    try {
      await persistWorkspace(nextWorkspace);
      toast({
        title: "Campeonato atualizado",
        description: successDescription,
      });
    } catch {
      // O estado de erro ja foi atualizado dentro de persistWorkspace.
    }
  };

  const saveChampionshipConfiguration = async () => {
    if (!championship || !finalConfigDraft) {
      return;
    }

    setIsSaving(true);

    try {
      await updateChampionship(championship.id, toChampionshipFormValues(championship, finalConfigDraft));
      toast({
        title: "Configuracoes salvas",
        description: "A fase final e as regras do campeonato foram atualizadas.",
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel salvar as configuracoes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitParticipationRequest = async () => {
    if (!championship || !playerSession || !playerEmail) {
      return;
    }

    if (playerSession.provider !== "supabase") {
      toast({
        title: "Login oficial necessario",
        description:
          "Para participar e aparecer para o admin, entre com uma conta criada no site antes de enviar o pedido.",
      });
      return;
    }

    setIsSubmittingParticipation(true);

    try {
      await submitChampionshipRegistration({
        championshipId: championship.id,
        playerId: playerSession.id,
        playerName: loginName?.trim() || playerSession.displayName,
        playerEmail,
      });
      toast({
        title: "Pedido enviado",
        description: "A solicitacao foi encaminhada para o administrador do campeonato.",
      });
    } catch (error) {
      toast({
        title: "Nao foi possivel enviar o pedido",
        description:
          error instanceof Error ? error.message : "Tente novamente em alguns instantes.",
      });
    } finally {
      setIsSubmittingParticipation(false);
    }
  };

  const handleReviewParticipationRequest = async (
    requestId: string,
    status: Extract<ChampionshipRegistrationStatus, "approved" | "rejected">,
  ) => {
    if (!championship) {
      return;
    }

    setReviewingRequestId(requestId);

    try {
      const request = championship.registrationRequests.find((item) => item.id === requestId) ?? null;
      const updatedChampionship = await reviewChampionshipRegistration({
        championshipId: championship.id,
        requestId,
        status,
        reviewedBy: adminDisplayName ?? "Administrador",
      });

      if (status === "approved" && request) {
        setWorkspace((currentWorkspace) => {
          if (!currentWorkspace) {
            return currentWorkspace;
          }

          return syncApprovedParticipantsToChampionshipWorkspace(
            currentWorkspace,
            updatedChampionship,
            updatedChampionship.registrationRequests,
          );
        });
        setErrorMessage(null);
      }

      toast({
        title: status === "approved" ? "Solicitacao aprovada" : "Solicitacao recusada",
        description:
          status === "approved"
            ? "O jogador agora aparece como participante aprovado deste campeonato."
            : "O pedido foi recusado e o status ja foi atualizado para o jogador.",
      });
    } catch (error) {
      toast({
        title: "Nao foi possivel revisar a solicitacao",
        description:
          error instanceof Error ? error.message : "Tente novamente em alguns instantes.",
      });
    } finally {
      setReviewingRequestId(null);
    }
  };

  const handleSaveTeamNames = async () => {
    let nextWorkspace = workspace;

    workspace.teams.forEach((team) => {
      nextWorkspace = renameTeam(nextWorkspace, team.id, teamNameDrafts[team.id] ?? team.name);
    });

    await saveWorkspace(nextWorkspace, "Os nomes das equipes foram salvos.");
  };

  const handleSaveScoringAdjustments = async () => {
    let nextWorkspace = updateScoringSettings(workspace, scoringDraft);

    workspace.teams.forEach((team) => {
      nextWorkspace = updateTeamAdjustment(
        nextWorkspace,
        team.id,
        Number(adjustmentDrafts[team.id] ?? team.pointsAdjustment),
      );
    });

    await saveWorkspace(nextWorkspace, "Os ajustes de pontuacao foram atualizados.");
  };

  const handleRebuildGroups = async () => {
    await saveWorkspace(
      rebuildGroupsAndSchedule(workspace, championship),
      "Os grupos e a grade de partidas foram recriados.",
    );
  };

  const handleGenerateTable = async () => {
    if (!championship) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await generateChampionshipTable(championship.id);
      setWorkspace(result.workspace);
      setErrorMessage(null);
      toast({
        title: "Tabela gerada",
        description: "Grupos, rodadas e confrontos foram criados somente agora.",
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Nao foi possivel gerar a tabela.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGroupMatch = async (patch: GroupMatchUpdateInput) => {
    if (!editingGroupMatch) {
      return;
    }

    await saveWorkspace(
      updateGroupMatch(workspace, championship, editingGroupMatch.id, patch),
      "A partida da fase de grupos foi atualizada.",
    );
    setEditingGroupMatch(null);
  };

  const handleGenerateBracket = async () => {
    await saveWorkspace(
      generateBracket(workspace, championship),
      "O chaveamento da fase final foi gerado automaticamente.",
    );
  };

  const handleSaveBracketMatch = async (patch: BracketMatchUpdateInput) => {
    if (!editingBracketMatch) {
      return;
    }

    await saveWorkspace(
      updateBracketMatch(workspace, championship, editingBracketMatch.id, patch),
      "O confronto do mata-mata foi atualizado e o bracket foi recalculado.",
    );
    setEditingBracketMatch(null);
  };

  const handleSaveTeamProfile = async (payload: {
    teamId: string;
    captainName: string | null;
    roster: string[];
    flagUrl: string | null;
  }) => {
    if (!workspace) {
      throw new Error("Workspace do campeonato indisponivel.");
    }

    if (!selectedTeamCanEdit || (ownedTeamId && !isAdmin && payload.teamId !== ownedTeamId)) {
      throw new Error("Voce nao tem permissao para editar este time.");
    }

    const nextWorkspace = updateTeamProfile(workspace, payload.teamId, {
      captainName: payload.captainName,
      roster: payload.roster,
      flagUrl: payload.flagUrl,
    });

    await persistWorkspace(nextWorkspace);
    toast({
      title: "Perfil atualizado",
      description: "As informacoes do time foram salvas com sucesso.",
    });
  };

  const handleSubmitFriendlyChallenge = async (payload: {
    date: string;
    time: string;
    message: string | null;
  }) => {
    if (!championship || !workspace) {
      throw new Error("Campeonato indisponivel para criar o amistoso.");
    }

    if (!selectedTeamProfile) {
      throw new Error("Selecione um adversario valido para enviar o desafio.");
    }

    const fromTeam = ownedTeamId ? workspace.teams.find((team) => team.id === ownedTeamId) ?? null : null;

    if (!fromTeam) {
      throw new Error("Seu time precisa estar vinculado a este campeonato para enviar amistosos.");
    }

    setIsSubmittingChallenge(true);

    try {
      await createChallenge({
        championshipId: championship.id,
        championshipName: championship.name,
        fromTeamId: fromTeam.id,
        toTeamId: selectedTeamProfile.team.id,
        fromPlayerId: fromTeam.playerId,
        fromPlayerEmail: fromTeam.playerEmail,
        toPlayerId: selectedTeamProfile.team.playerId,
        toPlayerEmail: selectedTeamProfile.team.playerEmail,
        fromTeamName: fromTeam.name,
        toTeamName: selectedTeamProfile.team.name,
        fromFlagUrl: fromTeam.flagUrl,
        toFlagUrl: selectedTeamProfile.team.flagUrl,
        date: payload.date,
        time: payload.time,
        message: payload.message,
      });
      toast({
        title: "Desafio enviado com sucesso",
        description: `${fromTeam.name} desafiou ${selectedTeamProfile.team.name} para um amistoso.`,
      });
      setIsChallengeModalOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel enviar o desafio agora.";

      toast({
        title: "Nao foi possivel enviar o desafio",
        description: message,
      });
      throw new Error(message);
    } finally {
      setIsSubmittingChallenge(false);
    }
  };

  const groupMatchesByGroup = useMemo(
    () =>
      workspace
        ? workspace.groups.map((group) => ({
            group,
            rounds: Array.from(
              workspace.groupMatches
                .filter((match) => match.groupId === group.id)
                .reduce((registry, match) => {
                  const currentRound = registry.get(match.roundNumber) ?? [];
                  currentRound.push(match);
                  registry.set(match.roundNumber, currentRound);
                  return registry;
                }, new Map<number, ChampionshipGroupMatch[]>()),
            ).sort((left, right) => left[0] - right[0]),
          }))
        : [],
    [workspace],
  );
  const bracketColumns = workspace
    ? workspace.bracket.rounds
        .filter((round) => round.stageKey !== "third-place")
        .map((round) => ({
          round,
          matches: workspace.bracket.matches.filter((match) => match.roundId === round.id),
        }))
    : [];
  const thirdPlaceMatch = workspace
    ? workspace.bracket.matches.find((match) => match.stageKey === "third-place") ?? null
    : null;
  const bracketValidationMessage =
    workspace && championship ? validateBracketGeneration(workspace, championship) : null;
  const tableAlreadyGenerated = workspace ? hasChampionshipTable(workspace) : false;
  const tableGenerationValidationMessage =
    workspace && championship ? validateChampionshipTableGeneration(workspace, championship) : null;
  const championshipTeamCount = championship?.teamCount ?? workspace?.teams.length ?? 0;
  const participantsProgressLabel = workspace
    ? `${workspace.teams.length}/${championshipTeamCount}`
    : `0/${championshipTeamCount}`;
  const championshipFormat = championship?.configuration.format ?? "groups-knockout";
  const isLeagueFormat =
    championshipFormat === "points-league" || championshipFormat === "points-league-knockout";
  const isKnockoutOnlyFormat = championshipFormat === "knockout";
  const isCrossBracketFormat = championshipFormat === "cross-brackets";
  const classificationTabLabel = isKnockoutOnlyFormat
    ? "Seeds"
    : isLeagueFormat
      ? "Liga"
      : isCrossBracketFormat
        ? "Chaves"
        : "Grupos";
  const defaultChampionshipTab =
    isKnockoutOnlyFormat && tableAlreadyGenerated ? "finals" : "groups";
  const participantsCardTitle = isKnockoutOnlyFormat
    ? "Participantes do mata-mata"
    : isLeagueFormat
      ? "Participantes e tabela corrida"
      : isCrossBracketFormat
        ? "Participantes e chaves"
        : "Participantes e fase de grupos";
  const participantsCardDescription = isKnockoutOnlyFormat
    ? "Organize os seeds de entrada antes de montar o bracket eliminatorio."
    : isLeagueFormat
      ? "Renomeie as equipes, acompanhe a tabela geral e navegue rodada por rodada."
      : "Renomeie as equipes, acompanhe a classificacao por grupo e edite os resultados por rodada.";
  const backPath = isAdmin ? "/admin/campeonatos" : "/campeonatos";
  const canOpenRegistration = championship?.status === "REGISTRATION";
  const renderShell = (content: ReactNode) =>
    isAdmin ? <>{content}</> : <PageShell>{content}</PageShell>;

  const handleShareChampionship = async () => {
    if (!championship) {
      return;
    }

    const publicPath = `/campeonatos/${championship.id}`;
    const publicUrl =
      typeof window !== "undefined"
        ? new URL(publicPath, window.location.origin).toString()
        : publicPath;
    const shareData = {
      title: championship.name,
      text: `Entre no campeonato ${championship.name} do Grupo de Campeoes.`,
      url: publicUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await copyTextToClipboard(publicUrl);
        toast({
          title: "Link copiado",
          description: "O link publico do campeonato foi copiado para compartilhar.",
        });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      await copyTextToClipboard(publicUrl);
      toast({
        title: "Link copiado",
        description: "Nao abriu o compartilhamento nativo, entao copiamos o link.",
      });
    }
  };

  useEffect(() => {
    if (!championship?.id || !workspace) {
      return;
    }

    const tabDefaultKey = `${championship.id}:${defaultChampionshipTab}`;

    if (tabDefaultKeyRef.current === tabDefaultKey) {
      return;
    }

    tabDefaultKeyRef.current = tabDefaultKey;
    setActiveChampionshipTab(defaultChampionshipTab);
  }, [championship?.id, defaultChampionshipTab, workspace]);

  useEffect(() => {
    setSelectedGroupRounds((current) => {
      const next: Record<string, number> = {};

      groupMatchesByGroup.forEach(({ group, rounds }) => {
        if (rounds.length === 0) {
          return;
        }

        const availableRounds = rounds.map(([roundNumber]) => roundNumber);
        const currentRound = current[group.id];
        next[group.id] =
          currentRound && availableRounds.includes(currentRound)
            ? currentRound
            : availableRounds[0];
      });

      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(next);
      const sameKeys =
        currentKeys.length === nextKeys.length &&
        nextKeys.every((key) => Object.prototype.hasOwnProperty.call(current, key));
      const sameValues = nextKeys.every((key) => current[key] === next[key]);

      return sameKeys && sameValues ? current : next;
    });
  }, [groupMatchesByGroup]);

  useEffect(() => {
    if (groupMatchesByGroup.length === 0) {
      setSelectedPublicGroupId(null);
      return;
    }

    setSelectedPublicGroupId((current) =>
      current && groupMatchesByGroup.some(({ group }) => group.id === current)
        ? current
        : groupMatchesByGroup[0].group.id,
    );
  }, [groupMatchesByGroup]);

  useEffect(() => {
    if (!workspace || !selectedTeamId) {
      return;
    }

    if (!workspace.teams.some((team) => team.id === selectedTeamId)) {
      setSelectedTeamId(null);
    }
  }, [selectedTeamId, workspace]);

  useEffect(() => {
    if (!selectedTeamId) {
      setIsChallengeModalOpen(false);
    }
  }, [selectedTeamId]);

  const publicTeamMetaById = useMemo(
    () =>
      championship && workspace
        ? buildPublicTeamMetaMap(workspace.teams, championship.registrationRequests)
        : new Map<
            string,
            {
              handle: string;
              crestLabel: string;
              captainName: string | null;
              captainEmail: string | null;
              flagUrl: string | null;
              teamPhotoUrl: string | null;
              roster: string[];
            }
          >(),
    [championship, workspace],
  );
  const teamsById = useMemo(
    () => new Map((workspace?.teams ?? []).map((team) => [team.id, team] as const)),
    [workspace?.teams],
  );
  const ownedTeamId = useMemo(() => {
    if (!workspace) {
      return null;
    }

    const normalizedPlayerEmail = playerEmail?.trim().toLowerCase() ?? null;

    return (
      workspace.teams.find(
        (team) =>
          (playerSession?.id && team.playerId === playerSession.id) ||
          (normalizedPlayerEmail && team.playerEmail?.trim().toLowerCase() === normalizedPlayerEmail),
      )?.id ?? null
    );
  }, [playerEmail, playerSession?.id, workspace]);
  const ownedTeam = ownedTeamId ? teamsById.get(ownedTeamId) ?? null : null;
  const rankingByTeamId = useMemo(() => {
    if (!championship || !workspace) {
      return new Map();
    }

    return buildChampionshipRankingByTeamId({ championship, workspace });
  }, [championship, workspace]);
  const teamProfilesById = useMemo(() => {
    if (!workspace) {
      return new Map<string, ChampionshipTeamProfile>();
    }

    const baseProfiles = buildChampionshipTeamProfileLookup(workspace);

    return new Map(
      Array.from(baseProfiles.entries()).map(([teamId, profile]) => {
        const meta = publicTeamMetaById.get(teamId);
        const ranking = rankingByTeamId.get(teamId);

        return [
          teamId,
          {
            ...profile,
            teamPhotoUrl: meta?.teamPhotoUrl ?? profile.teamPhotoUrl ?? null,
            captainName: profile.captainName ?? meta?.captainName ?? null,
            roster: profile.roster.length > 0 ? profile.roster : meta?.roster ?? [],
            rankingPoints: ranking?.rankingPoints ?? 0,
            matchRankingPoints: ranking?.matchRankingPoints ?? 0,
            achievementRankingPoints: ranking?.achievementRankingPoints ?? 0,
            titlesCount: ranking?.titlesCount ?? 0,
            viceTitlesCount: ranking?.viceTitlesCount ?? 0,
            thirdPlacesCount: ranking?.thirdPlacesCount ?? 0,
          } satisfies ChampionshipTeamProfile,
        ] as const;
      }),
    );
  }, [publicTeamMetaById, rankingByTeamId, workspace]);
  const selectedTeamProfile = selectedTeamId ? teamProfilesById.get(selectedTeamId) ?? null : null;
  const selectedTeamCanEdit = Boolean(isAdmin || (selectedTeamId && selectedTeamId === ownedTeamId));
  const selectedPendingFriendlyChallenge = useMemo(() => {
    if (!championship || !selectedTeamProfile || !ownedTeam) {
      return null;
    }

    return findPendingFriendlyChallenge(friendlyChallenges, {
      championshipId: championship.id,
      teamAId: ownedTeam.id,
      teamBId: selectedTeamProfile.team.id,
    });
  }, [championship, friendlyChallenges, ownedTeam, selectedTeamProfile]);
  const selectedTeamChallengeAction = useMemo(() => {
    if (isAdmin || !selectedTeamProfile || selectedTeamProfile.team.id === ownedTeamId) {
      return null;
    }

    if (!isPlayerAuthenticated) {
      return {
        visible: true,
        disabled: true,
        isLoading: false,
        isPending: false,
        helperText: "Entre com sua conta para desafiar este time para um amistoso.",
        onOpen: () => {
          toast({
            title: "Entre para desafiar",
            description: "Apenas usuarios logados podem enviar desafios amistosos.",
          });
        },
      };
    }

    if (!ownedTeam) {
      return {
        visible: true,
        disabled: true,
        isLoading: false,
        isPending: false,
        helperText: "Seu time precisa estar vinculado a este campeonato para enviar amistosos.",
        onOpen: () => {
          toast({
            title: "Time nao encontrado",
            description:
              "Seu time precisa estar vinculado a este campeonato para enviar amistosos.",
          });
        },
      };
    }

    if (isLoadingFriendlyChallenges) {
      return {
        visible: true,
        disabled: true,
        isLoading: true,
        isPending: false,
        helperText: "Verificando se ja existe um amistoso pendente com este adversario.",
        onOpen: () => undefined,
      };
    }

    if (selectedPendingFriendlyChallenge) {
      return {
        visible: true,
        disabled: true,
        isLoading: false,
        isPending: true,
        helperText: "Ja existe um desafio pendente com este time.",
        onOpen: () => undefined,
      };
    }

    return {
      visible: true,
      disabled: false,
      isLoading: false,
      isPending: false,
      helperText: "Envie uma proposta rapida com data, horario e uma mensagem opcional.",
      onOpen: () => setIsChallengeModalOpen(true),
    };
  }, [
    isAdmin,
    isLoadingFriendlyChallenges,
    isPlayerAuthenticated,
    ownedTeam,
    ownedTeamId,
    selectedPendingFriendlyChallenge,
    selectedTeamProfile,
  ]);
  const openTeamProfile = (teamId: string | null) => {
    if (!teamId) {
      return;
    }

    setSelectedTeamId(teamId);
  };
  const selectedPublicGroupEntry = useMemo(() => {
    if (isLeagueFormat || isKnockoutOnlyFormat) {
      return groupMatchesByGroup[0] ?? null;
    }

    return groupMatchesByGroup.find(({ group }) => group.id === selectedPublicGroupId) ?? groupMatchesByGroup[0] ?? null;
  }, [groupMatchesByGroup, isKnockoutOnlyFormat, isLeagueFormat, selectedPublicGroupId]);
  const publicStandingsEntries = useMemo<UltimateTeamStandingsEntry[]>(() => {
    if (!selectedPublicGroupEntry) {
      return [];
    }

    const groupIndex = groupMatchesByGroup.findIndex(
      ({ group }) => group.id === selectedPublicGroupEntry.group.id,
    );
    const selectedRows =
      groupIndex >= 0 ? standings[groupIndex]?.rows ?? [] : standings[0]?.rows ?? [];

    return selectedRows.map((row) => {
      const teamSeed = workspace?.teams.find((team) => team.id === row.teamId)?.seed ?? row.position;

      return {
        id: row.teamId,
        position: row.position,
        team: {
          id: row.teamId,
          name: row.teamName,
          meta:
            publicTeamMetaById.get(row.teamId)?.handle ??
            `Tecnico seed ${String(teamSeed).padStart(2, "0")}`,
          crestLabel: publicTeamMetaById.get(row.teamId)?.crestLabel ?? row.teamName,
          flagUrl: publicTeamMetaById.get(row.teamId)?.flagUrl ?? teamsById.get(row.teamId)?.flagUrl ?? null,
          teamPhotoUrl: publicTeamMetaById.get(row.teamId)?.teamPhotoUrl ?? null,
        },
        points: row.points,
        played: row.played,
        wins: row.wins,
        draws: row.draws,
        losses: row.losses,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDifference: row.goalDifference,
        efficiency: calculateEfficiency(row.points, row.played),
      };
    });
  }, [groupMatchesByGroup, publicTeamMetaById, selectedPublicGroupEntry, standings, teamsById, workspace?.teams]);
  const publicRoundMatches = useMemo<UltimateTeamMatchEntry[]>(() => {
    if (!selectedPublicGroupEntry) {
      return [];
    }

    const selectedRoundNumber =
      selectedGroupRounds[selectedPublicGroupEntry.group.id] ??
      selectedPublicGroupEntry.rounds[0]?.[0] ??
      1;
    const selectedRoundEntry =
      selectedPublicGroupEntry.rounds.find(([roundNumber]) => roundNumber === selectedRoundNumber) ??
      selectedPublicGroupEntry.rounds[0] ??
      [selectedRoundNumber, []];
    const [, matches] = selectedRoundEntry;

    return matches.map((match) => {
      const homeMeta = publicTeamMetaById.get(match.homeTeamId);
      const awayMeta = publicTeamMetaById.get(match.awayTeamId);

      return {
        id: match.id,
        home: {
          id: match.homeTeamId,
          name: getTeamName(workspace?.teams ?? [], match.homeTeamId),
          meta: homeMeta?.handle,
          crestLabel: homeMeta?.crestLabel,
          flagUrl: homeMeta?.flagUrl ?? teamsById.get(match.homeTeamId)?.flagUrl ?? null,
          teamPhotoUrl: homeMeta?.teamPhotoUrl ?? null,
        },
        away: {
          id: match.awayTeamId,
          name: getTeamName(workspace?.teams ?? [], match.awayTeamId),
          meta: awayMeta?.handle,
          crestLabel: awayMeta?.crestLabel,
          flagUrl: awayMeta?.flagUrl ?? teamsById.get(match.awayTeamId)?.flagUrl ?? null,
          teamPhotoUrl: awayMeta?.teamPhotoUrl ?? null,
        },
        scoreHome: match.scoreHome,
        scoreAway: match.scoreAway,
        statusLabel: match.status === "completed" ? "Encerrada" : "Em disputa",
        metaLabel: formatMatchDateTime(match.playedAt),
      };
    });
  }, [publicTeamMetaById, selectedGroupRounds, selectedPublicGroupEntry, teamsById, workspace?.teams]);
  const publicRoundLabel = useMemo(() => {
    if (!selectedPublicGroupEntry) {
      return "RODADA 1";
    }

    const selectedRoundNumber =
      selectedGroupRounds[selectedPublicGroupEntry.group.id] ??
      selectedPublicGroupEntry.rounds[0]?.[0] ??
      1;

    return `RODADA ${selectedRoundNumber}`;
  }, [selectedGroupRounds, selectedPublicGroupEntry]);
  const myGameEntries = useMemo(() => {
    if (!workspace || !ownedTeamId) {
      return [];
    }

    const groupNameById = new Map(workspace.groups.map((group) => [group.id, group.name]));
    const groupEntries = workspace.groupMatches
      .filter((match) => match.homeTeamId === ownedTeamId || match.awayTeamId === ownedTeamId)
      .map((match) => ({
        id: `group-${match.id}`,
        sortOrder: match.roundNumber,
        title: `Rodada ${match.roundNumber}`,
        homeLabel: getTeamName(workspace.teams, match.homeTeamId),
        awayLabel: getTeamName(workspace.teams, match.awayTeamId),
        scoreHome: match.scoreHome,
        scoreAway: match.scoreAway,
        statusLabel: match.status === "completed" ? "Encerrada" : "Pendente",
        metaLabel: formatMatchDateTime(match.playedAt),
        secondaryMeta: `${groupNameById.get(match.groupId) ?? "Fase de grupos"} • ${
          match.venue || "Local a definir"
        }`,
        winnerTeamId: null,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeFlagUrl: teamsById.get(match.homeTeamId)?.flagUrl ?? null,
        awayFlagUrl: teamsById.get(match.awayTeamId)?.flagUrl ?? null,
        homeTeamPhotoUrl: publicTeamMetaById.get(match.homeTeamId)?.teamPhotoUrl ?? null,
        awayTeamPhotoUrl: publicTeamMetaById.get(match.awayTeamId)?.teamPhotoUrl ?? null,
      }));
    const bracketEntries = workspace.bracket.matches
      .filter((match) => match.homeTeamId === ownedTeamId || match.awayTeamId === ownedTeamId)
      .map((match) => ({
        id: `bracket-${match.id}`,
        sortOrder: 100 + match.roundOrder,
        title: `${match.stageName} ${match.matchOrder}`,
        homeLabel: getTeamName(workspace.teams, match.homeTeamId),
        awayLabel: getTeamName(workspace.teams, match.awayTeamId),
        scoreHome: match.scoreHome,
        scoreAway: match.scoreAway,
        statusLabel: match.winnerTeamId
          ? "Concluido"
          : match.homeTeamId && match.awayTeamId
            ? "Pronto"
            : "Pendente",
        metaLabel: formatMatchDateTime(match.playedAt),
        secondaryMeta: match.venue || "Local a definir",
        winnerTeamId: match.winnerTeamId,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeFlagUrl: teamsById.get(match.homeTeamId ?? "")?.flagUrl ?? null,
        awayFlagUrl: teamsById.get(match.awayTeamId ?? "")?.flagUrl ?? null,
        homeTeamPhotoUrl: match.homeTeamId ? publicTeamMetaById.get(match.homeTeamId)?.teamPhotoUrl ?? null : null,
        awayTeamPhotoUrl: match.awayTeamId ? publicTeamMetaById.get(match.awayTeamId)?.teamPhotoUrl ?? null : null,
      }));

    return [...groupEntries, ...bracketEntries].sort((left, right) => left.sortOrder - right.sortOrder);
  }, [ownedTeamId, publicTeamMetaById, teamsById, workspace]);

  if (
    championshipId &&
    !championship &&
    (areChampionshipsLoading || (shouldUseLightParticipationView && isDirectChampionshipLoading))
  ) {
    return renderShell(
      <section className="py-16">
        <div className="container mx-auto px-4">
          <EmptyStateCard
            icon={Trophy}
            title="Abrindo participacao"
            description="Carregando os dados do campeonato para liberar o pedido de entrada."
            className="mx-auto max-w-3xl"
          />
        </div>
      </section>,
    );
  }

  if (
    shouldUseLightParticipationView &&
    championshipId &&
    !championship &&
    directChampionshipError &&
    !isDirectChampionshipLoading
  ) {
    return renderShell(
      <section className="py-16">
        <div className="container mx-auto px-4">
          <EmptyStateCard
            icon={ShieldAlert}
            title="Nao foi possivel abrir participacao"
            description={directChampionshipError}
            actionLabel="Tentar novamente"
            actionOnClick={() => setWorkspaceReloadToken((current) => current + 1)}
            className="mx-auto max-w-3xl"
          />
        </div>
      </section>,
    );
  }

  if (!championshipId || !championship) {
    return renderShell(
        <section className="py-16">
          <div className="container mx-auto px-4">
            <EmptyStateCard
              icon={Trophy}
              title="Campeonato nao encontrado"
              description="O campeonato solicitado nao existe ou foi removido."
              actionLabel="Voltar para campeonatos"
              actionTo="/campeonatos"
              className="mx-auto max-w-3xl"
            />
          </div>
        </section>
    );
  }

  if (shouldUseLightParticipationView) {
    return renderShell(
      <>
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-[30px] border border-white/10 bg-metallic-card p-6 shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-heading text-xs uppercase tracking-[0.28em] text-primary">
                    Entrada publica
                  </p>
                  <h1 className="mt-3 font-heading text-3xl font-black text-foreground">
                    {championship.name}
                  </h1>
                </div>
                <StatusBadge status={championship.status} />
              </div>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Confirme seu pedido de participacao sem carregar a tabela completa do campeonato.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => setIsParticipationDialogOpen(true)}
                  className="rounded-full bg-electric px-5 text-[11px] uppercase tracking-[0.18em] text-background hover:bg-electric/90"
                >
                  Abrir participacao
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleShareChampionship()}
                  className="rounded-full"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartilhar
                </Button>
              </div>
            </div>
          </div>
        </section>
        <ParticipationDialog
          open={isParticipationDialogOpen}
          championship={championship}
          isPlayerAuthenticated={isPlayerAuthenticated}
          registrationRequest={playerRegistrationRequest}
          isSubmitting={isSubmittingParticipation}
          playerName={loginName}
          onSubmitRequest={handleSubmitParticipationRequest}
          onClose={closeParticipationDialog}
        />
      </>,
    );
  }

  if ((isLoading && !workspace) || !finalConfigDraft) {
    return renderShell(
        <section className="py-16">
          <div className="container mx-auto px-4">
            <EmptyStateCard
              icon={Trophy}
              title="Carregando painel do campeonato"
              description="Sincronizando grupos, finais e estatisticas mais recentes."
              className="mx-auto max-w-3xl"
            />
          </div>
        </section>
    );
  }

  if (!workspace) {
    return renderShell(
        <section className="py-16">
          <div className="container mx-auto px-4">
            <EmptyStateCard
              icon={ShieldAlert}
              title="Nao foi possivel abrir o campeonato"
              description={
                errorMessage ??
                "O painel nao conseguiu carregar grupos, confrontos e estatisticas agora."
              }
              actionLabel="Tentar novamente"
              actionOnClick={() => setWorkspaceReloadToken((current) => current + 1)}
              className="mx-auto max-w-3xl"
            />
          </div>
        </section>
    );
  }

  return (
    <>
      {renderShell(<section className={isAdmin ? "py-4" : "py-16"}>
        <div className="container mx-auto flex max-w-7xl flex-col gap-6 px-4">
          {isAdmin ? (
            <AdminPageHeader
              eyebrow="Operacao do campeonato"
              title={championship.name}
              description="Painel interno separado da experiencia publica para acompanhar grupos, bracket, pontuacao e andamento operacional."
              actions={
                <>
                  <Button type="button" variant="outline" onClick={() => void handleShareChampionship()}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Compartilhar
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={`/campeonatos/${championship.id}`}>Ver publico</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={backPath}>Voltar</Link>
                  </Button>
                </>
              }
            />
          ) : null}

          {isAdmin ? (
            <div className="flex flex-wrap gap-3">
              <StatusBadge status={championship.status} />
              <Badge variant="secondary">{storageMode === "supabase" ? "Supabase" : "Base local"}</Badge>
              <Badge variant="outline">Vagas {participantsProgressLabel}</Badge>
              <Badge variant="outline">{workspace.bracket.state.replaceAll("-", " ")}</Badge>
              <Badge variant="outline">{pendingRegistrationRequests.length} pendentes</Badge>
              <Badge variant="outline">{approvedRegistrationRequests.length} aprovados</Badge>
              {workspace.bracket.consistencyStatus === "outdated" || workspace.bracket.consistencyStatus === "frozen" ? (
                <Badge variant="destructive">Bracket com alerta</Badge>
              ) : null}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          ) : null}

          {isAdmin ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Vagas" value={participantsProgressLabel} icon={Users} />
              <MetricCard
                label="Jogos de grupos"
                value={`${summary?.groupMatchesCompleted ?? 0}/${summary?.totalGroupMatches ?? 0}`}
                icon={ListChecks}
              />
              <MetricCard
                label="Jogos de finais"
                value={`${summary?.bracketMatchesCompleted ?? 0}/${summary?.totalBracketMatches ?? 0}`}
                icon={Swords}
              />
              <MetricCard
                label="Campeao"
                value={summary?.championName ?? "Em disputa"}
                icon={Medal}
              />
            </div>
          ) : null}

          {isAdmin ? (
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Solicitacoes de participacao</CardTitle>
                  <CardDescription>
                    Aprove ou recuse os pedidos recebidos automaticamente pelo fluxo publico.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingRegistrationRequests.length > 0 ? (
                    pendingRegistrationRequests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-2xl border border-border bg-muted/20 p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-foreground">{request.playerName}</p>
                              <Badge
                                variant="outline"
                                className={getRegistrationBadgeClassName(request.status)}
                              >
                                {getChampionshipRegistrationStatusLabel(request.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{request.playerEmail}</p>
                            <p className="text-sm text-muted-foreground">
                              Pedido em {formatMatchDateTime(request.requestedAt)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() =>
                                handleReviewParticipationRequest(request.id, "approved")
                              }
                              disabled={reviewingRequestId === request.id}
                            >
                              Aprovar
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() =>
                                handleReviewParticipationRequest(request.id, "rejected")
                              }
                              disabled={reviewingRequestId === request.id}
                            >
                              Recusar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                      Nenhuma solicitacao pendente no momento.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Participantes e historico</CardTitle>
                  <CardDescription>
                    Aprovacoes e recusas mais recentes deste campeonato.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Participantes aprovados
                    </p>
                    <p className="mt-2 text-3xl font-black text-foreground">
                      {approvedRegistrationRequests.length}
                    </p>
                  </div>

                  {reviewedRegistrationRequests.length > 0 ? (
                    reviewedRegistrationRequests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-2xl border border-border bg-muted/20 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{request.playerName}</p>
                          <Badge
                            variant="outline"
                            className={getRegistrationBadgeClassName(request.status)}
                          >
                            {getChampionshipRegistrationStatusLabel(request.status)}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{request.playerEmail}</p>
                        {request.reviewedAt ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Revisado por {request.reviewedBy ?? "Administrador"} em{" "}
                            {formatMatchDateTime(request.reviewedAt)}
                          </p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                      As decisoes mais recentes vao aparecer aqui depois da primeira aprovacao ou recusa.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

            <Tabs
              value={activeChampionshipTab}
              onValueChange={setActiveChampionshipTab}
              className="w-full"
            >
            {isAdmin ? (
              <TabsList className="h-auto w-full flex-wrap justify-start gap-0 rounded-none border-b border-border/70 bg-transparent p-0">
                <TabsTrigger value="groups" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground">
                  {classificationTabLabel}
                </TabsTrigger>
                <TabsTrigger value="finals" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground">
                  Finais
                </TabsTrigger>
                <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground">
                  Info
                </TabsTrigger>
                <TabsTrigger value="stats" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground">
                  Estatisticas
                </TabsTrigger>
                <TabsTrigger value="adjustments" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground">
                  Ajustes pontuacao
                </TabsTrigger>
              </TabsList>
            ) : (
              <UltimateTeamChampionshipShell
                title={toSafeUpperText(championship.name, "Campeonato")}
                statusBadge={<StatusBadge status={championship.status} className="text-[11px]" />}
                actions={
                  <>
                    <Button
                      onClick={openParticipationDialog}
                      disabled={shouldDisableRegistrationAction}
                      className="rounded-full bg-electric px-5 text-[11px] uppercase tracking-[0.18em] text-background hover:bg-electric/90"
                    >
                      {registrationActionLabel}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleShareChampionship()}
                      className="rounded-full border-white/12 bg-white/5 text-slate-100 hover:bg-white/10"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Compartilhar
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-white/12 bg-white/5 text-slate-100 hover:bg-white/10">
                      <Link to={backPath}>Voltar</Link>
                    </Button>
                  </>
                }
                tabs={
                  <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b border-white/8 bg-transparent p-0">
                    <TabsTrigger value="groups" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-400 data-[state=active]:border-electric data-[state=active]:bg-transparent data-[state=active]:text-slate-50">
                      {classificationTabLabel}
                    </TabsTrigger>
                    <TabsTrigger value="finals" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-400 data-[state=active]:border-electric data-[state=active]:bg-transparent data-[state=active]:text-slate-50">
                      Finais
                    </TabsTrigger>
                    <TabsTrigger value="my-games" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-400 data-[state=active]:border-electric data-[state=active]:bg-transparent data-[state=active]:text-slate-50">
                      Meus jogos
                    </TabsTrigger>
                    <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-400 data-[state=active]:border-electric data-[state=active]:bg-transparent data-[state=active]:text-slate-50">
                      Info
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-400 data-[state=active]:border-electric data-[state=active]:bg-transparent data-[state=active]:text-slate-50">
                      Estatisticas
                    </TabsTrigger>
                  </TabsList>
                }
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="max-w-3xl text-sm leading-7 text-slate-300">
                    Visual compacto inspirado em simuladores de campeonato, com classificacao alinhada e jogos da rodada em cards limpos.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="border-white/10 bg-white/8 text-slate-200">
                      {storageMode === "supabase" ? "Supabase" : "Base local"}
                    </Badge>
                    <Badge variant="outline" className="border-white/10 text-slate-200">
                      Vagas {participantsProgressLabel}
                    </Badge>
                    {playerRegistrationRequest ? (
                      <Badge
                        variant="outline"
                        className={getRegistrationBadgeClassName(playerRegistrationRequest.status)}
                      >
                        {getChampionshipRegistrationStatusLabel(playerRegistrationRequest.status)}
                      </Badge>
                    ) : null}
                    {approvedRegistrationRequests.length > 0 ? (
                      <Badge variant="outline" className="border-white/10 text-slate-200">
                        {approvedRegistrationRequests.length} aprovados
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </UltimateTeamChampionshipShell>
            )}

            <TabsContent value="groups" className={isAdmin ? "space-y-4" : "mt-6 space-y-5"}>
              {isAdmin ? (
                <>
                  <Card>
                    <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <CardTitle>{participantsCardTitle}</CardTitle>
                        <CardDescription>{participantsCardDescription}</CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="outline" onClick={handleSaveTeamNames} disabled={isSaving}>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar equipes
                        </Button>
                        {!tableAlreadyGenerated ? (
                          <Button
                            onClick={handleGenerateTable}
                            disabled={isSaving || Boolean(tableGenerationValidationMessage)}
                          >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Gerar Tabela
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={handleRebuildGroups} disabled={isSaving}>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Redistribuir grupos
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {workspace.teams.length > 0 ? (
                        workspace.teams.map((team) => (
                          <label key={team.id} className="space-y-2">
                            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              Seed {team.seed}
                            </span>
                            <input
                              value={teamNameDrafts[team.id] ?? team.name}
                              onChange={(event) =>
                                setTeamNameDrafts((current) => ({
                                  ...current,
                                  [team.id]: event.target.value,
                                }))
                              }
                              disabled={!isAdmin}
                              className={inputClassName}
                            />
                          </label>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground md:col-span-2 xl:col-span-4">
                          Nenhum participante inscrito ainda. Aprove pedidos de participacao antes de gerar a tabela.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {!tableAlreadyGenerated ? (
                    <EmptyStateCard
                      icon={ListChecks}
                      title="Tabela ainda nao gerada"
                      description={
                        tableGenerationValidationMessage ??
                        "Participantes suficientes. O ADM pode clicar em Gerar Tabela para criar grupos, rodadas e confrontos."
                      }
                    />
                  ) : isKnockoutOnlyFormat ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Entrada do chaveamento</CardTitle>
                        <CardDescription>
                          Este formato pula a classificatoria. Aqui a leitura foca em seed, ordem de entrada e pronto encaminhamento para a aba de finais.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {[...workspace.teams]
                          .sort((left, right) => left.seed - right.seed)
                          .map((team) => (
                            <div key={team.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                Seed {team.seed}
                              </p>
                              <div className="mt-2">
                                <TeamNameBlock team={team} onOpenTeamProfile={openTeamProfile} />
                              </div>
                              <p className="mt-3 text-sm text-muted-foreground">
                                {team.pointsAdjustment !== 0
                                  ? `Ajuste ativo: ${team.pointsAdjustment > 0 ? "+" : ""}${team.pointsAdjustment} pontos.`
                                  : "Pronto para entrar no bracket eliminatorio."}
                              </p>
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  ) : workspace.groups.length === 0 ? (
                    <EmptyStateCard
                      icon={Users}
                      title="Sem fase de grupos"
                      description="Este campeonato esta configurado sem grupos. O mata-mata pode ser gerado direto a partir da lista de participantes."
                    />
                  ) : isLeagueFormat ? (
                    (() => {
                      const leagueGroup = groupMatchesByGroup[0];

                      if (!leagueGroup) {
                        return (
                          <EmptyStateCard
                            icon={ListChecks}
                            title="Tabela ainda nao gerada"
                            description="A fase classificatoria deste campeonato ainda nao foi montada."
                          />
                        );
                      }

                      return (
                        <div className="grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
                          <StandingsBoard
                            title="Classificacao"
                            description="Todos se enfrentam no mesmo quadro classificatorio, com leitura unica de pontos, saldo, gols e campanha."
                            rows={standings[0]?.rows ?? []}
                            qualifiedCount={finalConfigDraft.hasFinalStage ? finalConfigDraft.qualifiedPerGroup : 0}
                            teamsById={teamsById}
                            onOpenTeamProfile={openTeamProfile}
                          />

                          <RoundMatchesBoard
                            title="Rodadas da liga"
                            description="Navegue por uma rodada de cada vez para manter a leitura mais limpa e objetiva."
                            groupLabel={leagueGroup.group.name}
                            rounds={leagueGroup.rounds}
                            selectedRoundNumber={selectedGroupRounds[leagueGroup.group.id] ?? leagueGroup.rounds[0]?.[0] ?? 1}
                            onSelectRound={(roundNumber) =>
                              setSelectedGroupRounds((current) => ({
                                ...current,
                                [leagueGroup.group.id]: roundNumber,
                              }))
                            }
                            teamsById={teamsById}
                            onOpenTeamProfile={openTeamProfile}
                            isAdmin={isAdmin}
                            onEditMatch={setEditingGroupMatch}
                          />
                        </div>
                      );
                    })()
                  ) : (
                    groupMatchesByGroup.map(({ group, rounds }, groupIndex) => (
                      <div key={group.id} className="grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
                        <StandingsBoard
                          title={group.name}
                          description="Classificacao atual com desempate por pontos, saldo, gols marcados e vitorias."
                          rows={standings[groupIndex]?.rows ?? []}
                          qualifiedCount={finalConfigDraft.hasFinalStage ? finalConfigDraft.qualifiedPerGroup : 0}
                          teamsById={teamsById}
                          onOpenTeamProfile={openTeamProfile}
                        />

                        <RoundMatchesBoard
                          title={`Partidas do ${group.name}`}
                          description={
                            isCrossBracketFormat
                              ? "Cada chave navega por uma rodada de cada vez para evitar uma coluna longa demais."
                              : "Use o botao da partida para editar placar, data, horario e local."
                          }
                          groupLabel={group.name}
                          rounds={rounds}
                          selectedRoundNumber={selectedGroupRounds[group.id] ?? rounds[0]?.[0] ?? 1}
                          onSelectRound={(roundNumber) =>
                            setSelectedGroupRounds((current) => ({
                              ...current,
                              [group.id]: roundNumber,
                            }))
                          }
                          teamsById={teamsById}
                          onOpenTeamProfile={openTeamProfile}
                          isAdmin={isAdmin}
                          onEditMatch={setEditingGroupMatch}
                        />
                      </div>
                    ))
                  )}
                </>
              ) : (
                <>
                  {(canOpenRegistration || playerRegistrationRequest || (selectedPublicGroupEntry?.rounds.length ?? 0) > 1) ? (
                    <Card className="border-white/8 bg-[linear-gradient(180deg,hsl(220_18%_14%_/_0.95),hsl(220_18%_11%_/_0.92))] shadow-[0_18px_36px_hsl(222_40%_3%_/_0.2)]">
                      <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.24em] text-electric">Painel do jogador</p>
                          <p className="text-sm leading-7 text-slate-300">
                            {playerRegistrationRequest
                              ? playerRegistrationRequest.status === "pending"
                                ? "Seu pedido foi enviado e agora aguarda aprovacao do administrador."
                                : playerRegistrationRequest.status === "approved"
                                  ? "Participacao aprovada. Seu nome ja consta no campeonato."
                                  : "O pedido foi recusado e o status continua visivel aqui."
                              : canOpenRegistration
                                ? "A janela de entrada esta aberta. Voce pode acompanhar a tabela e pedir entrada sem sair desta tela."
                                : "Acompanhe a rodada e a classificacao em uma leitura compacta."}
                          </p>
                        </div>

                        {(selectedPublicGroupEntry?.rounds.length ?? 0) > 1 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedPublicGroupEntry?.rounds.map(([roundNumber]) => (
                              <button
                                key={roundNumber}
                                type="button"
                                onClick={() =>
                                  setSelectedGroupRounds((current) => ({
                                    ...current,
                                    [selectedPublicGroupEntry.group.id]: roundNumber,
                                  }))
                                }
                                className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.16em] transition-all ${
                                  (selectedGroupRounds[selectedPublicGroupEntry.group.id] ??
                                    selectedPublicGroupEntry.rounds[0]?.[0] ??
                                    1) === roundNumber
                                    ? "border-electric/35 bg-electric/12 text-electric"
                                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-electric/30 hover:text-electric"
                                }`}
                              >
                                Rodada {roundNumber}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  ) : null}

                  {!tableAlreadyGenerated ? (
                    <Card className="border-white/8 bg-[linear-gradient(180deg,hsl(220_18%_12%_/_0.98),hsl(220_20%_10%_/_0.96))]">
                      <CardHeader>
                        <CardTitle>Participantes inscritos</CardTitle>
                        <CardDescription>
                          A tabela ainda nao foi gerada. Acompanhe as vagas enquanto o ADM prepara o inicio.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                            Vagas preenchidas
                          </p>
                          <p className="mt-2 text-3xl font-semibold text-slate-100">
                            {participantsProgressLabel}
                          </p>
                        </div>
                        {workspace.teams.length > 0 ? (
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {[...workspace.teams]
                              .sort((left, right) => left.seed - right.seed)
                              .map((team) => (
                                <div key={team.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                    Seed {team.seed}
                                  </p>
                                  <div className="mt-2">
                                    <TeamNameBlock team={team} onOpenTeamProfile={openTeamProfile} />
                                  </div>
                                  <p className="mt-3 text-sm text-slate-400">
                                    Aguardando geracao da tabela.
                                  </p>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="text-sm leading-7 text-slate-400">
                            Nenhum participante foi aprovado ainda.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ) : isKnockoutOnlyFormat ? (
                    <Card className="border-white/8 bg-[linear-gradient(180deg,hsl(220_18%_12%_/_0.98),hsl(220_20%_10%_/_0.96))]">
                      <CardHeader>
                        <CardTitle>Entrada do chaveamento</CardTitle>
                        <CardDescription>
                          Este formato vai direto para o mata-mata. A aba de grupos vira um resumo compacto dos seeds de entrada.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {[...workspace.teams]
                          .sort((left, right) => left.seed - right.seed)
                          .map((team) => (
                            <div key={team.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                Seed {team.seed}
                              </p>
                              <div className="mt-2">
                                <TeamNameBlock team={team} onOpenTeamProfile={openTeamProfile} />
                              </div>
                              <p className="mt-3 text-sm text-slate-400">
                                {publicTeamMetaById.get(team.id)?.handle ?? `Tecnico seed ${String(team.seed).padStart(2, "0")}`}
                              </p>
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  ) : workspace.groups.length === 0 ? (
                    <EmptyStateCard
                      icon={Users}
                      title="Sem fase de grupos"
                      description="Este campeonato esta configurado sem grupos. O mata-mata pode ser gerado direto a partir da lista de participantes."
                    />
                  ) : (
                    <UltimateTeamGroupDashboard
                      standingsTitle="CLASSIFICACAO"
                      roundTitle={publicRoundLabel}
                      standings={publicStandingsEntries}
                      matches={publicRoundMatches}
                      onTeamSelect={openTeamProfile}
                      groupSwitcher={
                        !isLeagueFormat && groupMatchesByGroup.length > 1 ? (
                          <div className="flex flex-wrap gap-2">
                            {groupMatchesByGroup.map(({ group }) => (
                              <button
                                key={group.id}
                                type="button"
                                onClick={() => setSelectedPublicGroupId(group.id)}
                                className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] transition-all ${
                                  selectedPublicGroupEntry?.group.id === group.id
                                    ? "border-electric/35 bg-electric/12 text-electric"
                                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-electric/30 hover:text-electric"
                                }`}
                              >
                                {group.name}
                              </button>
                            ))}
                          </div>
                        ) : null
                      }
                    />
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="finals" className="space-y-4">
              {isAdmin ? (
                <>
                  <Card>
                    <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <CardTitle>Configuracao da fase final</CardTitle>
                        <CardDescription>
                          Defina se ha mata-mata, como os classificados viram confrontos e qual politica vale quando a fase de grupos muda.
                        </CardDescription>
                      </div>
                      {isAdmin ? (
                        <Button onClick={saveChampionshipConfiguration} disabled={isSaving}>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar configuracoes
                        </Button>
                      ) : null}
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <ToggleField
                        label="Habilitar fase final"
                        value={finalConfigDraft.hasFinalStage}
                        disabled={!isAdmin}
                        onChange={(value) =>
                          setFinalConfigDraft((current) => (current ? { ...current, hasFinalStage: value } : current))
                        }
                      />
                      <ToggleField
                        label="Disputa de 3o lugar"
                        value={finalConfigDraft.thirdPlaceMatch}
                        disabled={!isAdmin}
                        onChange={(value) =>
                          setFinalConfigDraft((current) => (current ? { ...current, thirdPlaceMatch: value } : current))
                        }
                      />
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground">Classificados por grupo</span>
                        <input
                          type="number"
                          min={1}
                          value={finalConfigDraft.qualifiedPerGroup}
                          onChange={(event) =>
                            setFinalConfigDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    qualifiedPerGroup: Math.max(1, Number(event.target.value)),
                                  }
                                : current,
                            )
                          }
                          disabled={!isAdmin}
                          className={inputClassName}
                        />
                      </label>
                      <SelectField
                        label="Montagem automatica"
                        value={finalConfigDraft.knockoutBracketMode}
                        disabled={!isAdmin}
                        onChange={(value) =>
                          setFinalConfigDraft((current) =>
                            current ? { ...current, knockoutBracketMode: value as ChampionshipConfiguration["knockoutBracketMode"] } : current,
                          )
                        }
                        options={[
                          { value: "cross-groups", label: "Cruzamento por grupos" },
                          { value: "best-vs-worst", label: "Melhor x pior" },
                        ]}
                      />
                      <SelectField
                        label="Modo de definicao"
                        value={finalConfigDraft.knockoutSetupMode}
                        disabled={!isAdmin}
                        onChange={(value) =>
                          setFinalConfigDraft((current) =>
                            current ? { ...current, knockoutSetupMode: value as ChampionshipConfiguration["knockoutSetupMode"] } : current,
                          )
                        }
                        options={[
                          { value: "automatic", label: "Automatico" },
                          { value: "manual", label: "Manual" },
                        ]}
                      />
                      <SelectField
                        label="Mudancas na fase de grupos"
                        value={finalConfigDraft.bracketSyncPolicy}
                        disabled={!isAdmin}
                        onChange={(value) =>
                          setFinalConfigDraft((current) =>
                            current ? { ...current, bracketSyncPolicy: value as ChampionshipConfiguration["bracketSyncPolicy"] } : current,
                          )
                        }
                        options={[
                          { value: "warn", label: "Avisar e regerar" },
                          { value: "freeze", label: "Congelar bracket" },
                        ]}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Nomes das fases</CardTitle>
                      <CardDescription>
                        Os nomes abaixo aparecem no bracket visual e podem ser adaptados ao regulamento do campeonato.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground">Oitavas</span>
                        <input
                          value={finalConfigDraft.phaseLabels.roundOf16}
                          onChange={(event) =>
                            setFinalConfigDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    phaseLabels: {
                                      ...current.phaseLabels,
                                      roundOf16: event.target.value,
                                    },
                                  }
                                : current,
                            )
                          }
                          disabled={!isAdmin}
                          className={inputClassName}
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground">Quartas</span>
                        <input
                          value={finalConfigDraft.phaseLabels.quarterfinal}
                          onChange={(event) =>
                            setFinalConfigDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    phaseLabels: {
                                      ...current.phaseLabels,
                                      quarterfinal: event.target.value,
                                    },
                                  }
                                : current,
                            )
                          }
                          disabled={!isAdmin}
                          className={inputClassName}
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground">Semifinal</span>
                        <input
                          value={finalConfigDraft.phaseLabels.semifinal}
                          onChange={(event) =>
                            setFinalConfigDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    phaseLabels: {
                                      ...current.phaseLabels,
                                      semifinal: event.target.value,
                                    },
                                  }
                                : current,
                            )
                          }
                          disabled={!isAdmin}
                          className={inputClassName}
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground">Final</span>
                        <input
                          value={finalConfigDraft.phaseLabels.final}
                          onChange={(event) =>
                            setFinalConfigDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    phaseLabels: {
                                      ...current.phaseLabels,
                                      final: event.target.value,
                                    },
                                  }
                                : current,
                            )
                          }
                          disabled={!isAdmin}
                          className={inputClassName}
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground">3o lugar</span>
                        <input
                          value={finalConfigDraft.phaseLabels.thirdPlace}
                          onChange={(event) =>
                            setFinalConfigDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    phaseLabels: {
                                      ...current.phaseLabels,
                                      thirdPlace: event.target.value,
                                    },
                                  }
                                : current,
                            )
                          }
                          disabled={!isAdmin}
                          className={inputClassName}
                        />
                      </label>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Estrutura da fase final</CardTitle>
                    <CardDescription>
                      Resumo publico da configuracao do mata-mata, separado do painel administrativo.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <InfoRow label="Fase final" value={finalConfigDraft.hasFinalStage ? "Habilitada" : "Desabilitada"} />
                    <InfoRow label="Classificados" value={String(finalConfigDraft.qualifiedPerGroup)} />
                    <InfoRow label="Montagem" value={finalConfigDraft.knockoutBracketMode} />
                    <InfoRow label="Definicao" value={finalConfigDraft.knockoutSetupMode} />
                    <InfoRow label="Atualizacao" value={finalConfigDraft.bracketSyncPolicy} />
                    <InfoRow label="3o lugar" value={finalConfigDraft.thirdPlaceMatch ? "Ativo" : "Nao"} />
                  </CardContent>
                </Card>
              )}

              {workspace.bracket.consistencyMessage ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">Bracket com atencao</p>
                      <p className="mt-1 leading-6">{workspace.bracket.consistencyMessage}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <Card>
                <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle>Chaveamento visual</CardTitle>
                    <CardDescription>
                      O vencedor avanca automaticamente ate a final. Use o botao do confronto para editar o resultado.
                    </CardDescription>
                  </div>
                  {isAdmin && tableAlreadyGenerated ? (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={handleGenerateBracket}
                        disabled={isSaving || Boolean(bracketValidationMessage)}
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        {workspace.bracket.matches.length ? "Regerar chaveamento" : "Gerar chaveamento"}
                      </Button>
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  {bracketValidationMessage && !workspace.bracket.matches.length ? (
                    <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                      {bracketValidationMessage}
                    </div>
                  ) : null}

                  {!workspace.bracket.matches.length ? (
                    <EmptyStateCard
                      icon={Swords}
                      title={tableAlreadyGenerated ? "Bracket ainda nao gerado" : "Tabela ainda nao gerada"}
                      description={
                        tableAlreadyGenerated
                          ? "Assim que a classificacao estiver valida, use o botao acima para criar o mata-mata."
                          : "O ADM precisa gerar a tabela antes de existir chaveamento, grupos ou rodadas."
                      }
                    />
                  ) : (
                    <>
                      <div className="rounded-[28px] border border-border/80 bg-background/35 p-3 shadow-inner sm:p-4">
                        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
                          {bracketColumns.map((column, index) => (
                            <section
                              key={column.round.id}
                              className="min-w-0 rounded-3xl border border-border bg-card/80 p-4 shadow-[0_16px_40px_hsl(0_0%_0%_/_0.18)]"
                            >
                              <div className="mb-4 flex items-start justify-between gap-3 border-b border-border/60 pb-3">
                                <div className="min-w-0">
                                  <p className="text-[11px] uppercase tracking-[0.24em] text-primary">
                                    Fase {index + 1}
                                  </p>
                                  <h3 className="mt-1 truncate text-lg font-semibold text-foreground">
                                    {column.round.stageName}
                                  </h3>
                                </div>
                                <Badge variant="outline" className="shrink-0">
                                  {column.matches.length} jogos
                                </Badge>
                              </div>

                              <div className="grid gap-3">
                                {column.matches.map((match) => (
                                  <MatchCard
                                    key={match.id}
                                    title={`${match.stageName} ${match.matchOrder}`}
                                    homeLabel={getTeamName(workspace.teams, match.homeTeamId)}
                                    awayLabel={getTeamName(workspace.teams, match.awayTeamId)}
                                    scoreHome={match.scoreHome}
                                    scoreAway={match.scoreAway}
                                    statusLabel={
                                      match.winnerTeamId
                                        ? "Concluido"
                                        : match.homeTeamId && match.awayTeamId
                                        ? "Pronto"
                                        : "Pendente"
                                    }
                                    metaLabel={formatMatchDateTime(match.playedAt)}
                                    secondaryMeta={match.venue || "Local a definir"}
                                    winnerTeamId={match.winnerTeamId}
                                    homeTeamId={match.homeTeamId}
                                    awayTeamId={match.awayTeamId}
                                    homeFlagUrl={teamsById.get(match.homeTeamId ?? "")?.flagUrl ?? null}
                                    awayFlagUrl={teamsById.get(match.awayTeamId ?? "")?.flagUrl ?? null}
                                    homeTeamPhotoUrl={
                                      match.homeTeamId
                                        ? publicTeamMetaById.get(match.homeTeamId)?.teamPhotoUrl ?? null
                                        : null
                                    }
                                    awayTeamPhotoUrl={
                                      match.awayTeamId
                                        ? publicTeamMetaById.get(match.awayTeamId)?.teamPhotoUrl ?? null
                                        : null
                                    }
                                    onOpenTeamProfile={openTeamProfile}
                                    onClick={
                                      isAdmin ? () => setEditingBracketMatch(match) : undefined
                                    }
                                  />
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>
                      </div>

                      {thirdPlaceMatch ? (
                        <div className="rounded-3xl border border-border bg-card/80 p-4 shadow-[0_16px_40px_hsl(0_0%_0%_/_0.18)] lg:max-w-2xl">
                          <div className="mb-4 flex items-center justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                Partida extra
                              </p>
                              <h3 className="text-lg font-semibold text-foreground">
                                {thirdPlaceMatch.stageName}
                              </h3>
                            </div>
                          </div>
                          <MatchCard
                            title={thirdPlaceMatch.stageName}
                            homeLabel={getTeamName(workspace.teams, thirdPlaceMatch.homeTeamId)}
                            awayLabel={getTeamName(workspace.teams, thirdPlaceMatch.awayTeamId)}
                            scoreHome={thirdPlaceMatch.scoreHome}
                            scoreAway={thirdPlaceMatch.scoreAway}
                            statusLabel={
                              thirdPlaceMatch.winnerTeamId
                                ? "Concluido"
                                : thirdPlaceMatch.homeTeamId && thirdPlaceMatch.awayTeamId
                                ? "Pronto"
                                : "Pendente"
                            }
                            metaLabel={formatMatchDateTime(thirdPlaceMatch.playedAt)}
                            secondaryMeta={thirdPlaceMatch.venue || "Local a definir"}
                            winnerTeamId={thirdPlaceMatch.winnerTeamId}
                            homeTeamId={thirdPlaceMatch.homeTeamId}
                            awayTeamId={thirdPlaceMatch.awayTeamId}
                            homeFlagUrl={teamsById.get(thirdPlaceMatch.homeTeamId ?? "")?.flagUrl ?? null}
                            awayFlagUrl={teamsById.get(thirdPlaceMatch.awayTeamId ?? "")?.flagUrl ?? null}
                            homeTeamPhotoUrl={
                              thirdPlaceMatch.homeTeamId
                                ? publicTeamMetaById.get(thirdPlaceMatch.homeTeamId)?.teamPhotoUrl ?? null
                                : null
                            }
                            awayTeamPhotoUrl={
                              thirdPlaceMatch.awayTeamId
                                ? publicTeamMetaById.get(thirdPlaceMatch.awayTeamId)?.teamPhotoUrl ?? null
                                : null
                            }
                            onOpenTeamProfile={openTeamProfile}
                            onClick={isAdmin ? () => setEditingBracketMatch(thirdPlaceMatch) : undefined}
                          />
                        </div>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="my-games" className={isAdmin ? "space-y-4" : "mt-6 space-y-5"}>
              {!isAdmin ? (
                <Card className="border-white/8 bg-[linear-gradient(180deg,hsl(220_18%_12%_/_0.98),hsl(220_20%_10%_/_0.96))]">
                  <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle>Meus jogos</CardTitle>
                      <CardDescription>
                        Confrontos do seu time neste campeonato, incluindo fase de grupos e chaveamento.
                      </CardDescription>
                    </div>
                    {ownedTeam ? (
                      <Badge variant="outline" className="border-electric/30 bg-electric/10 text-electric">
                        {ownedTeam.name}
                      </Badge>
                    ) : null}
                  </CardHeader>
                  <CardContent>
                    {!isPlayerAuthenticated ? (
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-sm text-slate-300">
                        <p className="font-medium text-slate-100">Entre para ver seus jogos.</p>
                        <p className="mt-2 leading-6 text-slate-400">
                          A aba filtra automaticamente os confrontos pelo time vinculado a sua conta.
                        </p>
                        <Button asChild className="mt-4 rounded-full bg-electric text-background hover:bg-electric/90">
                          <Link to={`/entrar?redirect=${encodeURIComponent(`/campeonatos/${championship.id}`)}`}>
                            Entrar na conta
                          </Link>
                        </Button>
                      </div>
                    ) : !ownedTeam ? (
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-sm text-slate-300">
                        <p className="font-medium text-slate-100">Seu time ainda nao esta vinculado.</p>
                        <p className="mt-2 leading-6 text-slate-400">
                          Quando sua inscricao for aprovada ou seu usuario estiver ligado a um participante,
                          seus confrontos aparecem aqui.
                        </p>
                      </div>
                    ) : myGameEntries.length > 0 ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        {myGameEntries.map((match) => (
                          <MatchCard
                            key={match.id}
                            title={match.title}
                            homeLabel={match.homeLabel}
                            awayLabel={match.awayLabel}
                            scoreHome={match.scoreHome}
                            scoreAway={match.scoreAway}
                            statusLabel={match.statusLabel}
                            metaLabel={match.metaLabel}
                            secondaryMeta={match.secondaryMeta}
                            winnerTeamId={match.winnerTeamId}
                            homeTeamId={match.homeTeamId}
                            awayTeamId={match.awayTeamId}
                            homeFlagUrl={match.homeFlagUrl}
                            awayFlagUrl={match.awayFlagUrl}
                            homeTeamPhotoUrl={match.homeTeamPhotoUrl}
                            awayTeamPhotoUrl={match.awayTeamPhotoUrl}
                            onOpenTeamProfile={openTeamProfile}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-sm text-slate-300">
                        <p className="font-medium text-slate-100">Nenhum jogo definido ainda.</p>
                        <p className="mt-2 leading-6 text-slate-400">
                          Assim que o ADM gerar a tabela ou seu proximo adversario for definido, o jogo aparece aqui.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>

            <TabsContent value="info" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo do campeonato</CardTitle>
                    <CardDescription>
                      Visao geral da competicao, incluindo formato, cadastro e janela oficial.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <InfoRow label="Descricao" value={championship.description} />
                    <InfoRow label="Regras" value={championship.rules} />
                    <InfoRow
                      label="Periodo"
                      value={formatChampionshipDateRange(championship.startDate, championship.endDate)}
                    />
                    <InfoRow
                      label="Vagas disponiveis"
                      value={formatChampionshipAvailableSlots(championship)}
                    />
                    <InfoRow label="Fase atual" value={workspace.bracket.state.replaceAll("-", " ")} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Configuracao competitiva</CardTitle>
                    <CardDescription>
                      Parametros que alimentam classificacao, bracket e sincronizacao da fase final.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <InfoRow label="Formato" value={championship.configuration.format} />
                    <InfoRow label="Grupos" value={String(championship.configuration.groupCount)} />
                    <InfoRow label="Classificados por grupo" value={String(finalConfigDraft.qualifiedPerGroup)} />
                    <InfoRow label="Montagem" value={finalConfigDraft.knockoutBracketMode} />
                    <InfoRow label="Definicao inicial" value={finalConfigDraft.knockoutSetupMode} />
                    <InfoRow label="Politica de mudanca" value={finalConfigDraft.bracketSyncPolicy} />
                    <InfoRow label="Terceiro lugar" value={finalConfigDraft.thirdPlaceMatch ? "Sim" : "Nao"} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Grupos" value={String(summary?.totalGroups ?? 0)} icon={Users} />
                <MetricCard label="Gols" value={String(summary?.totalGoals ?? 0)} icon={Trophy} />
                <MetricCard
                  label="Situacao do bracket"
                  value={(summary?.bracketState ?? "not-generated").replaceAll("-", " ")}
                  icon={Swords}
                />
                <MetricCard
                  label="Consistencia"
                  value={summary?.consistencyStatus ?? "idle"}
                  icon={ShieldAlert}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Leitura rapida da competicao</CardTitle>
                  <CardDescription>
                    Estatisticas resumidas para acompanhamento do andamento do campeonato.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      Melhor campanha por grupo
                    </p>
                    <div className="mt-3 space-y-3">
                      {standings.map((group) => (
                        <div key={group.groupId} className="flex items-center justify-between text-sm">
                          <span>{group.groupName}</span>
                          <div className="max-w-[65%]">
                            <TeamNameBlock
                              team={group.rows[0] ? teamsById.get(group.rows[0].teamId) ?? null : null}
                              fallbackName={group.rows[0]?.teamName ?? "Sem lider"}
                              size="sm"
                              onOpenTeamProfile={openTeamProfile}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      Classificados atuais
                    </p>
                    <div className="mt-3 space-y-3 text-sm">
                      {qualifiedTeams.map((team) => (
                        <div key={`${team.teamId}-${team.sourceLabel}`} className="flex items-center justify-between">
                          <div className="max-w-[65%]">
                            <TeamNameBlock
                              team={teamsById.get(team.teamId) ?? null}
                              fallbackName={team.teamName}
                              size="sm"
                              onOpenTeamProfile={openTeamProfile}
                            />
                          </div>
                          <span className="text-muted-foreground">{team.sourceLabel}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {isAdmin ? <TabsContent value="adjustments" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle>Ajustes de classificacao</CardTitle>
                    <CardDescription>
                      Configure a pontuacao padrao e aplique bonus ou punicoes por equipe sem mexer no historico de partidas.
                    </CardDescription>
                  </div>
                  {isAdmin ? (
                    <Button onClick={handleSaveScoringAdjustments} disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar ajustes
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">Vitoria</span>
                      <input
                        type="number"
                        value={scoringDraft.winPoints}
                        disabled={!isAdmin}
                        onChange={(event) =>
                          setScoringDraft((current) => ({
                            ...current,
                            winPoints: Number(event.target.value),
                          }))
                        }
                        className={inputClassName}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">Empate</span>
                      <input
                        type="number"
                        value={scoringDraft.drawPoints}
                        disabled={!isAdmin}
                        onChange={(event) =>
                          setScoringDraft((current) => ({
                            ...current,
                            drawPoints: Number(event.target.value),
                          }))
                        }
                        className={inputClassName}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">Derrota</span>
                      <input
                        type="number"
                        value={scoringDraft.lossPoints}
                        disabled={!isAdmin}
                        onChange={(event) =>
                          setScoringDraft((current) => ({
                            ...current,
                            lossPoints: Number(event.target.value),
                          }))
                        }
                        className={inputClassName}
                      />
                    </label>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          <th className="py-2 pr-3">Equipe</th>
                          <th className="py-2 pr-3">Grupo</th>
                          <th className="py-2 pr-3">Ajuste</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workspace.teams.map((team) => (
                          <tr key={team.id} className="border-b border-border/60">
                            <td className="py-3 pr-3 font-medium text-foreground">{team.name}</td>
                            <td className="py-3 pr-3 text-muted-foreground">
                              {workspace.groups.find((group) => group.id === team.groupId)?.name ?? "Sem grupo"}
                            </td>
                            <td className="py-3 pr-3">
                              <input
                                type="number"
                                value={adjustmentDrafts[team.id] ?? 0}
                                disabled={!isAdmin}
                                onChange={(event) =>
                                  setAdjustmentDrafts((current) => ({
                                    ...current,
                                    [team.id]: Number(event.target.value),
                                  }))
                                }
                                className={inputClassName}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent> : null}
          </Tabs>
        </div>
      </section>)}

      <GroupMatchDialog
        match={editingGroupMatch}
        teams={workspace.teams}
        onClose={() => setEditingGroupMatch(null)}
        onSave={handleSaveGroupMatch}
      />
      <BracketMatchDialog
        match={editingBracketMatch}
        teams={workspace.teams}
        qualifiedTeams={qualifiedTeams}
        onClose={() => setEditingBracketMatch(null)}
        onSave={handleSaveBracketMatch}
      />
      <TeamProfileDialog
        open={Boolean(selectedTeamId)}
        profile={selectedTeamProfile}
        canEdit={selectedTeamCanEdit}
        isOwnTeam={Boolean(selectedTeamId && selectedTeamId === ownedTeamId)}
        isSaving={isSaving}
        challengeAction={selectedTeamChallengeAction}
        onClose={() => setSelectedTeamId(null)}
        onSaveProfile={handleSaveTeamProfile}
      />
      <ChallengeModal
        open={isChallengeModalOpen}
        championshipName={championship?.name ?? null}
        fromTeam={ownedTeam ? { name: ownedTeam.name, flagUrl: ownedTeam.flagUrl } : null}
        toTeam={
          selectedTeamProfile
            ? { name: selectedTeamProfile.team.name, flagUrl: selectedTeamProfile.team.flagUrl }
            : null
        }
        isSubmitting={isSubmittingChallenge}
        onClose={() => setIsChallengeModalOpen(false)}
        onSubmit={handleSubmitFriendlyChallenge}
      />
      {!isAdmin ? (
        <ParticipationDialog
          open={isParticipationDialogOpen}
          championship={championship}
          isPlayerAuthenticated={isPlayerAuthenticated}
          registrationRequest={playerRegistrationRequest}
          isSubmitting={isSubmittingParticipation}
          playerName={loginName}
          onSubmitRequest={handleSubmitParticipationRequest}
          onClose={closeParticipationDialog}
        />
      ) : null}
    </>
  );
}

export default function ChampionshipDetails() {
  return <ChampionshipWorkspacePage mode="public" />;
}

function ParticipationDialog({
  open,
  championship,
  isPlayerAuthenticated,
  registrationRequest,
  isSubmitting,
  playerName,
  onSubmitRequest,
  onClose,
}: {
  open: boolean;
  championship: ChampionshipRecord;
  isPlayerAuthenticated: boolean;
  registrationRequest: ChampionshipRegistrationRequest | null;
  isSubmitting: boolean;
  playerName: string | null;
  onSubmitRequest: () => Promise<void>;
  onClose: () => void;
}) {
  const canRegister = championship.status === "REGISTRATION";
  const isPublicRegistration = championship.configuration.registrationMode === "public";
  const statusLabel = registrationRequest
    ? getChampionshipRegistrationStatusLabel(registrationRequest.status)
    : null;
  const StatusIcon = registrationRequest
    ? getRegistrationStatusIcon(registrationRequest.status)
    : null;
  const entryFeeLabel = championship.configuration.entryFee.trim()
    ? championship.configuration.entryFee.trim()
    : "Gratuita";
  const resultsLabel =
    championship.configuration.resultsReportedBy === "players"
      ? "Administrador e jogadores"
      : "Somente administrador";

  let title = "Acompanhar campeonato";
  let description =
    "Esta tela continua sendo o centro de leitura do campeonato com classificacao, rodadas, fase final e regras.";

  if (!canRegister) {
    title =
      championship.status === "STARTED"
        ? "Inscricoes fechadas, campeonato em disputa"
        : "Janela de entrada indisponivel";
    description =
      championship.status === "STARTED"
        ? "A entrada nao esta aberta agora. Use esta pagina para acompanhar tabela, rodadas e mata-mata."
        : "O campeonato ainda nao esta pronto para entrada publica. Acompanhe o status e volte quando a janela abrir.";
  } else if (!isPlayerAuthenticated) {
    title = "Entre para participar";
    description =
      "A acao principal deste campeonato comeca pelo seu login. Depois disso, o portal te leva para o fluxo de entrada com menos atrito.";
  } else if (registrationRequest) {
    title = `Pedido ${statusLabel?.toLowerCase() ?? "enviado"}`;
    description =
      registrationRequest.status === "pending"
        ? "Seu pedido ja foi enviado para o administrador do campeonato e agora aguarda decisao."
        : registrationRequest.status === "approved"
          ? "Seu pedido foi aprovado e voce ja consta como participante aprovado deste campeonato."
          : "Seu pedido foi recusado. O status continua visivel aqui para consulta.";
  } else if (isPublicRegistration) {
    title = "Conta pronta para pedir entrada";
    description = `${playerName?.trim() || "Seu perfil"} ja pode seguir com a inscricao publica deste campeonato.`;
  } else {
    title = "Entrada controlada pela organizacao";
    description =
      "Este campeonato usa inscricao privada. O proximo passo e acompanhar o contato e as validacoes da organizacao.";
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="mobile-dialog sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <InfoRow label="Status" value={getChampionshipStatusLabel(championship.status)} />
          <InfoRow label="Plataforma" value={championship.configuration.platform} />
          <InfoRow label="Formato" value={getFormatOption(championship.configuration.format).label} />
          <InfoRow label="Taxa" value={entryFeeLabel} />
          <InfoRow
            label="Inscricao"
            value={isPublicRegistration ? "Publica com aprovacao" : "Privada pela organizacao"}
          />
          <InfoRow label="Resultados" value={resultsLabel} />
        </div>

        <div className="rounded-2xl border border-border bg-muted/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Leitura do fluxo</p>
          <div className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
            <p>1. Confira formato, calendario e regulamento antes de entrar.</p>
            <p>
              2. {championship.configuration.playerChoosesTeamOnSignup
                ? "O jogador escolhe a conta UT no fluxo de inscricao."
                : "A organizacao define a conta UT ou seed da entrada."}
            </p>
            <p>
              3. {canRegister
                ? "Depois do pedido de entrada, acompanhe o restante pelo seu perfil e pelo proprio campeonato."
                : "Enquanto a janela nao abre, acompanhe tabela, rodadas e fase final por aqui."}
            </p>
          </div>
        </div>

        {registrationRequest && StatusIcon ? (
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className={getRegistrationBadgeClassName(registrationRequest.status)}
              >
                <StatusIcon className="mr-2 h-4 w-4" />
                {statusLabel}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Enviado em {formatMatchDateTime(registrationRequest.requestedAt)}
              </span>
              {registrationRequest.reviewedAt ? (
                <span className="text-sm text-muted-foreground">
                  Revisado em {formatMatchDateTime(registrationRequest.reviewedAt)}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <DialogFooter className="flex flex-wrap gap-3 sm:justify-between">
          <div className="flex flex-wrap gap-3">
            {canRegister && !isPlayerAuthenticated ? (
              <>
                <Button asChild>
                  <Link
                    to={`/entrar?redirect=${encodeURIComponent(`/campeonatos/${championship.id}?acao=participar`)}`}
                  >
                    Entrar
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link
                    to={`/criar-conta?redirect=${encodeURIComponent(`/campeonatos/${championship.id}?acao=participar`)}`}
                  >
                    Criar conta
                  </Link>
                </Button>
              </>
            ) : canRegister && isPublicRegistration ? (
              <>
                <Button
                  onClick={() => void onSubmitRequest()}
                  disabled={Boolean(registrationRequest) || isSubmitting}
                >
                  {registrationRequest ? statusLabel : isSubmitting ? "Enviando..." : "Participar"}
                </Button>
                <Button asChild variant="outline">
                  <Link to="/ajuda">Ler ajuda</Link>
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link to="/explorar">Explorar circuito</Link>
              </Button>
            )}
          </div>

          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Trophy;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-[0.22em]">
          <Icon className="h-4 w-4 text-primary" />
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-2xl border border-border bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="leading-6 text-foreground">{value}</p>
    </div>
  );
}

function ToggleField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="inline-flex rounded-xl border border-border bg-background/70 p-1">
        {[
          { label: "Nao", value: false },
          { label: "Sim", value: true },
        ].map((option) => (
          <button
            key={String(option.value)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              value === option.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  disabled,
  onChange,
  options,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type TeamSummary = Pick<ChampionshipTeam, "id" | "name" | "flagUrl"> & {
  teamPhotoUrl?: string | null;
};

function TeamNameBlock({
  team,
  fallbackName = "A definir",
  align = "left",
  size = "md",
  highlighted = false,
  onOpenTeamProfile,
}: {
  team: TeamSummary | null;
  fallbackName?: string;
  align?: "left" | "right";
  size?: "sm" | "md";
  highlighted?: boolean;
  onOpenTeamProfile?: (teamId: string | null) => void;
}) {
  const label = team?.name ?? fallbackName;
  const canOpenProfile = Boolean(team?.id && onOpenTeamProfile);
  const handleOpenProfile = () => onOpenTeamProfile?.(team?.id ?? null);
  const flagSize = size === "sm" ? "sm" : "md";
  const markPhotoUrl = team?.teamPhotoUrl ?? team?.flagUrl ?? null;
  const markSizeClassName =
    size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  const markFallback = (
    <TeamCrest
      name={label}
      size={size === "sm" ? "sm" : "md"}
      className="h-full w-full rounded-[10px]"
    />
  );
  const mark = markPhotoUrl ? (
    <TeamPhotoBadge
      name={label}
      photoUrl={markPhotoUrl}
      size="sm"
      shape="square"
      className={`${markSizeClassName} border-white/15 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_20px_rgba(0,0,0,0.18)]`}
      fallbackContent={markFallback}
    />
  ) : (
    markFallback
  );

  const content = (
    <>
      {align === "left" ? mark : null}
      <div className="min-w-0">
        <div
          className={`flex items-center gap-2 ${
            align === "right" ? "justify-end" : "justify-start"
          }`}
        >
          <span
            className={`truncate transition ${
              canOpenProfile ? "group-hover:text-primary" : ""
            } ${highlighted ? "font-semibold text-foreground" : "text-foreground"} ${
              size === "sm" ? "text-base" : "font-medium"
            }`}
          >
            {label}
          </span>
          <TeamFlagBadge teamName={label} flagUrl={team?.flagUrl ?? null} size={flagSize} />
        </div>
      </div>
      {align === "right" ? mark : null}
    </>
  );

  const className = `group flex min-w-0 max-w-full items-center gap-3 rounded-xl transition ${
    canOpenProfile
      ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      : ""
  } ${align === "right" ? "justify-end text-right" : "justify-start text-left"}`;

  if (canOpenProfile) {
    return (
      <button
        type="button"
        onClick={handleOpenProfile}
        className={className}
        title={`Abrir perfil de ${label}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}

function StandingsBoard({
  title,
  description,
  rows,
  qualifiedCount,
  teamsById,
  onOpenTeamProfile,
}: {
  title: string;
  description: string;
  rows: ReturnType<typeof computeGroupStandings>[number]["rows"];
  qualifiedCount: number;
  teamsById: Map<string, ChampionshipTeam>;
  onOpenTeamProfile?: (teamId: string | null) => void;
}) {
  return (
    <section className="border-t border-border/70 pt-4">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{title}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/80 text-left text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <th className="py-3 pr-3">#</th>
              <th className="py-3 pr-3">Classificacao</th>
              <th className="py-3 pr-3 text-center">P</th>
              <th className="py-3 pr-3 text-center">J</th>
              <th className="py-3 pr-3 text-center">V</th>
              <th className="py-3 pr-3 text-center">E</th>
              <th className="py-3 pr-3 text-center">D</th>
              <th className="py-3 pr-3 text-center">GP</th>
              <th className="py-3 pr-3 text-center">GC</th>
              <th className="py-3 text-center">SG</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isQualified = qualifiedCount > 0 && row.position <= qualifiedCount;
              const team = teamsById.get(row.teamId) ?? null;

              return (
                <tr key={row.teamId} className="border-b border-border/50">
                  <td
                    className={`py-3 pr-3 text-center font-semibold ${
                      isQualified ? "bg-primary/12 text-primary" : "text-foreground"
                    }`}
                  >
                    {row.position}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="space-y-1">
                      <TeamNameBlock team={team} fallbackName={row.teamName} onOpenTeamProfile={onOpenTeamProfile} />
                      {row.pointsAdjustment !== 0 ? (
                        <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          Ajuste {row.pointsAdjustment > 0 ? "+" : ""}
                          {row.pointsAdjustment}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-center font-semibold text-foreground">{row.points}</td>
                  <td className="py-3 pr-3 text-center text-muted-foreground">{row.played}</td>
                  <td className="py-3 pr-3 text-center text-muted-foreground">{row.wins}</td>
                  <td className="py-3 pr-3 text-center text-muted-foreground">{row.draws}</td>
                  <td className="py-3 pr-3 text-center text-muted-foreground">{row.losses}</td>
                  <td className="py-3 pr-3 text-center text-muted-foreground">{row.goalsFor}</td>
                  <td className="py-3 pr-3 text-center text-muted-foreground">{row.goalsAgainst}</td>
                  <td className="py-3 text-center text-muted-foreground">{row.goalDifference}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RoundMatchesBoard({
  title,
  description,
  groupLabel,
  rounds,
  selectedRoundNumber,
  onSelectRound,
  teamsById,
  onOpenTeamProfile,
  isAdmin,
  onEditMatch,
}: {
  title: string;
  description: string;
  groupLabel: string;
  rounds: Array<[number, ChampionshipGroupMatch[]]>;
  selectedRoundNumber: number;
  onSelectRound: (roundNumber: number) => void;
  teamsById: Map<string, ChampionshipTeam>;
  onOpenTeamProfile?: (teamId: string | null) => void;
  isAdmin: boolean;
  onEditMatch: (match: ChampionshipGroupMatch) => void;
}) {
  const availableRounds = rounds.map(([roundNumber]) => roundNumber);
  const selectedRoundIndex = Math.max(
    0,
    availableRounds.findIndex((roundNumber) => roundNumber === selectedRoundNumber),
  );
  const currentRoundEntry =
    rounds[selectedRoundIndex] ?? rounds[0] ?? [selectedRoundNumber, []];
  const [, currentMatches] = currentRoundEntry;
  const canGoPrevious = selectedRoundIndex > 0;
  const canGoNext = selectedRoundIndex < rounds.length - 1;

  return (
    <section className="border-t border-border/70 pt-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{title}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {rounds.length > 0 ? (
          <div className="flex items-center gap-2 self-start">
            <button
              type="button"
              disabled={!canGoPrevious}
              onClick={() => onSelectRound(availableRounds[selectedRoundIndex - 1] ?? selectedRoundNumber)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground transition hover:border-primary/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-[110px] text-center text-xs uppercase tracking-[0.24em] text-foreground">
              Rodada {selectedRoundNumber}
            </div>
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => onSelectRound(availableRounds[selectedRoundIndex + 1] ?? selectedRoundNumber)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground transition hover:border-primary/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {rounds.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {availableRounds.map((roundNumber) => (
              <button
                key={roundNumber}
                type="button"
                onClick={() => onSelectRound(roundNumber)}
                className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] transition ${
                  roundNumber === selectedRoundNumber
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-background/60 text-muted-foreground hover:border-primary/20 hover:text-foreground"
                }`}
              >
                R{roundNumber}
              </button>
            ))}
          </div>
        ) : null}

        {rounds.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                {groupLabel}
              </h3>
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {currentMatches.length} jogos
              </span>
            </div>
            <div className="space-y-3">
              {currentMatches.map((match) => (
                <RoundMatchRow
                  key={match.id}
                  homeTeam={teamsById.get(match.homeTeamId) ?? null}
                  awayTeam={teamsById.get(match.awayTeamId) ?? null}
                  scoreHome={match.scoreHome}
                  scoreAway={match.scoreAway}
                  statusLabel={match.status === "completed" ? "Encerrada" : "Pendente"}
                  metaLabel={formatMatchDateTime(match.playedAt)}
                  secondaryMeta={match.venue || "Local a definir"}
                  onOpenTeamProfile={onOpenTeamProfile}
                  onEditMatch={isAdmin ? () => onEditMatch(match) : undefined}
                />
              ))}
            </div>
          </div>
        ) : (
            <div className="rounded-2xl border border-border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
              Nenhuma partida foi gerada para este recorte ainda.
            </div>
          )}
      </div>
    </section>
  );
}

function RoundMatchRow({
  homeTeam,
  awayTeam,
  scoreHome,
  scoreAway,
  statusLabel,
  metaLabel,
  secondaryMeta,
  winnerTeamId,
  onOpenTeamProfile,
  onEditMatch,
}: {
  homeTeam: TeamSummary | null;
  awayTeam: TeamSummary | null;
  scoreHome: number | null;
  scoreAway: number | null;
  statusLabel: string;
  metaLabel: string;
  secondaryMeta: string;
  winnerTeamId?: string | null;
  onOpenTeamProfile?: (teamId: string | null) => void;
  onEditMatch?: () => void;
}) {
  return (
    <article className="w-full border-b border-border/50 pb-4 text-left last:border-b-0">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
        <TeamNameBlock
          team={homeTeam}
          align="right"
          size="sm"
          highlighted={Boolean(winnerTeamId && winnerTeamId === homeTeam?.id)}
          onOpenTeamProfile={onOpenTeamProfile}
        />

        <div className="flex items-center gap-1">
          <ScoreBox score={scoreHome} highlighted={Boolean(winnerTeamId && winnerTeamId === homeTeam?.id)} />
          <ScoreBox score={scoreAway} highlighted={Boolean(winnerTeamId && winnerTeamId === awayTeam?.id)} />
        </div>

        <TeamNameBlock
          team={awayTeam}
          align="left"
          size="sm"
          highlighted={Boolean(winnerTeamId && winnerTeamId === awayTeam?.id)}
          onOpenTeamProfile={onOpenTeamProfile}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>{metaLabel}</span>
        <span>{secondaryMeta}</span>
        <span>{statusLabel}</span>
      </div>
      {onEditMatch ? (
        <div className="mt-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={onEditMatch}>
            Editar partida
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function MatchCard({
  title,
  homeLabel,
  awayLabel,
  scoreHome,
  scoreAway,
  statusLabel,
  metaLabel,
  secondaryMeta,
  winnerTeamId,
  homeTeamId,
  awayTeamId,
  homeFlagUrl,
  awayFlagUrl,
  homeTeamPhotoUrl,
  awayTeamPhotoUrl,
  onClick,
  onOpenTeamProfile,
}: {
  title: string;
  homeLabel: string;
  awayLabel: string;
  scoreHome: number | null;
  scoreAway: number | null;
  statusLabel: string;
  metaLabel: string;
  secondaryMeta: string;
  winnerTeamId?: string | null;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  homeFlagUrl?: string | null;
  awayFlagUrl?: string | null;
  homeTeamPhotoUrl?: string | null;
  awayTeamPhotoUrl?: string | null;
  onClick?: () => void;
  onOpenTeamProfile?: (teamId: string | null) => void;
}) {
  const homeTeam = homeTeamId
    ? {
        id: homeTeamId,
        name: homeLabel,
        flagUrl: homeFlagUrl ?? null,
        teamPhotoUrl: homeTeamPhotoUrl ?? null,
      }
    : null;
  const awayTeam = awayTeamId
    ? {
        id: awayTeamId,
        name: awayLabel,
        flagUrl: awayFlagUrl ?? null,
        teamPhotoUrl: awayTeamPhotoUrl ?? null,
      }
    : null;

  return (
    <article className="rounded-2xl border border-border/80 bg-background/70 p-3 text-left shadow-[0_10px_24px_hsl(0_0%_0%_/_0.16)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{metaLabel}</p>
        </div>
        <Badge
          variant={winnerTeamId ? "secondary" : "outline"}
          className="shrink-0 text-[10px] uppercase tracking-[0.14em]"
        >
          {statusLabel}
        </Badge>
      </div>

      <div className="space-y-2">
        <BracketTeamLine
          team={homeTeam}
          fallbackName={homeLabel}
          score={scoreHome}
          highlighted={Boolean(winnerTeamId && winnerTeamId === homeTeamId)}
          onOpenTeamProfile={onOpenTeamProfile}
        />
        <BracketTeamLine
          team={awayTeam}
          fallbackName={awayLabel}
          score={scoreAway}
          highlighted={Boolean(winnerTeamId && winnerTeamId === awayTeamId)}
          onOpenTeamProfile={onOpenTeamProfile}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        <span className="min-w-0 truncate">{secondaryMeta}</span>
        {onClick ? (
          <Button variant="outline" size="sm" onClick={onClick} className="h-8 rounded-full px-3 text-[11px]">
            Editar
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function BracketTeamLine({
  team,
  fallbackName,
  score,
  highlighted,
  onOpenTeamProfile,
}: {
  team: TeamSummary | null;
  fallbackName: string;
  score: number | null;
  highlighted: boolean;
  onOpenTeamProfile?: (teamId: string | null) => void;
}) {
  const canOpenProfile = Boolean(team?.id && onOpenTeamProfile);
  const content = (
    <>
      <TeamNameBlock
        team={team}
        fallbackName={fallbackName}
        align="left"
        size="sm"
        highlighted={highlighted}
        onOpenTeamProfile={canOpenProfile ? undefined : onOpenTeamProfile}
      />
      <ScoreBox score={score} highlighted={highlighted} size="sm" />
    </>
  );
  const className = `flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition ${
    highlighted
      ? "border-primary/35 bg-primary/10"
      : "border-border/70 bg-muted/20"
  } ${
    canOpenProfile
      ? "w-full cursor-pointer hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      : ""
  }`;

  if (canOpenProfile) {
    return (
      <button
        type="button"
        onClick={() => onOpenTeamProfile?.(team?.id ?? null)}
        className={className}
        title={`Abrir perfil de ${team?.name ?? fallbackName}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}

function ScoreBox({
  score,
  highlighted,
  size = "md",
}: {
  score: number | null;
  highlighted: boolean;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "h-9 w-10 rounded-lg text-base" : "h-11 w-11 rounded-sm text-lg";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border font-semibold ${sizeClass} ${
        highlighted
          ? "border-primary/30 bg-primary/12 text-primary"
          : "border-border bg-background/70 text-foreground"
      }`}
    >
      {score ?? "-"}
    </span>
  );
}

function GroupMatchDialog({
  match,
  teams,
  onClose,
  onSave,
}: {
  match: ChampionshipGroupMatch | null;
  teams: ChampionshipTeam[];
  onClose: () => void;
  onSave: (patch: GroupMatchUpdateInput) => Promise<void>;
}) {
  const [form, setForm] = useState<GroupMatchUpdateInput>({
    playedAt: null,
    venue: "",
    scoreHome: null,
    scoreAway: null,
  });

  useEffect(() => {
    if (!match) {
      return;
    }

    setForm({
      playedAt: match.playedAt,
      venue: match.venue,
      scoreHome: match.scoreHome,
      scoreAway: match.scoreAway,
    });
  }, [match]);

  return (
    <Dialog open={Boolean(match)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="mobile-dialog sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar partida da fase de grupos</DialogTitle>
          <DialogDescription>
            {match
              ? `${getTeamName(teams, match.homeTeamId)} x ${getTeamName(teams, match.awayTeamId)}`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Data e horario</span>
            <input
              type="datetime-local"
              value={toDateTimeLocalValue(form.playedAt ?? null)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  playedAt: event.target.value ? new Date(event.target.value).toISOString() : null,
                }))
              }
              className={inputClassName}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Local</span>
            <input
              value={form.venue ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, venue: event.target.value }))}
              className={inputClassName}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Placar mandante</span>
              <input
                type="number"
                value={form.scoreHome ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scoreHome: event.target.value === "" ? null : Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Placar visitante</span>
              <input
                type="number"
                value={form.scoreAway ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scoreAway: event.target.value === "" ? null : Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void onSave(form)}>Salvar partida</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BracketMatchDialog({
  match,
  teams,
  qualifiedTeams,
  onClose,
  onSave,
}: {
  match: ChampionshipBracketMatch | null;
  teams: ChampionshipTeam[];
  qualifiedTeams: ReturnType<typeof getQualifiedTeams>;
  onClose: () => void;
  onSave: (patch: BracketMatchUpdateInput) => Promise<void>;
}) {
  const [form, setForm] = useState<BracketMatchUpdateInput>({
    playedAt: null,
    venue: "",
    scoreHome: null,
    scoreAway: null,
    penaltiesHome: null,
    penaltiesAway: null,
    resolution: null,
    winnerTeamId: null,
    manualHomeTeamId: null,
    manualAwayTeamId: null,
  });

  useEffect(() => {
    if (!match) {
      return;
    }

    setForm({
      playedAt: match.playedAt,
      venue: match.venue,
      scoreHome: match.scoreHome,
      scoreAway: match.scoreAway,
      penaltiesHome: match.penaltiesHome,
      penaltiesAway: match.penaltiesAway,
      resolution: match.resolution,
      winnerTeamId: match.winnerTeamId,
      manualHomeTeamId: match.sourceHome.type === "manual-team" ? match.sourceHome.teamId : null,
      manualAwayTeamId: match.sourceAway.type === "manual-team" ? match.sourceAway.teamId : null,
    });
  }, [match]);

  return (
    <Dialog open={Boolean(match)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="mobile-dialog sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar confronto do mata-mata</DialogTitle>
          <DialogDescription>
            {match ? `${match.stageName} ${match.matchOrder}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {match?.sourceHome.type === "manual-team" && match?.sourceAway.type === "manual-team" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Equipe mandante"
                value={form.manualHomeTeamId ?? ""}
                disabled={false}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    manualHomeTeamId: value || null,
                  }))
                }
                options={[
                  { value: "", label: "A definir" },
                  ...qualifiedTeams.map((team) => ({ value: team.teamId, label: team.teamName })),
                ]}
              />
              <SelectField
                label="Equipe visitante"
                value={form.manualAwayTeamId ?? ""}
                disabled={false}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    manualAwayTeamId: value || null,
                  }))
                }
                options={[
                  { value: "", label: "A definir" },
                  ...qualifiedTeams.map((team) => ({ value: team.teamId, label: team.teamName })),
                ]}
              />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Data e horario</span>
              <input
                type="datetime-local"
                value={toDateTimeLocalValue(form.playedAt ?? null)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    playedAt: event.target.value ? new Date(event.target.value).toISOString() : null,
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Local</span>
              <input
                value={form.venue ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, venue: event.target.value }))}
                className={inputClassName}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Placar mandante</span>
              <input
                type="number"
                value={form.scoreHome ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scoreHome: event.target.value === "" ? null : Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Placar visitante</span>
              <input
                type="number"
                value={form.scoreAway ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scoreAway: event.target.value === "" ? null : Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <SelectField
              label="Desempate"
              value={form.resolution ?? ""}
              disabled={false}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  resolution: (value || null) as BracketMatchUpdateInput["resolution"],
                }))
              }
              options={[
                { value: "", label: "Sem criterio" },
                { value: "normal", label: "Tempo normal" },
                { value: "extra-time", label: "Prorrogacao" },
                { value: "penalties", label: "Penaltis" },
                { value: "wo", label: "WO" },
              ]}
            />
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Penaltis mandante</span>
              <input
                type="number"
                value={form.penaltiesHome ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    penaltiesHome: event.target.value === "" ? null : Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Penaltis visitante</span>
              <input
                type="number"
                value={form.penaltiesAway ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    penaltiesAway: event.target.value === "" ? null : Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </label>
          </div>

          <SelectField
            label="Vencedor"
            value={form.winnerTeamId ?? ""}
            disabled={false}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                winnerTeamId: value || null,
              }))
            }
            options={[
              { value: "", label: "Definir depois" },
              ...(match?.homeTeamId
                ? [{ value: match.homeTeamId, label: getTeamName(teams, match.homeTeamId) }]
                : []),
              ...(match?.awayTeamId
                ? [{ value: match.awayTeamId, label: getTeamName(teams, match.awayTeamId) }]
                : []),
            ]}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void onSave(form)}>Salvar confronto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
