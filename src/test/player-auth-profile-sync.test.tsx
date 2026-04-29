import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";

const { updateUserMock } = vi.hoisted(() => ({
  updateUserMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabaseAuthSetupMessage: "offline",
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: {
            user: {
              id: "player-1",
              email: "hunter@example.com",
              user_metadata: {
                player_name: "Hunter",
                avatar_url: "https://example.com/current.webp",
                team_photo_url: "https://example.com/team.webp",
              },
              last_sign_in_at: "2026-04-28T00:00:00.000Z",
              created_at: "2026-04-28T00:00:00.000Z",
            },
          },
        },
        error: null,
      })),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
      updateUser: updateUserMock,
      signOut: vi.fn(),
    },
  },
}));

vi.mock("@/lib/player-fallback-auth", () => ({
  authenticatePlayerFallback: vi.fn(async () => null),
  createPlayerFallbackSession: vi.fn(),
  getPlayerFallbackCredentials: vi.fn(() => null),
  isPlayerFallbackSession: vi.fn(() => false),
}));

vi.mock("@/lib/player-login-directory", () => ({
  resolvePlayerLoginEmail: vi.fn(),
  syncPlayerAccessDirectoryEntry: vi.fn(),
}));

import { PlayerAuthProvider, usePlayerAuth } from "@/contexts/PlayerAuthContext";

function Harness() {
  const { avatarUrl, isUpdatingProfile, updateProfileAvatar } = usePlayerAuth();
  const [message, setMessage] = useState("");

  return (
    <div>
      <div data-testid="avatar-url">{avatarUrl ?? "none"}</div>
      <div data-testid="updating">{isUpdatingProfile ? "yes" : "no"}</div>
      <div data-testid="message">{message || "none"}</div>
      <button
        type="button"
        onClick={() =>
          void updateProfileAvatar("https://example.com/next.webp").then((result) =>
            setMessage(result.message ?? "none"),
          )
        }
      >
        Salvar
      </button>
    </div>
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  updateUserMock.mockReset();
});

describe("player auth profile sync", () => {
  it("resolves avatar updates before the remote sync finishes", async () => {
    let resolveRemoteSync: (() => void) | null = null;
    updateUserMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRemoteSync = () => resolve({ data: { user: null }, error: null });
        }),
    );

    render(
      <PlayerAuthProvider>
        <Harness />
      </PlayerAuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("avatar-url")).toHaveTextContent("https://example.com/current.webp");
    });

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(screen.getByTestId("avatar-url")).toHaveTextContent("https://example.com/next.webp");
      expect(screen.getByTestId("updating")).toHaveTextContent("no");
      expect(screen.getByTestId("message")).toHaveTextContent(/segundo plano/i);
    });

    expect(updateUserMock).toHaveBeenCalledTimes(1);

    resolveRemoteSync?.();
  });
});
