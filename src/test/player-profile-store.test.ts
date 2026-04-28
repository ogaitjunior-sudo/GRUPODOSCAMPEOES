import { afterEach, describe, expect, it } from "vitest";
import {
  readStoredPlayerAvatar,
  readStoredPlayerTeamPhoto,
  writeStoredPlayerAvatar,
  writeStoredPlayerTeamPhoto,
} from "@/lib/player-profile-store";

afterEach(() => {
  window.localStorage.clear();
});

describe("player profile store", () => {
  it("persists the avatar url by normalized player email", () => {
    writeStoredPlayerAvatar("Teste3@GMAIL.com", "data:image/webp;base64,AAA");

    expect(readStoredPlayerAvatar("teste3@gmail.com")).toBe("data:image/webp;base64,AAA");
  });

  it("stores null when the avatar is removed", () => {
    writeStoredPlayerAvatar("teste3@gmail.com", "data:image/png;base64,AAA");
    writeStoredPlayerAvatar("teste3@gmail.com", null);

    expect(readStoredPlayerAvatar("teste3@gmail.com")).toBeNull();
  });

  it("persists the team photo without overwriting the player avatar", () => {
    writeStoredPlayerAvatar("teste3@gmail.com", "data:image/png;base64,PLAYER");
    writeStoredPlayerTeamPhoto("Teste3@GMAIL.com", "data:image/webp;base64,TEAM");

    expect(readStoredPlayerAvatar("teste3@gmail.com")).toBe("data:image/png;base64,PLAYER");
    expect(readStoredPlayerTeamPhoto("teste3@gmail.com")).toBe("data:image/webp;base64,TEAM");
  });

  it("removes only the team photo when requested", () => {
    writeStoredPlayerAvatar("teste3@gmail.com", "data:image/png;base64,PLAYER");
    writeStoredPlayerTeamPhoto("teste3@gmail.com", "data:image/webp;base64,TEAM");
    writeStoredPlayerTeamPhoto("teste3@gmail.com", null);

    expect(readStoredPlayerAvatar("teste3@gmail.com")).toBe("data:image/png;base64,PLAYER");
    expect(readStoredPlayerTeamPhoto("teste3@gmail.com")).toBeNull();
  });
});
