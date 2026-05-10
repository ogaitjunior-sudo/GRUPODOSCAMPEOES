import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { ChampionshipProvider, useChampionships } from "@/contexts/ChampionshipContext";
import { formatChampionshipStoreError } from "@/lib/championship-store";

function createChampionship(overrides: Record<string, unknown> = {}) {
  return {
    id: "championship-registration-test",
    name: "Copa Registro",
    description: "Campeonato para validar solicitacoes.",
    startDate: "2026-04-01",
    endDate: "2026-04-30",
    teamCount: 8,
    rules: "Regras",
    status: "REGISTRATION",
    configuration: {
      game: "FC 26",
      rankingName: "CAMPEOES",
      isRankedGame: true,
      platform: "PlayStation 5",
      format: "groups-knockout",
      qualifiedPerGroup: 2,
      groupCount: 2,
      groupStageMode: "single-leg",
      knockoutMode: "single-leg",
      knockoutBracketMode: "cross-groups",
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
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function Harness() {
  const { championships, reviewChampionshipRegistration, submitChampionshipRegistration } =
    useChampionships();
  const championship = championships[0];
  const request = championship?.registrationRequests[0];

  return (
    <div>
      <div data-testid="request-count">{championship?.registrationRequests.length ?? 0}</div>
      <div data-testid="request-status">{request?.status ?? "none"}</div>
      <button
        type="button"
        onClick={() =>
          void submitChampionshipRegistration({
            championshipId: "championship-registration-test",
            playerId: "player-1",
            playerName: "Hunter",
            playerEmail: "hunter@example.com",
          })
        }
      >
        Enviar
      </button>
      <button
        type="button"
        onClick={() =>
          request
            ? void reviewChampionshipRegistration({
                championshipId: "championship-registration-test",
                requestId: request.id,
                status: "approved",
                reviewedBy: "Admin",
              })
            : undefined
        }
      >
        Aprovar
      </button>
    </div>
  );
}

function renderHarness() {
  return render(
    <AdminAuthProvider>
      <ChampionshipProvider>
        <Harness />
      </ChampionshipProvider>
    </AdminAuthProvider>,
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("championship registrations", () => {
  it("submits a participation request for the player", async () => {
    window.localStorage.setItem(
      "gc_championships_v2",
      JSON.stringify([createChampionship()]),
    );

    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() => {
      expect(screen.getByTestId("request-count")).toHaveTextContent("1");
      expect(screen.getByTestId("request-status")).toHaveTextContent("pending");
    });

    const stored = JSON.parse(window.localStorage.getItem("gc_championships_v2") ?? "[]");
    expect(stored[0].registrationRequests).toHaveLength(1);
    expect(stored[0].registrationRequests[0].status).toBe("pending");
  });

  it("allows an admin to approve a pending request", async () => {
    window.localStorage.setItem(
      "gc_admin_session",
      JSON.stringify({
        username: "ADMIN",
        displayName: "ADMIN",
        role: "super_admin",
        permissions: [],
        loginAt: "2026-04-12T10:00:00.000Z",
      }),
    );
    window.localStorage.setItem(
      "gc_championships_v2",
      JSON.stringify([
        createChampionship({
          registrationRequests: [
            {
              id: "request-1",
              playerId: "player-1",
              playerName: "Hunter",
              playerEmail: "hunter@example.com",
              status: "pending",
              requestedAt: "2026-04-12T10:00:00.000Z",
              reviewedAt: null,
              reviewedBy: null,
            },
          ],
        }),
      ]),
    );

    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: /aprovar/i }));

    await waitFor(() => {
      expect(screen.getByTestId("request-status")).toHaveTextContent("approved");
    });

    const stored = JSON.parse(window.localStorage.getItem("gc_championships_v2") ?? "[]");
    expect(stored[0].registrationRequests[0].status).toBe("approved");
    expect(stored[0].registrationRequests[0].reviewedBy).toBe("Admin");
  });

  it("formats Supabase errors with non-string codes without masking the real message", () => {
    expect(
      formatChampionshipStoreError({
        code: 400,
        message: "Pedido de participacao recusado pelo Supabase.",
      }),
    ).toBe("Pedido de participacao recusado pelo Supabase.");
  });
});
