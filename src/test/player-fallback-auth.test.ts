import { describe, expect, it } from "vitest";
import { authenticatePlayerFallback } from "@/lib/player-fallback-auth";

const fallbackEnv = {
  VITE_PLAYER_LOGIN: "TIDIHUNTER",
  VITE_PLAYER_PASSWORD_HASH: "5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5",
};

describe("player fallback auth", () => {
  it("authenticates the configured player with the updated password", async () => {
    const result = await authenticatePlayerFallback("tidihunter", "12345", fallbackEnv);

    expect(result).toEqual({
      success: true,
      playerName: "TIDIHUNTER",
      session: {
        id: "player-fallback-tidihunter",
        email: "tidihunter@local.player",
        displayName: "TIDIHUNTER",
        loginAt: expect.any(String),
        provider: "fallback",
      },
    });
  });

  it("rejects the fallback player when the password is wrong", async () => {
    const result = await authenticatePlayerFallback("TIDIHUNTER", "senha-errada", fallbackEnv);

    expect(result).toEqual({
      success: false,
      message: "Senha invalida para o acesso local do jogador.",
    });
  });

  it("ignores players outside the configured fallback account", async () => {
    await expect(authenticatePlayerFallback("outro-jogador", "12345", fallbackEnv)).resolves.toBeNull();
  });
});
