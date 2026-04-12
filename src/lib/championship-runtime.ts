import { normalizeChampionshipConfiguration } from "@/lib/championships";
import type { ChampionshipRecord } from "@/types/championship";
import type {
  BracketMatchStatus,
  BracketProgressState,
  ChampionshipBracketMatch,
  ChampionshipBracketRound,
  ChampionshipBracketSource,
  ChampionshipBracketState,
  ChampionshipGroup,
  ChampionshipGroupMatch,
  ChampionshipScoringSettings,
  ChampionshipTeam,
  ChampionshipWorkspaceRecord,
  GroupMatchUpdateInput,
  GroupStandingGroup,
  GroupStandingRow,
} from "@/types/championship-runtime";

const BYE = "__BYE__";

export function createRuntimeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function createDefaultScoring(): ChampionshipScoringSettings {
  return {
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
  };
}

export function createEmptyBracketState(): ChampionshipBracketState {
  return {
    state: "not-generated",
    consistencyStatus: "idle",
    consistencyMessage: null,
    classificationSignature: null,
    generatedAt: null,
    rounds: [],
    matches: [],
  };
}

export function stageKeyToLabel(
  stageKey: ChampionshipBracketRound["stageKey"],
  championship: ChampionshipRecord,
) {
  const phaseLabels = normalizeChampionshipConfiguration(championship.configuration).phaseLabels;

  switch (stageKey) {
    case "round-of-16":
      return phaseLabels.roundOf16;
    case "quarterfinal":
      return phaseLabels.quarterfinal;
    case "semifinal":
      return phaseLabels.semifinal;
    case "third-place":
      return phaseLabels.thirdPlace;
    default:
      return phaseLabels.final;
  }
}

export function normalizeScoring(scoring: ChampionshipScoringSettings | undefined) {
  const defaults = createDefaultScoring();

  return {
    winPoints: Number.isFinite(Number(scoring?.winPoints)) ? Number(scoring?.winPoints) : defaults.winPoints,
    drawPoints: Number.isFinite(Number(scoring?.drawPoints))
      ? Number(scoring?.drawPoints)
      : defaults.drawPoints,
    lossPoints: Number.isFinite(Number(scoring?.lossPoints))
      ? Number(scoring?.lossPoints)
      : defaults.lossPoints,
  };
}

function groupNameFromIndex(index: number) {
  return `Grupo ${String.fromCharCode(65 + index)}`;
}

function createPlaceholderTeams(teamCount: number): ChampionshipTeam[] {
  return Array.from({ length: Math.max(2, teamCount) }, (_, index) => ({
    id: createRuntimeId("team"),
    name: `Equipe ${index + 1}`,
    seed: index + 1,
    groupId: null,
    pointsAdjustment: 0,
  }));
}

function createDefaultGroups(groupCount: number): ChampionshipGroup[] {
  return Array.from({ length: Math.max(0, groupCount) }, (_, index) => ({
    id: createRuntimeId("group"),
    name: groupNameFromIndex(index),
    order: index + 1,
  }));
}

function normalizeTeams(teams: ChampionshipTeam[] | undefined, fallbackCount: number) {
  const source = teams?.length ? teams : createPlaceholderTeams(fallbackCount);

  return source
    .map((team, index) => ({
      id: typeof team.id === "string" && team.id ? team.id : createRuntimeId("team"),
      name: String(team.name ?? `Equipe ${index + 1}`).trim() || `Equipe ${index + 1}`,
      seed: Math.max(1, Number(team.seed ?? index + 1)),
      groupId: typeof team.groupId === "string" && team.groupId ? team.groupId : null,
      pointsAdjustment: Number(team.pointsAdjustment ?? 0),
    }))
    .sort((left, right) => left.seed - right.seed);
}

function normalizeGroups(groups: ChampionshipGroup[] | undefined) {
  return (groups ?? [])
    .map((group, index) => ({
      id: typeof group.id === "string" && group.id ? group.id : createRuntimeId("group"),
      name: String(group.name ?? groupNameFromIndex(index)).trim() || groupNameFromIndex(index),
      order: Math.max(1, Number(group.order ?? index + 1)),
    }))
    .sort((left, right) => left.order - right.order);
}

function normalizeGroupMatches(matches: ChampionshipGroupMatch[] | undefined, championshipId: string) {
  return (matches ?? [])
    .map((match) => ({
      id: typeof match.id === "string" && match.id ? match.id : createRuntimeId("group-match"),
      championshipId,
      groupId: match.groupId,
      roundNumber: Math.max(1, Number(match.roundNumber ?? 1)),
      matchOrder: Math.max(1, Number(match.matchOrder ?? 1)),
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      playedAt: match.playedAt ?? null,
      venue: String(match.venue ?? ""),
      scoreHome:
        typeof match.scoreHome === "number" && Number.isFinite(match.scoreHome) ? match.scoreHome : null,
      scoreAway:
        typeof match.scoreAway === "number" && Number.isFinite(match.scoreAway) ? match.scoreAway : null,
      status:
        typeof match.scoreHome === "number" && typeof match.scoreAway === "number"
          ? "completed"
          : "scheduled",
    }))
    .sort((left, right) => {
      if (left.groupId !== right.groupId) {
        return left.groupId.localeCompare(right.groupId);
      }

      if (left.roundNumber !== right.roundNumber) {
        return left.roundNumber - right.roundNumber;
      }

      return left.matchOrder - right.matchOrder;
    });
}

function normalizeBracketRounds(
  rounds: ChampionshipBracketRound[] | undefined,
  championship: ChampionshipRecord,
) {
  return (rounds ?? [])
    .map((round, index) => ({
      id: typeof round.id === "string" && round.id ? round.id : createRuntimeId("bracket-round"),
      stageKey: round.stageKey,
      stageName: stageKeyToLabel(round.stageKey, championship),
      roundOrder: Math.max(1, Number(round.roundOrder ?? index + 1)),
      visualOrder: Math.max(1, Number(round.visualOrder ?? index + 1)),
    }))
    .sort((left, right) => left.roundOrder - right.roundOrder);
}

function normalizeBracketMatches(
  matches: ChampionshipBracketMatch[] | undefined,
  championship: ChampionshipRecord,
) {
  return (matches ?? [])
    .map((match) => ({
      id: typeof match.id === "string" && match.id ? match.id : createRuntimeId("bracket-match"),
      championshipId: championship.id,
      roundId: match.roundId,
      stageKey: match.stageKey,
      stageName: stageKeyToLabel(match.stageKey, championship),
      roundOrder: Math.max(1, Number(match.roundOrder ?? 1)),
      matchOrder: Math.max(1, Number(match.matchOrder ?? 1)),
      homeTeamId: match.homeTeamId ?? null,
      awayTeamId: match.awayTeamId ?? null,
      sourceHome: match.sourceHome,
      sourceAway: match.sourceAway,
      winnerTeamId: match.winnerTeamId ?? null,
      loserTeamId: match.loserTeamId ?? null,
      nextMatchId: match.nextMatchId ?? null,
      nextSlot: match.nextSlot ?? null,
      loserNextMatchId: match.loserNextMatchId ?? null,
      loserNextSlot: match.loserNextSlot ?? null,
      scoreHome:
        typeof match.scoreHome === "number" && Number.isFinite(match.scoreHome) ? match.scoreHome : null,
      scoreAway:
        typeof match.scoreAway === "number" && Number.isFinite(match.scoreAway) ? match.scoreAway : null,
      penaltiesHome:
        typeof match.penaltiesHome === "number" && Number.isFinite(match.penaltiesHome)
          ? match.penaltiesHome
          : null,
      penaltiesAway:
        typeof match.penaltiesAway === "number" && Number.isFinite(match.penaltiesAway)
          ? match.penaltiesAway
          : null,
      playedAt: match.playedAt ?? null,
      venue: String(match.venue ?? ""),
      resolution: match.resolution ?? null,
      status: match.status ?? "pending",
    }))
    .sort((left, right) => {
      if (left.roundOrder !== right.roundOrder) {
        return left.roundOrder - right.roundOrder;
      }

      return left.matchOrder - right.matchOrder;
    });
}

function snakeAssignTeams(teams: ChampionshipTeam[], groups: ChampionshipGroup[]) {
  if (!groups.length) {
    return teams.map((team) => ({ ...team, groupId: null }));
  }

  const groupIds = groups.map((group) => group.id);
  const orderedTeams = [...teams].sort((left, right) => left.seed - right.seed);
  let forward = true;
  let cursor = 0;

  return orderedTeams.map((team) => {
    const nextGroupId = groupIds[cursor];
    const nextTeam = { ...team, groupId: nextGroupId };

    if (forward) {
      if (cursor === groupIds.length - 1) {
        forward = false;
      } else {
        cursor += 1;
      }
    } else if (cursor === 0) {
      forward = true;
    } else {
      cursor -= 1;
    }

    return nextTeam;
  });
}

function buildRoundRobinMatches(
  championshipId: string,
  groups: ChampionshipGroup[],
  teams: ChampionshipTeam[],
) {
  const matches: ChampionshipGroupMatch[] = [];

  groups.forEach((group) => {
    const groupTeamIds = teams
      .filter((team) => team.groupId === group.id)
      .sort((left, right) => left.seed - right.seed)
      .map((team) => team.id);

    if (groupTeamIds.length < 2) {
      return;
    }

    const participants = [...groupTeamIds];

    if (participants.length % 2 === 1) {
      participants.push(BYE);
    }

    const totalRounds = participants.length - 1;
    const halfSize = participants.length / 2;
    const rotating = participants.slice(1);

    for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
      const roundParticipants = [participants[0], ...rotating];

      for (let pairIndex = 0; pairIndex < halfSize; pairIndex += 1) {
        const first = roundParticipants[pairIndex];
        const second = roundParticipants[roundParticipants.length - 1 - pairIndex];

        if (first === BYE || second === BYE) {
          continue;
        }

        const shouldSwapHome = pairIndex % 2 === roundIndex % 2;

        matches.push({
          id: createRuntimeId("group-match"),
          championshipId,
          groupId: group.id,
          roundNumber: roundIndex + 1,
          matchOrder: pairIndex + 1,
          homeTeamId: shouldSwapHome ? second : first,
          awayTeamId: shouldSwapHome ? first : second,
          playedAt: null,
          venue: "",
          scoreHome: null,
          scoreAway: null,
          status: "scheduled",
        });
      }

      rotating.unshift(rotating.pop()!);
    }
  });

  return matches;
}

function clearBracketResult(match: ChampionshipBracketMatch): ChampionshipBracketMatch {
  return {
    ...match,
    winnerTeamId: null,
    loserTeamId: null,
    scoreHome: null,
    scoreAway: null,
    penaltiesHome: null,
    penaltiesAway: null,
    resolution: null,
  };
}

function inferWinnerFromMatch(match: ChampionshipBracketMatch) {
  if (!match.homeTeamId || !match.awayTeamId) {
    return match;
  }

  if (typeof match.scoreHome !== "number" || typeof match.scoreAway !== "number") {
    return match;
  }

  if (match.scoreHome !== match.scoreAway) {
    const winnerTeamId = match.scoreHome > match.scoreAway ? match.homeTeamId : match.awayTeamId;

    return {
      ...match,
      winnerTeamId,
      loserTeamId: winnerTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId,
      status: "completed",
      resolution: match.resolution ?? "normal",
    };
  }

  if (
    match.resolution === "penalties" &&
    typeof match.penaltiesHome === "number" &&
    typeof match.penaltiesAway === "number" &&
    match.penaltiesHome !== match.penaltiesAway
  ) {
    const winnerTeamId = match.penaltiesHome > match.penaltiesAway ? match.homeTeamId : match.awayTeamId;

    return {
      ...match,
      winnerTeamId,
      loserTeamId: winnerTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId,
      status: "completed",
    };
  }

  if (match.winnerTeamId && [match.homeTeamId, match.awayTeamId].includes(match.winnerTeamId)) {
    return {
      ...match,
      loserTeamId: match.winnerTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId,
      status: "completed",
    };
  }

  return {
    ...match,
    winnerTeamId: null,
    loserTeamId: null,
    status: "ready",
  };
}

function resolveBracketMatchStatus(match: ChampionshipBracketMatch): BracketMatchStatus {
  if (match.winnerTeamId) {
    return "completed";
  }

  if (match.homeTeamId && match.awayTeamId) {
    return "ready";
  }

  return "pending";
}

function createResolvedSourceLabel(teamName: string, fallback: string) {
  return teamName.trim() || fallback;
}

function resolveSourceTeamId(
  source: ChampionshipBracketSource,
  resultLookup: Map<string, ChampionshipBracketMatch>,
) {
  if (source.type === "manual-team") {
    return source.teamId;
  }

  const parentMatch = resultLookup.get(source.matchId);

  if (!parentMatch) {
    return null;
  }

  return source.type === "match-winner" ? parentMatch.winnerTeamId : parentMatch.loserTeamId;
}

export function deriveBracketProgressState(matches: ChampionshipBracketMatch[]): BracketProgressState {
  if (!matches.length) {
    return "not-generated";
  }

  const decisiveFinal = matches.find((match) => match.stageKey === "final");

  if (decisiveFinal?.winnerTeamId) {
    return "completed";
  }

  if (matches.some((match) => match.winnerTeamId)) {
    return "in-progress";
  }

  return "generated";
}

export function buildQualificationSignature(
  workspace: ChampionshipWorkspaceRecord,
  championship: ChampionshipRecord,
  standings: GroupStandingGroup[],
) {
  const configuration = normalizeChampionshipConfiguration(championship.configuration);

  if (workspace.groups.length === 0) {
    return workspace.teams
      .slice()
      .sort((left, right) => left.seed - right.seed)
      .map((team) => `${team.id}:${team.seed}:${team.pointsAdjustment}`)
      .join("|");
  }

  return standings
    .map((group) =>
      `${group.groupId}:${group.rows
        .slice(0, configuration.qualifiedPerGroup)
        .map((row) => `${row.teamId}:${row.points}:${row.goalDifference}:${row.goalsFor}`)
        .join(",")}`,
    )
    .join("|");
}

export function resolveBracketState(
  bracket: ChampionshipBracketState,
  workspace: ChampionshipWorkspaceRecord,
  championship: ChampionshipRecord,
) {
  const teamsById = new Map(workspace.teams.map((team) => [team.id, team]));
  const orderedMatches = normalizeBracketMatches(bracket.matches, championship);
  const resultLookup = new Map<string, ChampionshipBracketMatch>();

  const matches = orderedMatches.map((match) => {
    const nextHomeTeamId = resolveSourceTeamId(match.sourceHome, resultLookup);
    const nextAwayTeamId = resolveSourceTeamId(match.sourceAway, resultLookup);
    const participantsChanged =
      nextHomeTeamId !== match.homeTeamId || nextAwayTeamId !== match.awayTeamId;

    let resolvedMatch: ChampionshipBracketMatch = {
      ...match,
      stageName: stageKeyToLabel(match.stageKey, championship),
      homeTeamId: nextHomeTeamId,
      awayTeamId: nextAwayTeamId,
    };

    if (participantsChanged) {
      resolvedMatch = clearBracketResult(resolvedMatch);
    }

    if (resolvedMatch.homeTeamId && !resolvedMatch.awayTeamId) {
      resolvedMatch = {
        ...clearBracketResult(resolvedMatch),
        winnerTeamId: resolvedMatch.homeTeamId,
        loserTeamId: null,
        resolution: "wo",
      };
    }

    if (!resolvedMatch.homeTeamId && resolvedMatch.awayTeamId) {
      resolvedMatch = {
        ...clearBracketResult(resolvedMatch),
        winnerTeamId: resolvedMatch.awayTeamId,
        loserTeamId: null,
        resolution: "wo",
      };
    }

    if (!resolvedMatch.homeTeamId && !resolvedMatch.awayTeamId) {
      resolvedMatch = clearBracketResult(resolvedMatch);
    }

    if (resolvedMatch.homeTeamId && resolvedMatch.awayTeamId) {
      resolvedMatch = inferWinnerFromMatch(resolvedMatch);
    }

    resolvedMatch = {
      ...resolvedMatch,
      status: resolveBracketMatchStatus(resolvedMatch),
      sourceHome:
        resolvedMatch.sourceHome.type === "manual-team" && resolvedMatch.sourceHome.teamId
          ? {
              ...resolvedMatch.sourceHome,
              label: createResolvedSourceLabel(
                teamsById.get(resolvedMatch.sourceHome.teamId)?.name ?? "",
                resolvedMatch.sourceHome.label,
              ),
            }
          : resolvedMatch.sourceHome,
      sourceAway:
        resolvedMatch.sourceAway.type === "manual-team" && resolvedMatch.sourceAway.teamId
          ? {
              ...resolvedMatch.sourceAway,
              label: createResolvedSourceLabel(
                teamsById.get(resolvedMatch.sourceAway.teamId)?.name ?? "",
                resolvedMatch.sourceAway.label,
              ),
            }
          : resolvedMatch.sourceAway,
    };

    resultLookup.set(resolvedMatch.id, resolvedMatch);

    return resolvedMatch;
  });

  return {
    ...bracket,
    rounds: normalizeBracketRounds(bracket.rounds, championship),
    matches,
  };
}

export function applyBracketConsistency(
  workspace: ChampionshipWorkspaceRecord,
  championship: ChampionshipRecord,
  currentBracket: ChampionshipBracketState,
) {
  const configuration = normalizeChampionshipConfiguration(championship.configuration);

  if (!currentBracket.matches.length || currentBracket.state === "completed") {
    return {
      ...currentBracket,
      consistencyStatus: currentBracket.matches.length ? "fresh" : "idle",
      consistencyMessage: null,
    };
  }

  const standings = computeGroupStandings(workspace);
  const nextSignature = buildQualificationSignature(workspace, championship, standings);

  if (!currentBracket.classificationSignature || currentBracket.classificationSignature === nextSignature) {
    return {
      ...currentBracket,
      consistencyStatus: "fresh",
      consistencyMessage: null,
    };
  }

  return {
    ...currentBracket,
    consistencyStatus: configuration.bracketSyncPolicy === "freeze" ? "frozen" : "outdated",
    consistencyMessage:
      configuration.bracketSyncPolicy === "freeze"
        ? "A fase de grupos mudou depois da geracao do bracket. O chaveamento segue congelado ate uma regeracao manual."
        : "A classificacao da fase de grupos mudou depois da geracao do bracket. Regere o chaveamento para sincronizar as finais.",
  };
}

export function createDefaultChampionshipWorkspace(
  championship: ChampionshipRecord,
): ChampionshipWorkspaceRecord {
  const configuration = normalizeChampionshipConfiguration(championship.configuration);
  const teams = normalizeTeams(undefined, championship.teamCount);
  const timestamp = nowIso();

  if (configuration.groupCount === 0) {
    return {
      championshipId: championship.id,
      teams: teams.map((team) => ({ ...team, groupId: null })),
      groups: [],
      groupMatches: [],
      bracket: createEmptyBracketState(),
      scoring: createDefaultScoring(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  const groups = createDefaultGroups(configuration.groupCount);
  const assignedTeams = snakeAssignTeams(teams, groups);
  const groupMatches = buildRoundRobinMatches(championship.id, groups, assignedTeams);

  return {
    championshipId: championship.id,
    teams: assignedTeams,
    groups,
    groupMatches,
    bracket: createEmptyBracketState(),
    scoring: createDefaultScoring(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function normalizeChampionshipWorkspace(
  workspace: ChampionshipWorkspaceRecord | undefined,
  championship: ChampionshipRecord,
) {
  if (!workspace) {
    return createDefaultChampionshipWorkspace(championship);
  }

  const configuration = normalizeChampionshipConfiguration(championship.configuration);
  const canRestructure =
    !(workspace.groupMatches ?? []).some(
      (match) =>
        typeof match.scoreHome === "number" &&
        Number.isFinite(match.scoreHome) &&
        typeof match.scoreAway === "number" &&
        Number.isFinite(match.scoreAway),
    ) && !(workspace.bracket?.matches ?? []).some((match) => Boolean(match.winnerTeamId));

  let teams = normalizeTeams(workspace.teams, championship.teamCount);

  if (teams.length < championship.teamCount) {
    const additionalTeams = createPlaceholderTeams(championship.teamCount - teams.length).map(
      (team, index) => ({
        ...team,
        seed: teams.length + index + 1,
      }),
    );
    teams = [...teams, ...additionalTeams];
  }

  let groups = normalizeGroups(workspace.groups);
  let groupMatches = normalizeGroupMatches(workspace.groupMatches, championship.id);

  if (configuration.groupCount === 0) {
    teams = teams.map((team) => ({ ...team, groupId: null }));
    groups = [];
    groupMatches = [];
  } else if (!groups.length || (canRestructure && groups.length !== configuration.groupCount)) {
    groups = createDefaultGroups(configuration.groupCount);
    teams = snakeAssignTeams(teams, groups);
    groupMatches = buildRoundRobinMatches(championship.id, groups, teams);
  } else {
    const validGroupIds = new Set(groups.map((group) => group.id));
    const hasInvalidAssignments = teams.some((team) => team.groupId && !validGroupIds.has(team.groupId));

    if (canRestructure && hasInvalidAssignments) {
      teams = snakeAssignTeams(teams, groups);
    }

    if (!groupMatches.length && groups.length) {
      groupMatches = buildRoundRobinMatches(championship.id, groups, teams);
    }
  }

  const normalizedWorkspace: ChampionshipWorkspaceRecord = {
    championshipId: championship.id,
    teams,
    groups,
    groupMatches,
    bracket: {
      ...createEmptyBracketState(),
      ...workspace.bracket,
    },
    scoring: normalizeScoring(workspace.scoring),
    createdAt: workspace.createdAt ?? nowIso(),
    updatedAt: workspace.updatedAt ?? nowIso(),
  };
  const resolvedBracket = resolveBracketState(normalizedWorkspace.bracket, normalizedWorkspace, championship);
  const bracketWithState = {
    ...resolvedBracket,
    state: deriveBracketProgressState(resolvedBracket.matches),
  };

  return {
    ...normalizedWorkspace,
    bracket: applyBracketConsistency(normalizedWorkspace, championship, bracketWithState),
  };
}

export function rebuildGroupsAndSchedule(
  workspace: ChampionshipWorkspaceRecord,
  championship: ChampionshipRecord,
) {
  const configuration = normalizeChampionshipConfiguration(championship.configuration);

  if (configuration.groupCount === 0) {
    return {
      ...workspace,
      teams: workspace.teams.map((team) => ({ ...team, groupId: null })),
      groups: [],
      groupMatches: [],
      updatedAt: nowIso(),
    };
  }

  const groups = createDefaultGroups(configuration.groupCount);
  const teams = snakeAssignTeams(workspace.teams, groups);
  const groupMatches = buildRoundRobinMatches(championship.id, groups, teams);

  return normalizeChampionshipWorkspace(
    {
      ...workspace,
      teams,
      groups,
      groupMatches,
      bracket: createEmptyBracketState(),
      updatedAt: nowIso(),
    },
    championship,
  );
}

export function renameTeam(workspace: ChampionshipWorkspaceRecord, teamId: string, name: string) {
  return {
    ...workspace,
    teams: workspace.teams.map((team) =>
      team.id === teamId ? { ...team, name: name.trim() || team.name } : team,
    ),
    updatedAt: nowIso(),
  };
}

export function updateTeamAdjustment(
  workspace: ChampionshipWorkspaceRecord,
  teamId: string,
  pointsAdjustment: number,
) {
  return {
    ...workspace,
    teams: workspace.teams.map((team) =>
      team.id === teamId ? { ...team, pointsAdjustment } : team,
    ),
    updatedAt: nowIso(),
  };
}

export function updateScoringSettings(
  workspace: ChampionshipWorkspaceRecord,
  scoring: Partial<ChampionshipScoringSettings>,
) {
  return {
    ...workspace,
    scoring: normalizeScoring({
      ...workspace.scoring,
      ...scoring,
    }),
    updatedAt: nowIso(),
  };
}

export function computeGroupStandings(workspace: ChampionshipWorkspaceRecord) {
  const groupsById = new Map(workspace.groups.map((group) => [group.id, group]));
  const rowsByGroup = new Map<string, Map<string, GroupStandingRow>>();

  workspace.groups.forEach((group) => {
    const teamRows = new Map<string, GroupStandingRow>();
    const groupTeams = workspace.teams
      .filter((team) => team.groupId === group.id)
      .sort((left, right) => left.seed - right.seed);

    groupTeams.forEach((team) => {
      teamRows.set(team.id, {
        groupId: group.id,
        teamId: team.id,
        teamName: team.name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: team.pointsAdjustment,
        pointsAdjustment: team.pointsAdjustment,
        position: 0,
      });
    });

    rowsByGroup.set(group.id, teamRows);
  });

  workspace.groupMatches.forEach((match) => {
    if (
      typeof match.scoreHome !== "number" ||
      typeof match.scoreAway !== "number" ||
      !rowsByGroup.has(match.groupId)
    ) {
      return;
    }

    const scoring = workspace.scoring;
    const groupRows = rowsByGroup.get(match.groupId)!;
    const homeRow = groupRows.get(match.homeTeamId);
    const awayRow = groupRows.get(match.awayTeamId);

    if (!homeRow || !awayRow) {
      return;
    }

    homeRow.played += 1;
    awayRow.played += 1;
    homeRow.goalsFor += match.scoreHome;
    homeRow.goalsAgainst += match.scoreAway;
    awayRow.goalsFor += match.scoreAway;
    awayRow.goalsAgainst += match.scoreHome;

    if (match.scoreHome > match.scoreAway) {
      homeRow.wins += 1;
      awayRow.losses += 1;
      homeRow.points += scoring.winPoints;
      awayRow.points += scoring.lossPoints;
    } else if (match.scoreHome < match.scoreAway) {
      awayRow.wins += 1;
      homeRow.losses += 1;
      awayRow.points += scoring.winPoints;
      homeRow.points += scoring.lossPoints;
    } else {
      homeRow.draws += 1;
      awayRow.draws += 1;
      homeRow.points += scoring.drawPoints;
      awayRow.points += scoring.drawPoints;
    }

    homeRow.goalDifference = homeRow.goalsFor - homeRow.goalsAgainst;
    awayRow.goalDifference = awayRow.goalsFor - awayRow.goalsAgainst;
  });

  return workspace.groups.map((group) => {
    const rows = Array.from(rowsByGroup.get(group.id)?.values() ?? []).sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }

      if (right.goalDifference !== left.goalDifference) {
        return right.goalDifference - left.goalDifference;
      }

      if (right.goalsFor !== left.goalsFor) {
        return right.goalsFor - left.goalsFor;
      }

      if (right.wins !== left.wins) {
        return right.wins - left.wins;
      }

      return left.teamName.localeCompare(right.teamName, "pt-BR");
    });

    rows.forEach((row, index) => {
      row.position = index + 1;
    });

    return {
      groupId: group.id,
      groupName: groupsById.get(group.id)?.name ?? group.name,
      rows,
    } satisfies GroupStandingGroup;
  });
}

export function getQualifiedTeams(
  workspace: ChampionshipWorkspaceRecord,
  championship: ChampionshipRecord,
) {
  const configuration = normalizeChampionshipConfiguration(championship.configuration);

  if (workspace.groups.length === 0) {
    return workspace.teams
      .slice()
      .sort((left, right) => left.seed - right.seed)
      .map((team) => ({
        teamId: team.id,
        teamName: team.name,
        sourceLabel: `Seed ${team.seed}`,
        groupId: null as string | null,
        groupName: null as string | null,
        position: team.seed,
        points: 0,
        goalDifference: 0,
        goalsFor: 0,
      }));
  }

  return computeGroupStandings(workspace).flatMap((group) =>
    group.rows.slice(0, configuration.qualifiedPerGroup).map((row) => ({
      teamId: row.teamId,
      teamName: row.teamName,
      sourceLabel: `${row.position}o ${group.groupName}`,
      groupId: group.groupId,
      groupName: group.groupName,
      position: row.position,
      points: row.points,
      goalDifference: row.goalDifference,
      goalsFor: row.goalsFor,
    })),
  );
}

export function updateGroupMatch(
  workspace: ChampionshipWorkspaceRecord,
  championship: ChampionshipRecord,
  matchId: string,
  patch: GroupMatchUpdateInput,
) {
  const updatedMatches = workspace.groupMatches.map((match) => {
    if (match.id !== matchId) {
      return match;
    }

    const scoreHome = patch.scoreHome === undefined ? match.scoreHome : patch.scoreHome;
    const scoreAway = patch.scoreAway === undefined ? match.scoreAway : patch.scoreAway;

    return {
      ...match,
      playedAt: patch.playedAt === undefined ? match.playedAt : patch.playedAt,
      venue: patch.venue === undefined ? match.venue : patch.venue,
      scoreHome,
      scoreAway,
      status:
        typeof scoreHome === "number" && typeof scoreAway === "number" ? "completed" : "scheduled",
    };
  });

  return normalizeChampionshipWorkspace(
    {
      ...workspace,
      groupMatches: updatedMatches,
      updatedAt: nowIso(),
    },
    championship,
  );
}

export function getChampionshipProgressSummary(
  workspace: ChampionshipWorkspaceRecord,
  championship: ChampionshipRecord,
) {
  const groupMatchesCompleted = workspace.groupMatches.filter((match) => match.status === "completed").length;
  const bracketMatchesCompleted = workspace.bracket.matches.filter((match) => Boolean(match.winnerTeamId)).length;
  const totalGoals = workspace.groupMatches
    .filter((match) => match.status === "completed")
    .reduce((total, match) => total + (match.scoreHome ?? 0) + (match.scoreAway ?? 0), 0);
  const championTeamId = workspace.bracket.matches.find((match) => match.stageKey === "final")?.winnerTeamId ?? null;
  const championName = championTeamId
    ? workspace.teams.find((team) => team.id === championTeamId)?.name ?? null
    : null;

  return {
    totalTeams: workspace.teams.length,
    totalGroups: workspace.groups.length,
    groupMatchesCompleted,
    totalGroupMatches: workspace.groupMatches.length,
    bracketMatchesCompleted,
    totalBracketMatches: workspace.bracket.matches.length,
    totalGoals,
    championName,
    standings: computeGroupStandings(workspace),
    bracketState: workspace.bracket.state,
    consistencyStatus: workspace.bracket.consistencyStatus,
    finalStageEnabled: normalizeChampionshipConfiguration(championship.configuration).hasFinalStage,
  };
}
