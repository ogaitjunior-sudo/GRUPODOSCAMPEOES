import { computeGroupStandings } from "@/lib/championship-runtime";
import type { ChampionshipRecord } from "@/types/championship";
import type {
  ChampionshipBracketMatch,
  ChampionshipGroupMatch,
  ChampionshipTeam,
  ChampionshipWorkspaceRecord,
} from "@/types/championship-runtime";

export const MATCH_WIN_RANKING_POINTS = 2;
export const MATCH_DRAW_RANKING_POINTS = 1;
export const MATCH_LOSS_RANKING_POINTS = 0;
export const CHAMPION_RANKING_POINTS = 15;
export const RUNNER_UP_RANKING_POINTS = 8;
export const THIRD_PLACE_RANKING_POINTS = 5;

export interface ChampionshipPodium {
  championTeamId: string | null;
  runnerUpTeamId: string | null;
  thirdPlaceTeamId: string | null;
}

export interface ChampionshipRankingTeamRecord {
  key: string;
  teamIds: string[];
  playerId: string | null;
  playerEmail: string | null;
  name: string;
  rankingPoints: number;
  matchRankingPoints: number;
  achievementRankingPoints: number;
  titlesCount: number;
  viceTitlesCount: number;
  thirdPlacesCount: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  efficiency: number;
  championshipsCount: number;
  championshipIds: string[];
}

export interface ChampionshipRankingInput {
  championship: ChampionshipRecord;
  workspace: ChampionshipWorkspaceRecord;
}

function normalizeRankingKey(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function getTeamRankingKey(team: ChampionshipTeam) {
  if (team.playerId?.trim()) {
    return `player:${team.playerId.trim()}`;
  }

  if (team.playerEmail?.trim()) {
    return `email:${team.playerEmail.trim().toLocaleLowerCase("pt-BR")}`;
  }

  return `team:${normalizeRankingKey(team.name)}`;
}

function createRankingRecord(team: ChampionshipTeam): ChampionshipRankingTeamRecord {
  return {
    key: getTeamRankingKey(team),
    teamIds: [team.id],
    playerId: team.playerId,
    playerEmail: team.playerEmail,
    name: team.name,
    rankingPoints: 0,
    matchRankingPoints: 0,
    achievementRankingPoints: 0,
    titlesCount: 0,
    viceTitlesCount: 0,
    thirdPlacesCount: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    efficiency: 0,
    championshipsCount: 0,
    championshipIds: [],
  };
}

function ensureRankingRecord(
  registry: Map<string, ChampionshipRankingTeamRecord>,
  team: ChampionshipTeam,
  championshipId: string,
) {
  const key = getTeamRankingKey(team);
  const existing = registry.get(key);

  if (existing) {
    if (!existing.teamIds.includes(team.id)) {
      existing.teamIds.push(team.id);
    }

    if (!existing.championshipIds.includes(championshipId)) {
      existing.championshipIds.push(championshipId);
      existing.championshipsCount = existing.championshipIds.length;
    }

    return existing;
  }

  const nextRecord = createRankingRecord(team);
  nextRecord.championshipIds.push(championshipId);
  nextRecord.championshipsCount = 1;
  registry.set(key, nextRecord);

  return nextRecord;
}

function isCompletedScore(scoreFor: number | null, scoreAgainst: number | null) {
  return typeof scoreFor === "number" && typeof scoreAgainst === "number";
}

function getMatchResult(params: {
  teamId: string;
  opponentTeamId: string;
  winnerTeamId?: string | null;
  scoreFor: number;
  scoreAgainst: number;
}) {
  const { teamId, opponentTeamId, winnerTeamId, scoreFor, scoreAgainst } = params;

  if (winnerTeamId === teamId) {
    return "win";
  }

  if (winnerTeamId === opponentTeamId) {
    return "loss";
  }

  if (scoreFor > scoreAgainst) {
    return "win";
  }

  if (scoreFor < scoreAgainst) {
    return "loss";
  }

  return "draw";
}

function getMatchPoints(result: "win" | "draw" | "loss") {
  if (result === "win") {
    return MATCH_WIN_RANKING_POINTS;
  }

  if (result === "draw") {
    return MATCH_DRAW_RANKING_POINTS;
  }

  return MATCH_LOSS_RANKING_POINTS;
}

function applyMatchStats(
  record: ChampionshipRankingTeamRecord,
  result: "win" | "draw" | "loss",
  scoreFor: number,
  scoreAgainst: number,
) {
  const points = getMatchPoints(result);

  record.played += 1;
  record.goalsFor += scoreFor;
  record.goalsAgainst += scoreAgainst;
  record.goalDifference = record.goalsFor - record.goalsAgainst;
  record.matchRankingPoints += points;
  record.rankingPoints += points;

  if (result === "win") {
    record.wins += 1;
  } else if (result === "draw") {
    record.draws += 1;
  } else {
    record.losses += 1;
  }
}

function applyAchievementPoints(
  record: ChampionshipRankingTeamRecord,
  kind: "champion" | "runner-up" | "third-place",
) {
  if (kind === "champion") {
    record.titlesCount += 1;
    record.achievementRankingPoints += CHAMPION_RANKING_POINTS;
    record.rankingPoints += CHAMPION_RANKING_POINTS;
    return;
  }

  if (kind === "runner-up") {
    record.viceTitlesCount += 1;
    record.achievementRankingPoints += RUNNER_UP_RANKING_POINTS;
    record.rankingPoints += RUNNER_UP_RANKING_POINTS;
    return;
  }

  record.thirdPlacesCount += 1;
  record.achievementRankingPoints += THIRD_PLACE_RANKING_POINTS;
  record.rankingPoints += THIRD_PLACE_RANKING_POINTS;
}

function getLoserTeamId(match: ChampionshipBracketMatch) {
  if (!match.winnerTeamId || !match.homeTeamId || !match.awayTeamId) {
    return null;
  }

  return match.winnerTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
}

function getFinalMatch(workspace: ChampionshipWorkspaceRecord) {
  return workspace.bracket.matches
    .filter((match) => match.stageKey === "final")
    .sort((left, right) => right.roundOrder - left.roundOrder || right.matchOrder - left.matchOrder)[0] ?? null;
}

function getThirdPlaceMatch(workspace: ChampionshipWorkspaceRecord) {
  return workspace.bracket.matches
    .filter((match) => match.stageKey === "third-place")
    .sort((left, right) => right.roundOrder - left.roundOrder || right.matchOrder - left.matchOrder)[0] ?? null;
}

function getLeaguePodium(workspace: ChampionshipWorkspaceRecord): ChampionshipPodium {
  const rows = computeGroupStandings(workspace)
    .flatMap((group) => group.rows)
    .sort((left, right) => {
      if (right.points !== left.points) return right.points - left.points;
      if (right.wins !== left.wins) return right.wins - left.wins;
      if (right.goalDifference !== left.goalDifference) return right.goalDifference - left.goalDifference;
      if (right.goalsFor !== left.goalsFor) return right.goalsFor - left.goalsFor;
      return left.teamName.localeCompare(right.teamName, "pt-BR");
    });

  return {
    championTeamId: rows[0]?.teamId ?? null,
    runnerUpTeamId: rows[1]?.teamId ?? null,
    thirdPlaceTeamId: rows[2]?.teamId ?? null,
  };
}

export function getChampionshipPodium(
  championship: ChampionshipRecord,
  workspace: ChampionshipWorkspaceRecord,
): ChampionshipPodium {
  if (championship.status !== "FINISHED") {
    return {
      championTeamId: null,
      runnerUpTeamId: null,
      thirdPlaceTeamId: null,
    };
  }

  const finalMatch = getFinalMatch(workspace);

  if (!finalMatch?.winnerTeamId) {
    return getLeaguePodium(workspace);
  }

  const thirdPlaceMatch = getThirdPlaceMatch(workspace);

  return {
    championTeamId: finalMatch.winnerTeamId,
    runnerUpTeamId: getLoserTeamId(finalMatch),
    thirdPlaceTeamId: thirdPlaceMatch?.winnerTeamId ?? null,
  };
}

function applyGroupMatch(
  registry: Map<string, ChampionshipRankingTeamRecord>,
  teamsById: Map<string, ChampionshipTeam>,
  championshipId: string,
  match: ChampionshipGroupMatch,
) {
  if (match.status !== "completed" || !isCompletedScore(match.scoreHome, match.scoreAway)) {
    return;
  }

  const homeTeam = teamsById.get(match.homeTeamId);
  const awayTeam = teamsById.get(match.awayTeamId);

  if (!homeTeam || !awayTeam) {
    return;
  }

  const homeRecord = ensureRankingRecord(registry, homeTeam, championshipId);
  const awayRecord = ensureRankingRecord(registry, awayTeam, championshipId);
  const homeResult = getMatchResult({
    teamId: homeTeam.id,
    opponentTeamId: awayTeam.id,
    scoreFor: match.scoreHome,
    scoreAgainst: match.scoreAway,
  });
  const awayResult = getMatchResult({
    teamId: awayTeam.id,
    opponentTeamId: homeTeam.id,
    scoreFor: match.scoreAway,
    scoreAgainst: match.scoreHome,
  });

  applyMatchStats(homeRecord, homeResult, match.scoreHome, match.scoreAway);
  applyMatchStats(awayRecord, awayResult, match.scoreAway, match.scoreHome);
}

function applyBracketMatch(
  registry: Map<string, ChampionshipRankingTeamRecord>,
  teamsById: Map<string, ChampionshipTeam>,
  championshipId: string,
  match: ChampionshipBracketMatch,
) {
  if (!match.homeTeamId || !match.awayTeamId) {
    return;
  }

  const hasScore = isCompletedScore(match.scoreHome, match.scoreAway);

  if (!hasScore && !match.winnerTeamId) {
    return;
  }

  const homeTeam = teamsById.get(match.homeTeamId);
  const awayTeam = teamsById.get(match.awayTeamId);

  if (!homeTeam || !awayTeam) {
    return;
  }

  const scoreHome = match.scoreHome ?? 0;
  const scoreAway = match.scoreAway ?? 0;
  const homeRecord = ensureRankingRecord(registry, homeTeam, championshipId);
  const awayRecord = ensureRankingRecord(registry, awayTeam, championshipId);
  const homeResult = getMatchResult({
    teamId: homeTeam.id,
    opponentTeamId: awayTeam.id,
    winnerTeamId: match.winnerTeamId,
    scoreFor: scoreHome,
    scoreAgainst: scoreAway,
  });
  const awayResult = getMatchResult({
    teamId: awayTeam.id,
    opponentTeamId: homeTeam.id,
    winnerTeamId: match.winnerTeamId,
    scoreFor: scoreAway,
    scoreAgainst: scoreHome,
  });

  applyMatchStats(homeRecord, homeResult, scoreHome, scoreAway);
  applyMatchStats(awayRecord, awayResult, scoreAway, scoreHome);
}

function applyChampionshipAchievements(
  registry: Map<string, ChampionshipRankingTeamRecord>,
  teamsById: Map<string, ChampionshipTeam>,
  championship: ChampionshipRecord,
  workspace: ChampionshipWorkspaceRecord,
) {
  const podium = getChampionshipPodium(championship, workspace);

  if (podium.championTeamId) {
    const team = teamsById.get(podium.championTeamId);

    if (team) {
      applyAchievementPoints(ensureRankingRecord(registry, team, championship.id), "champion");
    }
  }

  if (podium.runnerUpTeamId) {
    const team = teamsById.get(podium.runnerUpTeamId);

    if (team) {
      applyAchievementPoints(ensureRankingRecord(registry, team, championship.id), "runner-up");
    }
  }

  if (podium.thirdPlaceTeamId) {
    const team = teamsById.get(podium.thirdPlaceTeamId);

    if (team) {
      applyAchievementPoints(ensureRankingRecord(registry, team, championship.id), "third-place");
    }
  }
}

function finalizeRankingRecord(record: ChampionshipRankingTeamRecord) {
  return {
    ...record,
    efficiency:
      record.played > 0
        ? Math.round((record.matchRankingPoints / (record.played * MATCH_WIN_RANKING_POINTS)) * 100)
        : 0,
  } satisfies ChampionshipRankingTeamRecord;
}

export function compareChampionshipRankingRows(
  left: ChampionshipRankingTeamRecord,
  right: ChampionshipRankingTeamRecord,
) {
  if (right.rankingPoints !== left.rankingPoints) return right.rankingPoints - left.rankingPoints;
  if (right.titlesCount !== left.titlesCount) return right.titlesCount - left.titlesCount;
  if (right.wins !== left.wins) return right.wins - left.wins;
  if (right.goalDifference !== left.goalDifference) return right.goalDifference - left.goalDifference;
  if (right.goalsFor !== left.goalsFor) return right.goalsFor - left.goalsFor;
  return left.name.localeCompare(right.name, "pt-BR");
}

export function buildChampionshipRanking(inputs: ChampionshipRankingInput[]) {
  const registry = new Map<string, ChampionshipRankingTeamRecord>();

  inputs.forEach(({ championship, workspace }) => {
    if (!championship.configuration.isRankedGame) {
      return;
    }

    const teamsById = new Map(workspace.teams.map((team) => [team.id, team] as const));

    workspace.teams.forEach((team) => {
      ensureRankingRecord(registry, team, championship.id);
    });
    workspace.groupMatches.forEach((match) => {
      applyGroupMatch(registry, teamsById, championship.id, match);
    });
    workspace.bracket.matches.forEach((match) => {
      applyBracketMatch(registry, teamsById, championship.id, match);
    });
    applyChampionshipAchievements(registry, teamsById, championship, workspace);
  });

  return Array.from(registry.values())
    .map(finalizeRankingRecord)
    .sort(compareChampionshipRankingRows);
}

export function buildChampionshipRankingByTeamId(input: ChampionshipRankingInput) {
  const rankingRows = buildChampionshipRanking([input]);
  const rankingByTeamId = new Map<string, ChampionshipRankingTeamRecord>();

  rankingRows.forEach((row) => {
    row.teamIds.forEach((teamId) => {
      rankingByTeamId.set(teamId, row);
    });
  });

  return rankingByTeamId;
}
