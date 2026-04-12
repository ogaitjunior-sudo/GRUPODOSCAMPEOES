import { describe, expect, it } from "vitest";
import { createInitialAdminPanelState } from "@/admin/context/adminSeed";
import { resolvePlayerLoginEmailFromState } from "@/lib/player-login-directory";

describe("player login directory", () => {
  it("keeps direct email login untouched", () => {
    const state = createInitialAdminPanelState();

    expect(resolvePlayerLoginEmailFromState("hunter@example.com", state)).toEqual({
      email: "hunter@example.com",
    });
  });

  it("resolves the player email by user name", () => {
    const state = createInitialAdminPanelState();

    state.users = [
      {
        id: "user-1",
        name: "Joao Vitor",
        email: "joao@example.com",
        role: "player",
        status: "active",
        permissions: [],
        createdAt: "2026-04-01T00:00:00.000Z",
        lastLoginAt: "",
        history: [],
      },
    ];

    expect(resolvePlayerLoginEmailFromState("@João Vitor", state)).toEqual({
      email: "joao@example.com",
    });
  });

  it("asks for email when more than one account shares the same name", () => {
    const state = createInitialAdminPanelState();

    state.players = [
      {
        id: "player-1",
        name: "Hunter",
        email: "hunter.one@example.com",
        status: "approved",
        platform: "PlayStation",
        linkedTeam: "Sem conta UT",
        isVerified: true,
        participationHistory: [],
        createdAt: "2026-04-01T00:00:00.000Z",
      },
      {
        id: "player-2",
        name: "Hunter",
        email: "hunter.two@example.com",
        status: "approved",
        platform: "Xbox",
        linkedTeam: "Sem conta UT",
        isVerified: true,
        participationHistory: [],
        createdAt: "2026-04-02T00:00:00.000Z",
      },
    ];

    expect(resolvePlayerLoginEmailFromState("Hunter", state)).toEqual({
      email: null,
      error: "Encontramos mais de uma conta com esse nome. Entre com o e-mail do jogador.",
    });
  });
});
