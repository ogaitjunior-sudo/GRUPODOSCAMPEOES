import { normalizeChampionshipConfiguration } from "@/lib/championships";
import {
  applyBracketConsistency,
  buildQualificationSignature,
  computeGroupStandings,
  createRuntimeId,
  deriveBracketProgressState,
  getQualifiedTeams,
  normalizeChampionshipWorkspace,
  nowIso,
  resolveBracketState,
  stageKeyToLabel,
} from "@/lib/championship-runtime";
import type { ChampionshipRecord } from "@/types/championship";
import type {
  BracketMatchUpdateInput,
  BracketStageKey,
  ChampionshipBracketMatch,
  ChampionshipBracketRound,
  ChampionshipBracketSource,
  ChampionshipWorkspaceRecord,
} from "@/types/championship-runtime";

function getStageKeyFromMatchCount(matchCount: number): BracketStageKey {
  if (matchCount <= 1) {
    return "final";
  }

  if (matchCount === 2) {
    return "semifinal";
  }

  if (matchCount === 4) {
    return "quarterfinal";
  }

  return "round-of-16";
}

function nextPowerOfTwo(value: number) {
  let size = 1;

  while (size < value) {
    size *= 2;
  }

  return size;
}

function ensureUniqueTeamIds(teamIds: Array<string | null>) {
  const registry = new Set<string>();

  for (const teamId of teamIds) {
    if (!teamId) {
      continue;
    }

    if (registry.has(teamId)) {
      return false;
    }

    registry.add(teamId);
  }

  return true;
}

function buildSeededPairs<T>(items: Array<T | null>) {
  const halfSize = items.length / 2;

  return Array.from({ length: halfSize }, (_, index) => [items[index], items[items.length - 1 - index]] as const);
}

export function validateBracketGeneration(
  workspace: ChampionshipWorkspaceRecord,
  championship: ChampionshipRecord,
) {
  const configuration = normalizeChampionshipConfiguration(championship.configuration);

  if (!configuration.hasFinalStage) {
    return "Ative a fase final nas configuracoes do campeonato antes de gerar o chaveamento.";
  }

  if (workspace.groups.length > 0) {
    const hasPendingGroupMatch = workspace.groupMatches.some((match) => match.status !== "completed");

    if (hasPendingGroupMatch) {
      return "Finalize todas as partidas da fase de grupos antes de gerar o chaveamento.";
    }

    const groupsStandings = computeGroupStandings(workspace);
    const invalidGroup = groupsStandings.find(
      (group) => group.rows.length < configuration.qualifiedPerGroup,
    );

    if (invalidGroup) {
      return `O ${invalidGroup.groupName} nao possui equipes suficientes para classificar ${configuration.qualifiedPerGroup}.`;
    }

    if (
      configuration.knockoutBracketMode === "cross-groups" &&
      (workspace.groups.length % 2 !== 0 || configuration.qualifiedPerGroup !== 2)
    ) {
      return "O cruzamento por grupos exige quantidade par de grupos e exatamente 2 classificados por grupo.";
    }
  }

  if (getQualifiedTeams(workspace, championship).length < 2) {
    return "Nao ha equipes suficientes para montar a fase final.";
  }

  return null;
}

function createInitialSource(
  team: ReturnType<typeof getQualifiedTeams>[number] | null,
): ChampionshipBracketSource {
  return {
    type: "manual-team",
    teamId: team?.teamId ?? null,
    label: team?.sourceLabel ?? "A definir",
  };
}

function createWinnerSource(matchId: string, label: string): ChampionshipBracketSource {
  return { type: "match-winner", matchId, label };
}

function createLoserSource(matchId: string, label: string): ChampionshipBracketSource {
  return { type: "match-loser", matchId, label };
}

function buildInitialPairs(
  workspace: ChampionshipWorkspaceRecord,
  championship: ChampionshipRecord,
) {
  const configuration = normalizeChampionshipConfiguration(championship.configuration);
  const qualifiedTeams = getQualifiedTeams(workspace, championship);

  if (configuration.knockoutBracketMode === "cross-groups" && workspace.groups.length > 0) {
    const standings = computeGroupStandings(workspace);
    const pairs: Array<
      [
        (typeof qualifiedTeams)[number] | null,
        (typeof qualifiedTeams)[number] | null,
      ]
    > = [];

    for (let index = 0; index < standings.length; index += 2) {
      const leftGroup = standings[index];
      const rightGroup = standings[index + 1];

      pairs.push(
        [
          leftGroup.rows[0]
            ? {
                teamId: leftGroup.rows[0].teamId,
                teamName: leftGroup.rows[0].teamName,
                sourceLabel: `1o ${leftGroup.groupName}`,
                groupId: leftGroup.groupId,
                groupName: leftGroup.groupName,
                position: 1,
                points: leftGroup.rows[0].points,
                goalDifference: leftGroup.rows[0].goalDifference,
                goalsFor: leftGroup.rows[0].goalsFor,
              }
            : null,
          rightGroup.rows[1]
            ? {
                teamId: rightGroup.rows[1].teamId,
                teamName: rightGroup.rows[1].teamName,
                sourceLabel: `2o ${rightGroup.groupName}`,
                groupId: rightGroup.groupId,
                groupName: rightGroup.groupName,
                position: 2,
                points: rightGroup.rows[1].points,
                goalDifference: rightGroup.rows[1].goalDifference,
                goalsFor: rightGroup.rows[1].goalsFor,
              }
            : null,
        ],
        [
          rightGroup.rows[0]
            ? {
                teamId: rightGroup.rows[0].teamId,
                teamName: rightGroup.rows[0].teamName,
                sourceLabel: `1o ${rightGroup.groupName}`,
                groupId: rightGroup.groupId,
                groupName: rightGroup.groupName,
                position: 1,
                points: rightGroup.rows[0].points,
                goalDifference: rightGroup.rows[0].goalDifference,
                goalsFor: rightGroup.rows[0].goalsFor,
              }
            : null,
          leftGroup.rows[1]
            ? {
                teamId: leftGroup.rows[1].teamId,
                teamName: leftGroup.rows[1].teamName,
                sourceLabel: `2o ${leftGroup.groupName}`,
                groupId: leftGroup.groupId,
                groupName: leftGroup.groupName,
                position: 2,
                points: leftGroup.rows[1].points,
                goalDifference: leftGroup.rows[1].goalDifference,
                goalsFor: leftGroup.rows[1].goalsFor,
              }
            : null,
        ],
      );
    }

    return pairs;
  }

  const sortedQualifiedTeams = qualifiedTeams
    .slice()
    .sort((left, right) => {
      if (left.position !== right.position) {
        return left.position - right.position;
      }

      if (right.points !== left.points) {
        return right.points - left.points;
      }

      if (right.goalDifference !== left.goalDifference) {
        return right.goalDifference - left.goalDifference;
      }

      if (right.goalsFor !== left.goalsFor) {
        return right.goalsFor - left.goalsFor;
      }

      return left.teamName.localeCompare(right.teamName, "pt-BR");
    });
  const bracketSize = nextPowerOfTwo(sortedQualifiedTeams.length);
  const padded = [
    ...sortedQualifiedTeams,
    ...Array.from({ length: bracketSize - sortedQualifiedTeams.length }, () => null),
  ];

  return buildSeededPairs(padded);
}

export function generateBracket(
  workspace: ChampionshipWorkspaceRecord,
  championship: ChampionshipRecord,
) {
  const validationMessage = validateBracketGeneration(workspace, championship);

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const configuration = normalizeChampionshipConfiguration(championship.configuration);
  const initialPairs = buildInitialPairs(workspace, championship);
  const initialTeamIds = initialPairs.flatMap((pair) => pair.map((item) => item?.teamId ?? null));

  if (!ensureUniqueTeamIds(initialTeamIds)) {
    throw new Error("Nao foi possivel gerar o bracket porque ha equipes duplicadas na fase final.");
  }

  const rounds: ChampionshipBracketRound[] = [];
  const matches: ChampionshipBracketMatch[] = [];
  let currentRoundMatchIds: string[] = [];
  let roundOrder = 1;

  const createRound = (matchCount: number) => {
    const stageKey = getStageKeyFromMatchCount(matchCount);
    const roundId = createRuntimeId("bracket-round");

    rounds.push({
      id: roundId,
      stageKey,
      stageName: stageKeyToLabel(stageKey, championship),
      roundOrder,
      visualOrder: roundOrder,
    });

    return { roundId, stageKey };
  };

  const firstRound = createRound(initialPairs.length);

  initialPairs.forEach((pair, index) => {
    const matchId = createRuntimeId("bracket-match");
    currentRoundMatchIds.push(matchId);
    matches.push({
      id: matchId,
      championshipId: championship.id,
      roundId: firstRound.roundId,
      stageKey: firstRound.stageKey,
      stageName: stageKeyToLabel(firstRound.stageKey, championship),
      roundOrder,
      matchOrder: index + 1,
      homeTeamId: pair[0]?.teamId ?? null,
      awayTeamId: pair[1]?.teamId ?? null,
      sourceHome: createInitialSource(pair[0]),
      sourceAway: createInitialSource(pair[1]),
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: null,
      nextSlot: null,
      loserNextMatchId: null,
      loserNextSlot: null,
      scoreHome: null,
      scoreAway: null,
      penaltiesHome: null,
      penaltiesAway: null,
      playedAt: null,
      venue: "",
      resolution: null,
      status: "pending",
    });
  });

  while (currentRoundMatchIds.length > 1) {
    roundOrder += 1;
    const nextRound = createRound(currentRoundMatchIds.length / 2);
    const nextRoundMatchIds: string[] = [];

    for (let index = 0; index < currentRoundMatchIds.length; index += 2) {
      const firstMatchId = currentRoundMatchIds[index];
      const secondMatchId = currentRoundMatchIds[index + 1];
      const matchId = createRuntimeId("bracket-match");

      nextRoundMatchIds.push(matchId);
      matches.push({
        id: matchId,
        championshipId: championship.id,
        roundId: nextRound.roundId,
        stageKey: nextRound.stageKey,
        stageName: stageKeyToLabel(nextRound.stageKey, championship),
        roundOrder,
        matchOrder: nextRoundMatchIds.length,
        homeTeamId: null,
        awayTeamId: null,
        sourceHome: createWinnerSource(firstMatchId, "Vencedor confronto 1"),
        sourceAway: createWinnerSource(secondMatchId, "Vencedor confronto 2"),
        winnerTeamId: null,
        loserTeamId: null,
        nextMatchId: null,
        nextSlot: null,
        loserNextMatchId: null,
        loserNextSlot: null,
        scoreHome: null,
        scoreAway: null,
        penaltiesHome: null,
        penaltiesAway: null,
        playedAt: null,
        venue: "",
        resolution: null,
        status: "pending",
      });

      matches.forEach((existingMatch) => {
        if (existingMatch.id === firstMatchId) {
          existingMatch.nextMatchId = matchId;
          existingMatch.nextSlot = "home";
        }

        if (existingMatch.id === secondMatchId) {
          existingMatch.nextMatchId = matchId;
          existingMatch.nextSlot = "away";
        }
      });
    }

    currentRoundMatchIds = nextRoundMatchIds;
  }

  const semifinalMatches = matches.filter((match) => match.stageKey === "semifinal");

  if (configuration.thirdPlaceMatch && semifinalMatches.length === 2) {
    roundOrder += 1;
    const roundId = createRuntimeId("bracket-round");
    const thirdPlaceMatchId = createRuntimeId("bracket-match");

    rounds.push({
      id: roundId,
      stageKey: "third-place",
      stageName: stageKeyToLabel("third-place", championship),
      roundOrder,
      visualOrder: roundOrder,
    });

    matches.push({
      id: thirdPlaceMatchId,
      championshipId: championship.id,
      roundId,
      stageKey: "third-place",
      stageName: stageKeyToLabel("third-place", championship),
      roundOrder,
      matchOrder: 1,
      homeTeamId: null,
      awayTeamId: null,
      sourceHome: createLoserSource(semifinalMatches[0].id, "Perdedor semifinal 1"),
      sourceAway: createLoserSource(semifinalMatches[1].id, "Perdedor semifinal 2"),
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: null,
      nextSlot: null,
      loserNextMatchId: null,
      loserNextSlot: null,
      scoreHome: null,
      scoreAway: null,
      penaltiesHome: null,
      penaltiesAway: null,
      playedAt: null,
      venue: "",
      resolution: null,
      status: "pending",
    });

    matches.forEach((match) => {
      if (match.id === semifinalMatches[0].id) {
        match.loserNextMatchId = thirdPlaceMatchId;
        match.loserNextSlot = "home";
      }

      if (match.id === semifinalMatches[1].id) {
        match.loserNextMatchId = thirdPlaceMatchId;
        match.loserNextSlot = "away";
      }
    });
  }

  const standings = computeGroupStandings(workspace);
  const bracket = applyBracketConsistency(
    workspace,
    championship,
    resolveBracketState(
      {
        state: "generated",
        consistencyStatus: "fresh",
        consistencyMessage: null,
        classificationSignature: buildQualificationSignature(workspace, championship, standings),
        generatedAt: nowIso(),
        rounds,
        matches,
      },
      workspace,
      championship,
    ),
  );

  return {
    ...workspace,
    bracket: {
      ...bracket,
      state: deriveBracketProgressState(bracket.matches),
      generatedAt: bracket.generatedAt ?? nowIso(),
    },
    updatedAt: nowIso(),
  };
}

function validateSavedBracketMatch(match: ChampionshipBracketMatch) {
  if (!match.homeTeamId || !match.awayTeamId) {
    if (match.homeTeamId || match.awayTeamId) {
      return null;
    }

    return "Nao e possivel concluir um confronto sem equipes definidas.";
  }

  if ((match.scoreHome === null) !== (match.scoreAway === null)) {
    return "Informe os dois placares do confronto.";
  }

  if (match.scoreHome === null && match.scoreAway === null) {
    return null;
  }

  if (match.scoreHome !== match.scoreAway) {
    const inferredWinnerTeamId = match.scoreHome > match.scoreAway ? match.homeTeamId : match.awayTeamId;

    if (match.winnerTeamId && match.winnerTeamId !== inferredWinnerTeamId) {
      return "O vencedor informado nao corresponde ao placar final.";
    }

    return null;
  }

  if (match.resolution === null || match.resolution === "normal") {
    return "Empates no mata-mata precisam de criterio de desempate.";
  }

  if (match.resolution === "penalties") {
    if (
      match.penaltiesHome === null ||
      match.penaltiesAway === null ||
      match.penaltiesHome === match.penaltiesAway
    ) {
      return "Informe os penaltis com vencedor definido.";
    }

    const inferredWinnerTeamId =
      match.penaltiesHome > match.penaltiesAway ? match.homeTeamId : match.awayTeamId;

    if (match.winnerTeamId && match.winnerTeamId !== inferredWinnerTeamId) {
      return "O vencedor informado nao corresponde ao resultado dos penaltis.";
    }

    return null;
  }

  if (!match.winnerTeamId) {
    return "Defina o vencedor do confronto antes de salvar.";
  }

  return null;
}

export function updateBracketMatch(
  workspace: ChampionshipWorkspaceRecord,
  championship: ChampionshipRecord,
  matchId: string,
  patch: BracketMatchUpdateInput,
) {
  const openingRoundOrder = workspace.bracket.matches.length
    ? Math.min(...workspace.bracket.matches.map((match) => match.roundOrder))
    : 1;

  const updatedMatches = workspace.bracket.matches.map((match) => {
    if (match.id !== matchId) {
      return match;
    }

    const nextMatch: ChampionshipBracketMatch = {
      ...match,
      playedAt: patch.playedAt === undefined ? match.playedAt : patch.playedAt,
      venue: patch.venue === undefined ? match.venue : patch.venue,
      scoreHome: patch.scoreHome === undefined ? match.scoreHome : patch.scoreHome,
      scoreAway: patch.scoreAway === undefined ? match.scoreAway : patch.scoreAway,
      penaltiesHome:
        patch.penaltiesHome === undefined ? match.penaltiesHome : patch.penaltiesHome,
      penaltiesAway:
        patch.penaltiesAway === undefined ? match.penaltiesAway : patch.penaltiesAway,
      resolution: patch.resolution === undefined ? match.resolution : patch.resolution,
      winnerTeamId: patch.winnerTeamId === undefined ? match.winnerTeamId : patch.winnerTeamId,
    };

    if (match.roundOrder !== openingRoundOrder) {
      return nextMatch;
    }

    return {
      ...nextMatch,
      sourceHome:
        match.sourceHome.type === "manual-team"
          ? {
              ...match.sourceHome,
              teamId:
                patch.manualHomeTeamId === undefined ? match.sourceHome.teamId : patch.manualHomeTeamId,
            }
          : match.sourceHome,
      sourceAway:
        match.sourceAway.type === "manual-team"
          ? {
              ...match.sourceAway,
              teamId:
                patch.manualAwayTeamId === undefined ? match.sourceAway.teamId : patch.manualAwayTeamId,
            }
          : match.sourceAway,
    };
  });

  const openingRoundMatches = updatedMatches.filter((match) => match.roundOrder === openingRoundOrder);
  const openingRoundTeamIds = openingRoundMatches.flatMap((match) => [
    match.sourceHome.type === "manual-team" ? match.sourceHome.teamId : null,
    match.sourceAway.type === "manual-team" ? match.sourceAway.teamId : null,
  ]);

  if (!ensureUniqueTeamIds(openingRoundTeamIds)) {
    throw new Error("Nao e permitido repetir a mesma equipe em mais de um confronto do bracket.");
  }

  const resolvedWorkspace = normalizeChampionshipWorkspace(
    {
      ...workspace,
      bracket: {
        ...workspace.bracket,
        matches: updatedMatches,
      },
      updatedAt: nowIso(),
    },
    championship,
  );
  const targetMatch = resolvedWorkspace.bracket.matches.find((match) => match.id === matchId);

  if (!targetMatch) {
    throw new Error("Confronto nao encontrado.");
  }

  const validationMessage = validateSavedBracketMatch(targetMatch);

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  return resolvedWorkspace;
}
