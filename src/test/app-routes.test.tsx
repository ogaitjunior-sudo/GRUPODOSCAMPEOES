import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import App from "@/App";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.pushState({}, "", "/");
});

describe("app routes", () => {
  it("renders the homepage hero", () => {
    window.history.pushState({}, "", "/");

    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: /disciplina gera campe/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pesquisar/i })).toBeInTheDocument();
  });

  it("renders the explore page", async () => {
    window.history.pushState({}, "", "/explorar");

    render(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: /explorar/i })).toBeInTheDocument();
    expect(await screen.findByLabelText(/busca global/i)).toBeInTheDocument();
  });

  it("renders the lightning tournaments page", async () => {
    window.history.pushState({}, "", "/relampago");

    render(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: /rel/i })).toBeInTheDocument();
    expect(await screen.findByText(/nenhum torneio/i)).toBeInTheDocument();
  });

  it("renders the champions hall without duplicate headings or names", async () => {
    window.history.pushState({}, "", "/campeoes");

    render(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: /hall da fama/i })).toBeInTheDocument();
    expect(screen.getAllByText(/^hall da fama$/i)).toHaveLength(1);
    expect(screen.getAllByText(/^Alan$/i)).toHaveLength(1);
    expect(screen.getByText(/^Wendel$/i)).toBeInTheDocument();
  });

  it("renders the about content on the help page", async () => {
    window.history.pushState({}, "", "/ajuda");

    render(<App />);

    expect(await screen.findByRole("heading", { level: 2, name: /uma comunidade criada entre amigos/i })).toBeInTheDocument();
    expect(await screen.findByText(/Idson, Alan e Lucas/i)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /chamar no whatsapp/i })).toHaveAttribute(
      "href",
      "https://wa.me/557192630851?text=Ol%C3%A1%2C%20preciso%20de%20atendimento.",
    );
  });

  it("renders the login preview", async () => {
    window.history.pushState({}, "", "/entrar");

    render(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: /bem-vindo/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /^entrar$/i })).toBeInTheDocument();
  });

  it("renders the access implementation page", async () => {
    window.history.pushState({}, "", "/acesso-implantacao");

    render(<App />);

    expect(
      await screen.findByRole("heading", { level: 1, name: /acesso em implanta/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/oficial em prepara/i)).toBeInTheDocument();
  });

  it("renders the player profile gate when logged out", async () => {
    window.history.pushState({}, "", "/perfil");

    render(<App />);

    expect(await screen.findByText(/entre para abrir o perfil/i)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /abrir login/i })).toBeInTheDocument();
  });

  it("renders the create account page", async () => {
    window.history.pushState({}, "", "/criar-conta");

    render(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: /criar conta/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /criar conta/i })).toBeInTheDocument();
    expect(await screen.findByLabelText(/nome de jogador/i)).toBeInTheDocument();
  });

  it("renders the password recovery page", async () => {
    window.history.pushState({}, "", "/recuperar-senha");

    render(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: /recuperar senha/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /recuperar/i })).toBeInTheDocument();
    expect(await screen.findByLabelText(/e-mail/i)).toBeInTheDocument();
  });

  it("renders the championship management page", async () => {
    window.localStorage.setItem(
      "gc_championships_v2",
      JSON.stringify([
        {
          id: "championship-details-test",
          name: "Copa de Teste",
          description: "Campeonato para validar a rota detalhada.",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
          teamCount: 4,
          rules: "Regras de teste",
          status: "STARTED",
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
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      ]),
    );
    window.history.pushState({}, "", "/campeonatos/championship-details-test");

    render(<App />);

    expect(await screen.findByText(/carregando painel do campeonato/i)).toBeInTheDocument();
  });
});
