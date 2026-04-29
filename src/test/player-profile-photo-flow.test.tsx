import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PerfilJogador from "@/pages/PerfilJogador";

const updateProfileAvatarMock = vi.fn();
const updateTeamPhotoMock = vi.fn();

vi.mock("@/contexts/ChampionshipContext", () => ({
  useChampionships: () => ({
    championships: [],
  }),
}));

vi.mock("@/contexts/FriendlyChallengesContext", () => ({
  useFriendlyChallenges: () => ({
    challenges: [],
    isLoading: false,
    updateChallengeStatus: vi.fn(),
  }),
}));

vi.mock("@/contexts/PlayerAuthContext", () => ({
  usePlayerAuth: () => ({
    isAuthenticated: true,
    loginName: "Hunter",
    playerEmail: "hunter@example.com",
    session: {
      id: "player-1",
      email: "hunter@example.com",
      displayName: "Hunter",
      avatarUrl: "https://example.com/avatar.webp",
      teamPhotoUrl: "https://example.com/team.webp",
      loginAt: "2026-04-28T00:00:00.000Z",
      provider: "supabase",
    },
    avatarUrl: "https://example.com/avatar.webp",
    teamPhotoUrl: "https://example.com/team.webp",
    isUpdatingProfile: false,
    updateProfileAvatar: updateProfileAvatarMock,
    updateTeamPhoto: updateTeamPhotoMock,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

function renderProfilePage() {
  return render(
    <MemoryRouter initialEntries={["/perfil?aba=perfil"]}>
      <Routes>
        <Route path="/perfil" element={<PerfilJogador />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  updateProfileAvatarMock.mockReset();
  updateTeamPhotoMock.mockReset();
  updateProfileAvatarMock.mockResolvedValue({ success: true, message: "Foto removida com sucesso." });
  updateTeamPhotoMock.mockResolvedValue({
    success: true,
    message: "Foto da equipe removida com sucesso.",
  });
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe("player profile photo flow", () => {
  it("prepares avatar removal locally before saving", async () => {
    renderProfilePage();

    fireEvent.click(screen.getAllByRole("button", { name: /remover foto/i })[0]);

    expect(updateProfileAvatarMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /cancelar alteracao/i }),
    ).toBeInTheDocument();

    const saveButton = screen.getByRole("button", { name: /^salvar foto$/i });
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateProfileAvatarMock).toHaveBeenCalledWith(null);
    });
  });
});
