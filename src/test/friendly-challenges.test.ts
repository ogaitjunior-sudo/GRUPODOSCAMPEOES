import { describe, expect, it } from "vitest";
import {
  findPendingFriendlyChallenge,
  splitFriendlyChallengesForPlayer,
} from "@/lib/friendly-challenges";
import type { FriendlyChallengeRecord } from "@/types/friendly-challenge";

const baseChallenge: FriendlyChallengeRecord = {
  id: "challenge-1",
  championshipId: "championship-1",
  championshipName: "Copa Elite",
  fromTeamId: "team-1",
  toTeamId: "team-2",
  fromPlayerId: "player-1",
  fromPlayerEmail: "one@example.com",
  toPlayerId: "player-2",
  toPlayerEmail: "two@example.com",
  fromTeamName: "Lions FC",
  toTeamName: "Ravens FC",
  fromFlagUrl: "https://example.com/lions.png",
  toFlagUrl: "https://example.com/ravens.png",
  date: "2026-05-10",
  time: "21:30",
  message: "Treino valendo ajuste tatico",
  status: "pending",
  createdAt: "2026-04-28T20:00:00.000Z",
  updatedAt: "2026-04-28T20:00:00.000Z",
};

describe("friendly challenge helpers", () => {
  it("detects a pending challenge between the same pair regardless of direction", () => {
    const challenge = findPendingFriendlyChallenge([baseChallenge], {
      championshipId: "championship-1",
      teamAId: "team-2",
      teamBId: "team-1",
    });

    expect(challenge?.id).toBe("challenge-1");
  });

  it("splits sent and received challenges for the logged player identity", () => {
    const acceptedChallenge: FriendlyChallengeRecord = {
      ...baseChallenge,
      id: "challenge-2",
      fromTeamId: "team-3",
      toTeamId: "team-1",
      fromPlayerId: "player-3",
      fromPlayerEmail: "three@example.com",
      toPlayerId: "player-1",
      toPlayerEmail: "one@example.com",
      fromTeamName: "Wolves FC",
      toTeamName: "Lions FC",
      status: "accepted",
      createdAt: "2026-04-29T10:00:00.000Z",
      updatedAt: "2026-04-29T10:00:00.000Z",
    };
    const split = splitFriendlyChallengesForPlayer([baseChallenge, acceptedChallenge], {
      playerId: "player-1",
      playerEmail: "ONE@example.com",
    });

    expect(split.sent.map((item) => item.id)).toEqual(["challenge-1"]);
    expect(split.received.map((item) => item.id)).toEqual(["challenge-2"]);
  });
});
