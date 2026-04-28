import { describe, expect, it } from "vitest";
import { buildChampionshipTeamProfileLookup } from "@/lib/championship-team-profile";
import { createEmptyBracketState, updateTeamProfile } from "@/lib/championship-runtime";
import type { ChampionshipWorkspaceRecord } from "@/types/championship-runtime";

function createWorkspace(): ChampionshipWorkspaceRecord {
  return {
    championshipId: "championship-1",
    teams: [
      {
        id: "team-1",
        name: "Lions FC",
        playerId: "player-1",
        playerEmail: "lions@example.com",
        seed: 1,
        groupId: "group-a",
        pointsAdjustment: 0,
        flagUrl: "https://example.com/lions.png",
        captainName: "Leo",
        roster: ["Leo", "Kai"],
      },
      {
        id: "team-2",
        name: "Ravens FC",
        playerId: "player-2",
        playerEmail: "ravens@example.com",
        seed: 2,
        groupId: "group-a",
        pointsAdjustment: 0,
        flagUrl: "https://example.com/ravens.png",
        captainName: "Rafa",
        roster: ["Rafa", "Noah"],
      },
    ],
    groups: [
      {
        id: "group-a",
        name: "Grupo A",
        order: 1,
      },
    ],
    groupMatches: [
      {
        id: "group-match-1",
        championshipId: "championship-1",
        groupId: "group-a",
        roundNumber: 1,
        matchOrder: 1,
        homeTeamId: "team-1",
        awayTeamId: "team-2",
        playedAt: "2026-04-20T18:00:00.000Z",
        venue: "Arena 1",
        scoreHome: 2,
        scoreAway: 1,
        status: "completed",
      },
    ],
    bracket: {
      ...createEmptyBracketState(),
      matches: [
        {
          id: "bracket-match-1",
          championshipId: "championship-1",
          roundId: "round-final",
          stageKey: "final",
          stageName: "Final",
          roundOrder: 1,
          matchOrder: 1,
          homeTeamId: "team-1",
          awayTeamId: "team-2",
          sourceHome: { type: "manual-team", teamId: "team-1", label: "Lions FC" },
          sourceAway: { type: "manual-team", teamId: "team-2", label: "Ravens FC" },
          winnerTeamId: "team-2",
          loserTeamId: "team-1",
          nextMatchId: null,
          nextSlot: null,
          loserNextMatchId: null,
          loserNextSlot: null,
          scoreHome: 0,
          scoreAway: 1,
          penaltiesHome: null,
          penaltiesAway: null,
          playedAt: "2026-04-25T21:00:00.000Z",
          venue: "Arena Final",
          resolution: "normal",
          status: "completed",
        },
      ],
    },
    scoring: {
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
    },
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-25T21:00:00.000Z",
  };
}

describe("championship team profile helpers", () => {
  it("aggregates team stats and recent matches across groups and bracket", () => {
    const profiles = buildChampionshipTeamProfileLookup(createWorkspace());
    const lions = profiles.get("team-1");
    const ravens = profiles.get("team-2");

    expect(lions?.stats).toEqual({
      played: 2,
      wins: 1,
      draws: 0,
      losses: 1,
      goalsFor: 2,
      goalsAgainst: 2,
      goalDifference: 0,
    });
    expect(ravens?.stats).toEqual({
      played: 2,
      wins: 1,
      draws: 0,
      losses: 1,
      goalsFor: 2,
      goalsAgainst: 2,
      goalDifference: 0,
    });
    expect(lions?.recentMatches[0]).toMatchObject({
      phaseLabel: "Final 1",
      opponentName: "Ravens FC",
      opponentFlagUrl: "https://example.com/ravens.png",
      result: "loss",
    });
    expect(ravens?.recentMatches[0]).toMatchObject({
      phaseLabel: "Final 1",
      opponentName: "Lions FC",
      opponentFlagUrl: "https://example.com/lions.png",
      result: "win",
    });
  });

  it("updates team flag, captain and roster in the workspace", () => {
    const workspace = createWorkspace();
    const nextWorkspace = updateTeamProfile(workspace, "team-1", {
      flagUrl: "data:image/png;base64,AAA",
      captainName: "Capitao Leo",
      roster: ["Capitao Leo", "Kai", "Mason"],
    });
    const team = nextWorkspace.teams.find((entry) => entry.id === "team-1");

    expect(team).toMatchObject({
      flagUrl: "data:image/png;base64,AAA",
      captainName: "Capitao Leo",
      roster: ["Capitao Leo", "Kai", "Mason"],
    });
  });
});
