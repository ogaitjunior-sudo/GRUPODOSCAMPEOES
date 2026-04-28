import { generateBracket } from "@/lib/championship-bracket";
import {
  buildRoundRobinMatches,
  createDefaultGroups,
  createEmptyBracketState,
  createRuntimeId,
  normalizeChampionshipWorkspace,
  nowIso,
  snakeAssignTeams,
} from "@/lib/championship-runtime";
import { normalizeChampionshipConfiguration } from "@/lib/championships";
import type {
  ChampionshipRecord,
  ChampionshipRegistrationRequest,
  ChampionshipStatus,
} from "@/types/championship";
import type { ChampionshipTeam, ChampionshipWorkspaceRecord } from "@/types/championship-runtime";

export function getChampionshipMaxTeams(championship: Pick<ChampionshipRecord, "teamCount">) {
  return Math.max(2, Number(championship.teamCount) || 2);
}

export function getChampionshipMinimumTeamsForTable(championship: ChampionshipRecord) {
  const configuration = normalizeChampionshipConfiguration(championship.configuration);
  const maxTeams = getChampionshipMaxTeams(championship);

  if (configuration.groupCount <= 0) {
    return 2;
  }

  return Math.min(maxTeams, Math.max(2, configuration.groupCount * 2));
}

export function hasChampionshipTable(workspace: ChampionshipWorkspaceRecord) {
  return (
    workspace.groups.length > 0 ||
    workspace.groupMatches.length > 0 ||
    workspace.bracket.matches.length > 0
  );
}

export function getChampionshipParticipantStatus(
  championship: ChampionshipRecord,
  participantCount: number,
): ChampionshipStatus {
  if (championship.status === "STARTED" || championship.status === "FINISHED") {
    return championship.status;
  }

  if (championship.status === "DRAFT") {
    return championship.status;
  }

  return participantCount >= getChampionshipMaxTeams(championship) ? "READY" : "REGISTRATION";
}

export function validateChampionshipParticipantEntry(
  workspace: ChampionshipWorkspaceRecord,
  championship: ChampionshipRecord,
  request: Pick<ChampionshipRegistrationRequest, "playerId" | "playerEmail" | "playerName">,
) {
  const maxTeams = getChampionshipMaxTeams(championship);
  const normalizedEmail = request.playerEmail.trim().toLowerCase();
  const normalizedName = request.playerName.trim().toLowerCase();

  if (championship.status !== "REGISTRATION" && championship.status !== "READY") {
    return "Este campeonato nao esta em fase de inscricao.";
  }

  if (workspace.teams.length >= maxTeams) {
    return "O limite maximo de participantes deste campeonato ja foi atingido.";
  }

  if (workspace.teams.some((team) => team.playerId === request.playerId)) {
    return "Este jogador ja esta inscrito no campeonato.";
  }

  if (
    normalizedEmail &&
    workspace.teams.some((team) => team.playerEmail?.toLowerCase() === normalizedEmail)
  ) {
    return "Este e-mail ja esta inscrito no campeonato.";
  }

  if (
    normalizedName &&
    workspace.teams.some((team) => team.name.trim().toLowerCase() === normalizedName)
  ) {
    return "Ja existe um participante com este nome no campeonato.";
  }

  return null;
}

export function addParticipantToChampionshipWorkspace(
  workspace: ChampionshipWorkspaceRecord,
  championship: ChampionshipRecord,
  request: Pick<ChampionshipRegistrationRequest, "playerId" | "playerEmail" | "playerName">,
) {
  const validationMessage = validateChampionshipParticipantEntry(workspace, championship, request);

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const nextSeed =
    workspace.teams.reduce((highestSeed, team) => Math.max(highestSeed, team.seed), 0) + 1;
  const captainName = request.playerName.trim() || null;
  const nextTeam: ChampionshipTeam = {
    id: createRuntimeId("team"),
    name: captainName ?? `Participante ${nextSeed}`,
    playerId: request.playerId,
    playerEmail: request.playerEmail.trim().toLowerCase() || null,
    seed: nextSeed,
    groupId: null,
    pointsAdjustment: 0,
    flagUrl: null,
    captainName,
    roster: captainName ? [captainName] : [],
  };

  return normalizeChampionshipWorkspace(
    {
      ...workspace,
      teams: [...workspace.teams, nextTeam],
      updatedAt: nowIso(),
    },
    championship,
  );
}

export function validateChampionshipTableGeneration(
  workspace: ChampionshipWorkspaceRecord,
  championship: ChampionshipRecord,
) {
  const participantCount = workspace.teams.length;
  const minimumTeams = getChampionshipMinimumTeamsForTable(championship);
  const maxTeams = getChampionshipMaxTeams(championship);

  if (hasChampionshipTable(workspace)) {
    return "A tabela deste campeonato ja foi criada.";
  }

  if (championship.status !== "READY" && championship.status !== "REGISTRATION") {
    return "A tabela so pode ser gerada durante inscricao ou quando o campeonato estiver pronto.";
  }

  if (participantCount < minimumTeams) {
    return `Insira pelo menos ${minimumTeams} participantes antes de gerar a tabela.`;
  }

  if (participantCount > maxTeams) {
    return `O campeonato possui ${participantCount} participantes, acima do limite de ${maxTeams}.`;
  }

  return null;
}

export function generateChampionshipTable(
  workspace: ChampionshipWorkspaceRecord,
  championship: ChampionshipRecord,
) {
  const validationMessage = validateChampionshipTableGeneration(workspace, championship);

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const configuration = normalizeChampionshipConfiguration(championship.configuration);
  const orderedTeams = [...workspace.teams].sort((left, right) => left.seed - right.seed);
  const baseWorkspace: ChampionshipWorkspaceRecord = {
    ...workspace,
    teams: orderedTeams.map((team) => ({ ...team, groupId: null })),
    groups: [],
    groupMatches: [],
    bracket: createEmptyBracketState(),
    updatedAt: nowIso(),
  };

  if (configuration.groupCount <= 0) {
    return generateBracket(normalizeChampionshipWorkspace(baseWorkspace, championship), championship);
  }

  const groups = createDefaultGroups(configuration.groupCount);
  const assignedTeams = snakeAssignTeams(orderedTeams, groups);
  const scheduledWorkspace = normalizeChampionshipWorkspace(
    {
      ...baseWorkspace,
      teams: assignedTeams,
      groups,
      groupMatches: buildRoundRobinMatches(championship.id, groups, assignedTeams),
      updatedAt: nowIso(),
    },
    championship,
  );

  return scheduledWorkspace;
}
