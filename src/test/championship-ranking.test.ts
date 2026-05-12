import { describe, expect, it } from "vitest";
import { buildChampionshipRanking } from "@/lib/championship-ranking";
import { createDefaultChampionshipConfiguration } from "@/lib/championships";
import { createEmptyBracketState } from "@/lib/championship-runtime";
import type { ChampionshipRecord } from "@/types/championship";
import type { ChampionshipWorkspaceRecord } from "@/types/championship-runtime";

function createChampionship(): ChampionshipRecord {
  return {
    id: "championship-ranking-test",
    name: "Copa Ranking",
    description: "",
    startDate: "2026-05-01",
    endDate: "2026-05-10",
    teamCount: 4,
    rules: "",
    status: "FINISHED",
    configuration: {
      ...createDefaultChampionshipConfiguration(),
      isRankedGame: true,
      thirdPlaceMatch: true,
    },
    registrationRequests: [],
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-10T00:00:00.000Z",
  };
}

function createWorkspace(finalWinnerTeamId = "team-a"): ChampionshipWorkspaceRecord {
  return {
    championshipId: "championship-ranking-test",
    teams: [
      {
        id: "team-a",
        name: "Alpha",
        playerId: "player-a",
        playerEmail: "alpha@example.com",
        seed: 1,
        groupId: "group-a",
        pointsAdjustment: 0,
        flagUrl: null,
        captainName: null,
        roster: [],
      },
      {
        id: "team-b",
        name: "Bravo",
        playerId: "player-b",
        playerEmail: "bravo@example.com",
        seed: 2,
        groupId: "group-a",
        pointsAdjustment: 0,
        flagUrl: null,
        captainName: null,
        roster: [],
      },
      {
        id: "team-c",
        name: "Charlie",
        playerId: "player-c",
        playerEmail: "charlie@example.com",
        seed: 3,
        groupId: "group-a",
        pointsAdjustment: 0,
        flagUrl: null,
        captainName: null,
        roster: [],
      },
      {
        id: "team-d",
        name: "Delta",
        playerId: "player-d",
        playerEmail: "delta@example.com",
        seed: 4,
        groupId: "group-a",
        pointsAdjustment: 0,
        flagUrl: null,
        captainName: null,
        roster: [],
      },
    ],
    groups: [{ id: "group-a", name: "Grupo A", order: 1 }],
    groupMatches: [
      {
        id: "group-match-1",
        championshipId: "championship-ranking-test",
        groupId: "group-a",
        roundNumber: 1,
        matchOrder: 1,
        homeTeamId: "team-a",
        awayTeamId: "team-b",
        playedAt: null,
        venue: "",
        scoreHome: 2,
        scoreAway: 1,
        status: "completed",
      },
      {
        id: "group-match-2",
        championshipId: "championship-ranking-test",
        groupId: "group-a",
        roundNumber: 1,
        matchOrder: 2,
        homeTeamId: "team-a",
        awayTeamId: "team-c",
        playedAt: null,
        venue: "",
        scoreHome: 1,
        scoreAway: 1,
        status: "completed",
      },
    ],
    bracket: {
      ...createEmptyBracketState(),
      matches: [
        {
          id: "final-match",
          championshipId: "championship-ranking-test",
          roundId: "round-final",
          stageKey: "final",
          stageName: "Final",
          roundOrder: 1,
          matchOrder: 1,
          homeTeamId: "team-a",
          awayTeamId: "team-b",
          sourceHome: { type: "manual-team", teamId: "team-a", label: "Alpha" },
          sourceAway: { type: "manual-team", teamId: "team-b", label: "Bravo" },
          winnerTeamId: finalWinnerTeamId,
          loserTeamId: finalWinnerTeamId === "team-a" ? "team-b" : "team-a",
          nextMatchId: null,
          nextSlot: null,
          loserNextMatchId: null,
          loserNextSlot: null,
          scoreHome: finalWinnerTeamId === "team-a" ? 3 : 1,
          scoreAway: finalWinnerTeamId === "team-a" ? 1 : 2,
          penaltiesHome: null,
          penaltiesAway: null,
          playedAt: null,
          venue: "",
          resolution: "normal",
          status: "completed",
        },
        {
          id: "third-place-match",
          championshipId: "championship-ranking-test",
          roundId: "round-third",
          stageKey: "third-place",
          stageName: "Disputa de 3o lugar",
          roundOrder: 2,
          matchOrder: 1,
          homeTeamId: "team-c",
          awayTeamId: "team-d",
          sourceHome: { type: "manual-team", teamId: "team-c", label: "Charlie" },
          sourceAway: { type: "manual-team", teamId: "team-d", label: "Delta" },
          winnerTeamId: "team-c",
          loserTeamId: "team-d",
          nextMatchId: null,
          nextSlot: null,
          loserNextMatchId: null,
          loserNextSlot: null,
          scoreHome: 2,
          scoreAway: 0,
          penaltiesHome: null,
          penaltiesAway: null,
          playedAt: null,
          venue: "",
          resolution: "normal",
          status: "completed",
        },
      ],
    },
    scoring: { winPoints: 3, drawPoints: 1, lossPoints: 0 },
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-10T00:00:00.000Z",
  };
}

describe("championship ranking", () => {
  it("adds match and achievement points without duplicating when the final changes", () => {
    const championship = createChampionship();
    const originalRows = buildChampionshipRanking([
      { championship, workspace: createWorkspace("team-a") },
    ]);
    const updatedRows = buildChampionshipRanking([
      { championship, workspace: createWorkspace("team-b") },
    ]);
    const originalChampion = originalRows.find((row) => row.name === "Alpha");
    const updatedChampion = updatedRows.find((row) => row.name === "Bravo");
    const updatedRunnerUp = updatedRows.find((row) => row.name === "Alpha");
    const thirdPlace = updatedRows.find((row) => row.name === "Charlie");

    expect(originalChampion).toMatchObject({
      rankingPoints: 20,
      matchRankingPoints: 5,
      achievementRankingPoints: 15,
      titlesCount: 1,
    });
    expect(updatedChampion).toMatchObject({
      rankingPoints: 17,
      matchRankingPoints: 2,
      achievementRankingPoints: 15,
      titlesCount: 1,
    });
    expect(updatedRunnerUp).toMatchObject({
      titlesCount: 0,
      viceTitlesCount: 1,
    });
    expect(thirdPlace).toMatchObject({
      thirdPlacesCount: 1,
      achievementRankingPoints: 5,
    });
  });
});
