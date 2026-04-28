import type {
  ChampionshipTeamProfile,
  ChampionshipTeamRecentMatch,
  ChampionshipTeamRecentMatchResult,
  ChampionshipTeamStats,
  ChampionshipWorkspaceRecord,
} from "@/types/championship-runtime";

function createEmptyStats(): ChampionshipTeamStats {
  return {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
  };
}

function isCompletedScore(scoreFor: number | null, scoreAgainst: number | null) {
  return typeof scoreFor === "number" && typeof scoreAgainst === "number";
}

function getRecentMatchResult(params: {
  teamId: string;
  opponentTeamId: string;
  winnerTeamId?: string | null;
  scoreFor: number;
  scoreAgainst: number;
}): ChampionshipTeamRecentMatchResult {
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

function applyStats(profile: ChampionshipTeamProfile, result: ChampionshipTeamRecentMatchResult, scoreFor: number, scoreAgainst: number) {
  profile.stats.played += 1;
  profile.stats.goalsFor += scoreFor;
  profile.stats.goalsAgainst += scoreAgainst;
  profile.stats.goalDifference = profile.stats.goalsFor - profile.stats.goalsAgainst;

  if (result === "win") {
    profile.stats.wins += 1;
    return;
  }

  if (result === "loss") {
    profile.stats.losses += 1;
    return;
  }

  profile.stats.draws += 1;
}

function buildResolutionLabel(resolution: string | null | undefined) {
  switch (resolution) {
    case "extra-time":
      return "Prorrogacao";
    case "penalties":
      return "Penaltis";
    case "wo":
      return "WO";
    default:
      return null;
  }
}

function compareRecentMatches(left: ChampionshipTeamRecentMatch, right: ChampionshipTeamRecentMatch) {
  const leftTime = left.playedAt ? new Date(left.playedAt).getTime() : 0;
  const rightTime = right.playedAt ? new Date(right.playedAt).getTime() : 0;

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return right.phaseLabel.localeCompare(left.phaseLabel, "pt-BR");
}

export function buildChampionshipTeamProfileLookup(
  workspace: ChampionshipWorkspaceRecord,
  recentMatchLimit = 5,
) {
  const teamsById = new Map(workspace.teams.map((team) => [team.id, team]));
  const groupsById = new Map(workspace.groups.map((group) => [group.id, group]));
  const profiles = new Map(
    workspace.teams.map((team) => [
      team.id,
      {
        team,
        groupName: team.groupId ? groupsById.get(team.groupId)?.name ?? null : null,
        captainName: team.captainName,
        roster: team.roster,
        stats: createEmptyStats(),
        recentMatches: [],
      } satisfies ChampionshipTeamProfile,
    ]),
  );

  workspace.groupMatches.forEach((match) => {
    if (!isCompletedScore(match.scoreHome, match.scoreAway)) {
      return;
    }

    const homeProfile = profiles.get(match.homeTeamId);
    const awayProfile = profiles.get(match.awayTeamId);
    const homeTeam = teamsById.get(match.homeTeamId);
    const awayTeam = teamsById.get(match.awayTeamId);

    if (!homeProfile || !awayProfile || !homeTeam || !awayTeam) {
      return;
    }

    const phaseLabel = `${groupsById.get(match.groupId)?.name ?? "Grupo"} • Rodada ${match.roundNumber}`;
    const homeResult = getRecentMatchResult({
      teamId: homeTeam.id,
      opponentTeamId: awayTeam.id,
      scoreFor: match.scoreHome,
      scoreAgainst: match.scoreAway,
    });
    const awayResult = getRecentMatchResult({
      teamId: awayTeam.id,
      opponentTeamId: homeTeam.id,
      scoreFor: match.scoreAway,
      scoreAgainst: match.scoreHome,
    });

    applyStats(homeProfile, homeResult, match.scoreHome, match.scoreAway);
    applyStats(awayProfile, awayResult, match.scoreAway, match.scoreHome);

    homeProfile.recentMatches.push({
      id: match.id,
      phaseLabel,
      opponentTeamId: awayTeam.id,
      opponentName: awayTeam.name,
      opponentFlagUrl: awayTeam.flagUrl,
      scoreFor: match.scoreHome,
      scoreAgainst: match.scoreAway,
      result: homeResult,
      playedAt: match.playedAt,
      venue: match.venue,
      resolutionLabel: null,
    });
    awayProfile.recentMatches.push({
      id: match.id,
      phaseLabel,
      opponentTeamId: homeTeam.id,
      opponentName: homeTeam.name,
      opponentFlagUrl: homeTeam.flagUrl,
      scoreFor: match.scoreAway,
      scoreAgainst: match.scoreHome,
      result: awayResult,
      playedAt: match.playedAt,
      venue: match.venue,
      resolutionLabel: null,
    });
  });

  workspace.bracket.matches.forEach((match) => {
    if (!match.homeTeamId || !match.awayTeamId) {
      return;
    }

    const homeProfile = profiles.get(match.homeTeamId);
    const awayProfile = profiles.get(match.awayTeamId);
    const homeTeam = teamsById.get(match.homeTeamId);
    const awayTeam = teamsById.get(match.awayTeamId);

    if (!homeProfile || !awayProfile || !homeTeam || !awayTeam) {
      return;
    }

    const hasScore = isCompletedScore(match.scoreHome, match.scoreAway);

    if (!hasScore && !match.winnerTeamId) {
      return;
    }

    const scoreHome = match.scoreHome ?? 0;
    const scoreAway = match.scoreAway ?? 0;
    const phaseLabel = `${match.stageName} ${match.matchOrder}`;
    const resolutionLabel = buildResolutionLabel(match.resolution);
    const homeResult = getRecentMatchResult({
      teamId: homeTeam.id,
      opponentTeamId: awayTeam.id,
      winnerTeamId: match.winnerTeamId,
      scoreFor: scoreHome,
      scoreAgainst: scoreAway,
    });
    const awayResult = getRecentMatchResult({
      teamId: awayTeam.id,
      opponentTeamId: homeTeam.id,
      winnerTeamId: match.winnerTeamId,
      scoreFor: scoreAway,
      scoreAgainst: scoreHome,
    });

    applyStats(homeProfile, homeResult, scoreHome, scoreAway);
    applyStats(awayProfile, awayResult, scoreAway, scoreHome);

    homeProfile.recentMatches.push({
      id: match.id,
      phaseLabel,
      opponentTeamId: awayTeam.id,
      opponentName: awayTeam.name,
      opponentFlagUrl: awayTeam.flagUrl,
      scoreFor: scoreHome,
      scoreAgainst: scoreAway,
      result: homeResult,
      playedAt: match.playedAt,
      venue: match.venue,
      resolutionLabel,
    });
    awayProfile.recentMatches.push({
      id: match.id,
      phaseLabel,
      opponentTeamId: homeTeam.id,
      opponentName: homeTeam.name,
      opponentFlagUrl: homeTeam.flagUrl,
      scoreFor: scoreAway,
      scoreAgainst: scoreHome,
      result: awayResult,
      playedAt: match.playedAt,
      venue: match.venue,
      resolutionLabel,
    });
  });

  profiles.forEach((profile) => {
    profile.recentMatches = profile.recentMatches
      .slice()
      .sort(compareRecentMatches)
      .slice(0, Math.max(1, recentMatchLimit));
  });

  return profiles;
}
