import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";

const { getSessionMock, onAuthStateChangeMock, signOutMock, updateUserMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  signOutMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

getSessionMock.mockImplementation(async () => ({
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
}));

onAuthStateChangeMock.mockImplementation(() => ({
  data: {
    subscription: {
      unsubscribe: vi.fn(),
    },
  },
}));

signOutMock.mockResolvedValue({ error: null });

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabaseAuthSetupMessage: "offline",
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
      updateUser: updateUserMock,
      signOut: signOutMock,
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

function LogoutHarness() {
  const { isAuthenticated, loginName, logout } = usePlayerAuth();

  return (
    <div>
      <div data-testid="auth-state">{isAuthenticated ? "yes" : "no"}</div>
      <div data-testid="login-name">{loginName ?? "none"}</div>
      <button type="button" onClick={logout}>
        Sair
      </button>
    </div>
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  getSessionMock.mockClear();
  onAuthStateChangeMock.mockClear();
  signOutMock.mockReset();
  signOutMock.mockResolvedValue({ error: null });
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

  it("keeps the player logged out while Supabase signOut is still pending", async () => {
    signOutMock.mockImplementation(() => new Promise(() => undefined));

    render(
      <PlayerAuthProvider>
        <LogoutHarness />
      </PlayerAuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("yes");
      expect(screen.getByTestId("login-name")).toHaveTextContent("Hunter");
    });

    const callsBeforeLogout = getSessionMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: /sair/i }));

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("no");
      expect(screen.getByTestId("login-name")).toHaveTextContent("none");
    });

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalledWith({ scope: "local" });
    expect(getSessionMock).toHaveBeenCalledTimes(callsBeforeLogout);
  });
});
