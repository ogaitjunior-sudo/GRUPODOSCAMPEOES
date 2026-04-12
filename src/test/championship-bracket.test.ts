import { describe, expect, it } from "vitest";
import { generateBracket, updateBracketMatch } from "@/lib/championship-bracket";
import {
  createDefaultChampionshipWorkspace,
  updateGroupMatch,
} from "@/lib/championship-runtime";
import { createDefaultChampionshipConfiguration } from "@/lib/championships";
import type { ChampionshipRecord } from "@/types/championship";

function createChampionship(overrides?: Partial<ChampionshipRecord>): ChampionshipRecord {
  const configuration = {
    ...createDefaultChampionshipConfiguration(),
    format: "groups-knockout" as const,
    groupCount: 2,
    qualifiedPerGroup: 2,
    hasFinalStage: true,
    knockoutBracketMode: "cross-groups" as const,
    knockoutSetupMode: "automatic" as const,
    thirdPlaceMatch: false,
    bracketSyncPolicy: "warn" as const,
  };

  return {
    id: "championship-1",
    name: "Copa Mata-Mata",
    description: "Teste de bracket",
    startDate: "2026-04-01",
    endDate: "2026-04-30",
    teamCount: 4,
    rules: "Regras",
    status: "Em andamento",
    configuration,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function createWorkspace(championship: ChampionshipRecord) {
  const workspace = createDefaultChampionshipWorkspace(championship);
  const [team1, team2, team3, team4] = workspace.teams;
  const [groupA, groupB] = workspace.groups;

  let nextWorkspace = {
    ...workspace,
    teams: [
      { ...team1, name: "Alpha", groupId: groupA.id, seed: 1 },
      { ...team2, name: "Bravo", groupId: groupA.id, seed: 2 },
      { ...team3, name: "Cometa", groupId: groupB.id, seed: 3 },
      { ...team4, name: "Delta", groupId: groupB.id, seed: 4 },
    ],
    groupMatches: [
      {
        id: "group-a-match",
        championshipId: championship.id,
        groupId: groupA.id,
        roundNumber: 1,
        matchOrder: 1,
        homeTeamId: team1.id,
        awayTeamId: team2.id,
        playedAt: null,
        venue: "",
        scoreHome: null,
        scoreAway: null,
        status: "scheduled" as const,
      },
      {
        id: "group-b-match",
        championshipId: championship.id,
        groupId: groupB.id,
        roundNumber: 1,
        matchOrder: 1,
        homeTeamId: team3.id,
        awayTeamId: team4.id,
        playedAt: null,
        venue: "",
        scoreHome: null,
        scoreAway: null,
        status: "scheduled" as const,
      },
    ],
  };

  nextWorkspace = updateGroupMatch(nextWorkspace, championship, "group-a-match", {
    scoreHome: 2,
    scoreAway: 0,
  });
  nextWorkspace = updateGroupMatch(nextWorkspace, championship, "group-b-match", {
    scoreHome: 3,
    scoreAway: 1,
  });

  return nextWorkspace;
}

describe("championship bracket", () => {
  it("generates the semifinal cross between two groups", () => {
    const championship = createChampionship();
    const workspace = generateBracket(createWorkspace(championship), championship);
    const semifinals = workspace.bracket.matches.filter((match) => match.stageKey === "semifinal");

    expect(semifinals).toHaveLength(2);
    expect(semifinals[0].homeTeamId).toBe(workspace.teams[0].id);
    expect(semifinals[0].awayTeamId).toBe(workspace.teams[3].id);
    expect(semifinals[1].homeTeamId).toBe(workspace.teams[2].id);
    expect(semifinals[1].awayTeamId).toBe(workspace.teams[1].id);
  });

  it("automatically advances winners to the final", () => {
    const championship = createChampionship();
    let workspace = generateBracket(createWorkspace(championship), championship);
    const semifinals = workspace.bracket.matches.filter((match) => match.stageKey === "semifinal");

    workspace = updateBracketMatch(workspace, championship, semifinals[0].id, {
      scoreHome: 4,
      scoreAway: 1,
      resolution: "normal",
    });

    let finalMatch = workspace.bracket.matches.find((match) => match.stageKey === "final");
    expect(finalMatch?.homeTeamId).toBe(workspace.teams[0].id);
    expect(finalMatch?.awayTeamId).toBeNull();

    workspace = updateBracketMatch(workspace, championship, semifinals[1].id, {
      scoreHome: 2,
      scoreAway: 0,
      resolution: "normal",
    });

    finalMatch = workspace.bracket.matches.find((match) => match.stageKey === "final");
    expect(finalMatch?.homeTeamId).toBe(workspace.teams[0].id);
    expect(finalMatch?.awayTeamId).toBe(workspace.teams[2].id);
  });

  it("sends semifinal losers to the third-place match", () => {
    const championship = createChampionship({
      configuration: {
        ...createChampionship().configuration,
        thirdPlaceMatch: true,
      },
    });
    let workspace = generateBracket(createWorkspace(championship), championship);
    const semifinals = workspace.bracket.matches.filter((match) => match.stageKey === "semifinal");

    workspace = updateBracketMatch(workspace, championship, semifinals[0].id, {
      scoreHome: 1,
      scoreAway: 0,
      resolution: "normal",
    });
    workspace = updateBracketMatch(workspace, championship, semifinals[1].id, {
      scoreHome: 3,
      scoreAway: 1,
      resolution: "normal",
    });

    const thirdPlaceMatch = workspace.bracket.matches.find((match) => match.stageKey === "third-place");
    expect(thirdPlaceMatch?.homeTeamId).toBe(workspace.teams[3].id);
    expect(thirdPlaceMatch?.awayTeamId).toBe(workspace.teams[1].id);
  });

  it("recalculates the final if a semifinal result changes later", () => {
    const championship = createChampionship();
    let workspace = generateBracket(createWorkspace(championship), championship);
    const semifinals = workspace.bracket.matches.filter((match) => match.stageKey === "semifinal");

    workspace = updateBracketMatch(workspace, championship, semifinals[0].id, {
      scoreHome: 1,
      scoreAway: 0,
      resolution: "normal",
    });
    workspace = updateBracketMatch(workspace, championship, semifinals[1].id, {
      scoreHome: 2,
      scoreAway: 0,
      resolution: "normal",
    });

    workspace = updateBracketMatch(workspace, championship, semifinals[0].id, {
      scoreHome: 0,
      scoreAway: 2,
      resolution: "normal",
    });

    const finalMatch = workspace.bracket.matches.find((match) => match.stageKey === "final");
    expect(finalMatch?.homeTeamId).toBe(workspace.teams[3].id);
    expect(finalMatch?.awayTeamId).toBe(workspace.teams[2].id);
  });

  it("marks the bracket as outdated when the group results change after generation", () => {
    const championship = createChampionship({
      configuration: {
        ...createChampionship().configuration,
        qualifiedPerGroup: 1,
        knockoutBracketMode: "best-vs-worst",
      },
    });
    let workspace = generateBracket(createWorkspace(championship), championship);
    const groupAMatch = workspace.groupMatches.find((match) => match.groupId === workspace.groups[0].id)!;

    workspace = updateGroupMatch(workspace, championship, groupAMatch.id, {
      scoreHome: 0,
      scoreAway: 3,
    });

    expect(workspace.bracket.consistencyStatus).toBe("outdated");
    expect(workspace.bracket.consistencyMessage).toMatch(/Regere o chaveamento/i);
  });
});
