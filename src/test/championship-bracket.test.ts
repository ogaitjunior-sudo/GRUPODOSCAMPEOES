import { describe, expect, it } from "vitest";
import { generateBracket, updateBracketMatch } from "@/lib/championship-bracket";
import {
  createDefaultChampionshipWorkspace,
  updateGroupMatch,
} from "@/lib/championship-runtime";
import { generateChampionshipTable } from "@/lib/championship-table";
import { createDefaultChampionshipConfiguration } from "@/lib/championships";
import type { ChampionshipRecord } from "@/types/championship";
import type { ChampionshipGroupMatch } from "@/types/championship-runtime";

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
    status: "READY",
    configuration,
    registrationRequests: [],
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function createWorkspace(championship: ChampionshipRecord) {
  const emptyWorkspace = createDefaultChampionshipWorkspace(championship);
  const workspaceWithParticipants = {
    ...emptyWorkspace,
    teams: [
      {
        id: "team-1",
        name: "Alpha",
        playerId: null,
        playerEmail: null,
        groupId: null,
        seed: 1,
        pointsAdjustment: 0,
      },
      {
        id: "team-2",
        name: "Bravo",
        playerId: null,
        playerEmail: null,
        groupId: null,
        seed: 2,
        pointsAdjustment: 0,
      },
      {
        id: "team-3",
        name: "Cometa",
        playerId: null,
        playerEmail: null,
        groupId: null,
        seed: 3,
        pointsAdjustment: 0,
      },
      {
        id: "team-4",
        name: "Delta",
        playerId: null,
        playerEmail: null,
        groupId: null,
        seed: 4,
        pointsAdjustment: 0,
      },
    ],
  };
  let nextWorkspace = generateChampionshipTable(workspaceWithParticipants, championship);
  const [groupA, groupB] = nextWorkspace.groups;
  const groupAMatch = nextWorkspace.groupMatches.find((match) => match.groupId === groupA.id)!;
  const groupBMatch = nextWorkspace.groupMatches.find((match) => match.groupId === groupB.id)!;
  const scoreForWinner = (match: ChampionshipGroupMatch, winnerTeamId: string) => ({
    scoreHome: match.homeTeamId === winnerTeamId ? 2 : 0,
    scoreAway: match.awayTeamId === winnerTeamId ? 2 : 0,
  });

  nextWorkspace = updateGroupMatch(nextWorkspace, championship, groupAMatch.id, {
    ...scoreForWinner(groupAMatch, "team-1"),
  });
  nextWorkspace = updateGroupMatch(nextWorkspace, championship, groupBMatch.id, {
    ...scoreForWinner(groupBMatch, "team-3"),
  });

  return nextWorkspace;
}

describe("championship bracket", () => {
  it("does not create table data before table generation", () => {
    const championship = createChampionship();
    const workspace = createDefaultChampionshipWorkspace(championship);

    expect(workspace.teams).toHaveLength(0);
    expect(workspace.groups).toHaveLength(0);
    expect(workspace.groupMatches).toHaveLength(0);
    expect(workspace.bracket.matches).toHaveLength(0);
  });

  it("generates a knockout table even when legacy config saved hasFinalStage as false", () => {
    const championship = createChampionship({
      configuration: {
        ...createDefaultChampionshipConfiguration(),
        format: "knockout",
        groupCount: 0,
        hasFinalStage: false,
        knockoutSetupMode: "automatic",
      },
    });
    const emptyWorkspace = createDefaultChampionshipWorkspace(championship);
    const workspaceWithParticipants = {
      ...emptyWorkspace,
      teams: [
        {
          id: "team-1",
          name: "Alpha",
          playerId: null,
          playerEmail: null,
          groupId: null,
          seed: 1,
          pointsAdjustment: 0,
        },
        {
          id: "team-2",
          name: "Bravo",
          playerId: null,
          playerEmail: null,
          groupId: null,
          seed: 2,
          pointsAdjustment: 0,
        },
      ],
    };

    const workspace = generateChampionshipTable(workspaceWithParticipants, championship);

    expect(workspace.groups).toHaveLength(0);
    expect(workspace.bracket.matches).toHaveLength(1);
    expect(workspace.bracket.matches[0].stageKey).toBe("final");
  });

  it("generates the semifinal cross between two groups", () => {
    const championship = createChampionship();
    const workspace = generateBracket(createWorkspace(championship), championship);
    const semifinals = workspace.bracket.matches.filter((match) => match.stageKey === "semifinal");

    expect(semifinals).toHaveLength(2);
    expect(semifinals[0].homeTeamId).toBe("team-1");
    expect(semifinals[0].awayTeamId).toBe("team-2");
    expect(semifinals[1].homeTeamId).toBe("team-3");
    expect(semifinals[1].awayTeamId).toBe("team-4");
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
    expect(finalMatch?.homeTeamId).toBe("team-1");
    expect(finalMatch?.awayTeamId).toBe("team-3");
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
    expect(thirdPlaceMatch?.homeTeamId).toBe("team-2");
    expect(thirdPlaceMatch?.awayTeamId).toBe("team-4");
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
    expect(finalMatch?.homeTeamId).toBe("team-2");
    expect(finalMatch?.awayTeamId).toBe("team-3");
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
