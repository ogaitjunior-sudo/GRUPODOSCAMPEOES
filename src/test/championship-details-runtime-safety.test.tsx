import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "@/App";
import { formatChampionshipWorkspaceStoreError } from "@/lib/championship-workspace-store";

const championshipId = "runtime-uppercase-safe";

function seedChampionshipScreen() {
  window.localStorage.setItem(
    "gc_championships_v2",
    JSON.stringify([
      {
        id: championshipId,
        name: "Copa Runtime Safe",
        description: "",
        startDate: "2026-05-01",
        endDate: "2026-05-30",
        teamCount: 4,
        rules: "",
        status: "STARTED",
        configuration: {
          game: "FC 26",
          rankingName: "CAMPEOES",
          isRankedGame: true,
          platform: "PlayStation 5",
          format: "knockout",
          qualifiedPerGroup: 1,
          groupCount: 0,
          groupStageMode: "single-leg",
          knockoutMode: "single-leg",
          knockoutBracketMode: "best-vs-worst",
          knockoutSetupMode: "automatic",
          finalMode: "single-leg",
          hasFinalStage: true,
          thirdPlaceMatch: false,
          awayGoalsRule: false,
          bracketSyncPolicy: "warn",
          phaseLabels: {
            roundOf16: "Oitavas de final",
            quarterfinal: "Quartas de final",
            semifinal: "Semifinal",
            final: "Final",
            thirdPlace: "Disputa de 3o lugar",
          },
          resultsReportedBy: "admin",
          registrationMode: "public",
          playerChoosesTeamOnSignup: true,
          liveDraw: false,
          entryFee: "",
          extraInformation: "",
        },
        registrationRequests: [],
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
      },
    ]),
  );

  window.localStorage.setItem(
    "gc_championship_workspaces_v2",
    JSON.stringify([
      {
        championshipId,
        teams: [
          {
            id: "team-1",
            name: "Alpha FC",
            playerId: null,
            playerEmail: null,
            groupId: null,
            seed: 1,
            pointsAdjustment: 0,
            flagUrl: null,
            captainName: null,
            roster: [],
          },
          {
            id: "team-2",
            name: 2026,
            playerId: null,
            playerEmail: null,
            groupId: null,
            seed: "2",
            pointsAdjustment: 0,
            flagUrl: null,
            captainName: { bad: true },
            roster: { bad: true },
          },
          {
            id: "team-3",
            name: null,
            playerId: null,
            playerEmail: null,
            groupId: null,
            seed: 3,
            pointsAdjustment: 0,
            flagUrl: null,
            captainName: null,
            roster: ["Coach 3"],
          },
          {
            id: "team-4",
            name: "Delta UT",
            playerId: null,
            playerEmail: null,
            groupId: null,
            seed: 4,
            pointsAdjustment: 0,
            flagUrl: null,
            captainName: null,
            roster: [],
          },
        ],
        groups: [],
        groupMatches: [],
        bracket: {
          state: "generated",
          consistencyStatus: "fresh",
          consistencyMessage: null,
          classificationSignature: "test",
          generatedAt: "2026-05-01T00:10:00.000Z",
          rounds: [
            {
              id: "round-final",
              stageKey: "final",
              stageName: null,
              roundOrder: 1,
              visualOrder: 1,
            },
          ],
          matches: [
            {
              id: "match-final",
              championshipId,
              roundId: "round-final",
              stageKey: "final",
              stageName: null,
              roundOrder: 1,
              matchOrder: 1,
              homeTeamId: "team-1",
              awayTeamId: "team-2",
              sourceHome: { type: "manual-team", teamId: "team-1", label: { bad: true } },
              sourceAway: { type: "manual-team", teamId: "team-2", label: null },
              winnerTeamId: null,
              loserTeamId: null,
              nextMatchId: null,
              nextSlot: null,
              loserNextMatchId: null,
              loserNextSlot: null,
              roundTripMode: "single-leg",
              scoreHome: null,
              scoreAway: null,
              scoreHomeSecondLeg: null,
              scoreAwaySecondLeg: null,
              penaltiesHome: null,
              penaltiesAway: null,
              playedAt: null,
              venue: null,
              secondLegPlayedAt: null,
              secondLegVenue: null,
              resolution: null,
              status: null,
            },
          ],
        },
        scoring: { winPoints: 3, drawPoints: 1, lossPoints: 0 },
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:10:00.000Z",
      },
    ]),
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.pushState({}, "", "/");
});

describe("championship details runtime safety", () => {
  it("formats Supabase errors with non-string codes without throwing", () => {
    expect(() =>
      formatChampionshipWorkspaceStoreError({
        code: { unexpected: true },
        message: "",
      }),
    ).not.toThrow();
  });

  it("keeps finals, seeds, my games, info, and stats tabs stable with invalid workspace values", async () => {
    seedChampionshipScreen();
    window.history.pushState({}, "", `/campeonatos/${championshipId}`);

    render(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: /copa runtime safe/i })).toBeInTheDocument();

    const activateTab = async (name: RegExp) => {
      const tab = screen.getByRole("tab", { name });

      await act(async () => {
        tab.focus();
        fireEvent.keyDown(tab, { code: "Enter", key: "Enter" });
        fireEvent.mouseDown(tab);
        fireEvent.pointerDown(tab);
        fireEvent.click(tab);
      });
    };

    await activateTab(/seeds/i);
    expect(await screen.findByText(/entrada do chaveamento/i)).toBeInTheDocument();

    await activateTab(/finais/i);
    expect(await screen.findByText(/chaveamento visual/i)).toBeInTheDocument();

    await activateTab(/meus jogos/i);
    expect(await screen.findByText(/entre para ver seus jogos/i)).toBeInTheDocument();

    await activateTab(/info/i);
    expect(await screen.findByText(/resumo do campeonato/i)).toBeInTheDocument();

    await activateTab(/estatisticas/i);
    expect(await screen.findByText(/leitura rapida da competicao/i)).toBeInTheDocument();
  });
});
