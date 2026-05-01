import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      screen.getByRole("heading", {
        level: 1,
        name: /aqui n\u00e3o tem sorte\.\s*s\u00f3 resultado\./i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /ver campeonatos/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /ver todos os dados/i })).toBeInTheDocument();
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

    expect(
      await screen.findByRole("heading", { level: 2, name: /uma comunidade criada entre amigos/i }),
    ).toBeInTheDocument();
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

  it("logs the admin in from /entrar and opens /admin/dashboard", async () => {
    window.history.pushState({}, "", "/entrar");

    render(<App />);

    fireEvent.change(await screen.findByLabelText(/e-mail ou nome do jogador/i), {
      target: { value: "ADMIN" },
    });
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "GRUPODECAMPEAO" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^entrar$/i }));

    expect(await screen.findByRole("heading", { level: 1, name: /dashboard adm/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/admin/dashboard");
  });

  it("redirects /entrar to /admin/dashboard when the admin session already exists", async () => {
    window.localStorage.setItem(
      "gc_admin_session",
      JSON.stringify({
        username: "ADMIN",
        displayName: "ADMIN",
        role: "super_admin",
        permissions: [
          "dashboard:view",
          "users:view",
          "users:manage",
          "players:view",
          "players:manage",
          "teams:view",
          "teams:manage",
          "championships:view",
          "championships:manage",
          "images:view",
          "images:moderate",
          "languages:view",
          "languages:manage",
          "support:view",
          "support:manage",
          "logs:view",
          "settings:view",
          "settings:manage",
        ],
        loginAt: "2026-04-29T12:00:00.000Z",
      }),
    );
    window.history.pushState({}, "", "/entrar");

    render(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: /dashboard adm/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/admin/dashboard");
  });

  it("redirects an unauthenticated admin request to /login", async () => {
    window.history.pushState({}, "", "/admin/dashboard");

    render(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: /gc x1 ops/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
    expect(window.location.search).toContain("redirect=%2Fadmin%2Fdashboard");
  });

  it("shows the admin invalid credentials message", async () => {
    window.history.pushState({}, "", "/login");

    render(<App />);

    fireEvent.change(await screen.findByLabelText(/usuario administrativo/i), {
      target: { value: "ADMIN" },
    });
    fireEvent.change(screen.getByLabelText(/senha administrativa/i), {
      target: { value: "senha-errada" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar no painel/i }));

    expect(await screen.findByText("Usu\u00e1rio ou senha inv\u00e1lidos")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
  });

  it("logs the admin in and opens /admin/dashboard", async () => {
    window.history.pushState({}, "", "/login");

    render(<App />);

    fireEvent.change(await screen.findByLabelText(/usuario administrativo/i), {
      target: { value: "ADMIN" },
    });
    fireEvent.change(screen.getByLabelText(/senha administrativa/i), {
      target: { value: "GRUPODECAMPEAO" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar no painel/i }));

    expect(await screen.findByRole("heading", { level: 1, name: /dashboard adm/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/admin/dashboard");
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem("gc_admin_session") ?? "{}")).toMatchObject({
        username: "ADMIN",
        displayName: "ADMIN",
        role: "super_admin",
      }),
    );
  });

  it("keeps the public site on the root even when an admin session already exists", async () => {
    window.localStorage.setItem(
      "gc_admin_session",
      JSON.stringify({
        username: "ADMIN",
        displayName: "ADMIN",
        role: "super_admin",
        permissions: [
          "dashboard:view",
          "users:view",
          "users:manage",
          "players:view",
          "players:manage",
          "teams:view",
          "teams:manage",
          "championships:view",
          "championships:manage",
          "images:view",
          "images:moderate",
          "languages:view",
          "languages:manage",
          "support:view",
          "support:manage",
          "logs:view",
          "settings:view",
          "settings:manage",
        ],
        loginAt: "2026-04-29T12:00:00.000Z",
      }),
    );
    window.history.pushState({}, "", "/");

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /aqui n\u00e3o tem sorte\.\s*s\u00f3 resultado\./i,
      }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/");
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

  it("logs the player out from the navbar menu and redirects to /entrar", async () => {
    window.localStorage.setItem(
      "gc_player_fallback_session",
      JSON.stringify({
        id: "player-fallback-tidihunter",
        email: "tidihunter@local.player",
        displayName: "TIDIHUNTER",
        loginAt: "2026-04-29T12:00:00.000Z",
        provider: "fallback",
      }),
    );
    window.history.pushState({}, "", "/perfil");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /abrir navega/i }));
    fireEvent.click(await screen.findByRole("button", { name: /sair da conta/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/entrar");
    });
    expect(window.localStorage.getItem("gc_player_fallback_session")).toBeNull();
  });

  it("opens and closes the navbar notifications dropdown for authenticated players", async () => {
    window.localStorage.setItem(
      "gc_player_fallback_session",
      JSON.stringify({
        id: "player-fallback-tidihunter",
        email: "tidihunter@local.player",
        displayName: "TIDIHUNTER",
        loginAt: "2026-04-29T12:00:00.000Z",
        provider: "fallback",
      }),
    );
    window.history.pushState({}, "", "/perfil");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /abrir notifica/i }));

    expect(await screen.findByText(/novo campeonato aberto/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ver todas as notifica/i })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText(/novo campeonato aberto/i)).not.toBeInTheDocument();
    });
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
