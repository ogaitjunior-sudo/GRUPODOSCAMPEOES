import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  UltimateTeamGroupDashboard,
  type UltimateTeamMatchEntry,
  type UltimateTeamStandingsEntry,
} from "@/components/championship/UltimateTeamDashboard";

const standings: UltimateTeamStandingsEntry[] = [
  {
    id: "team-1",
    position: 1,
    team: {
      id: "team-1",
      name: "teste1",
      meta: "@teste1",
      teamPhotoUrl: "https://example.com/teste1.webp",
      flagUrl: null,
    },
    points: 3,
    played: 1,
    wins: 1,
    draws: 0,
    losses: 0,
    goalsFor: 2,
    goalsAgainst: 0,
    goalDifference: 2,
    efficiency: 100,
  },
];

const matches: UltimateTeamMatchEntry[] = [
  {
    id: "match-1",
    home: {
      id: "team-1",
      name: "teste1",
      meta: "@teste1",
      teamPhotoUrl: "https://example.com/teste1.webp",
      flagUrl: null,
    },
    away: {
      id: "team-2",
      name: "teste2",
      meta: "@teste2",
      teamPhotoUrl: null,
      flagUrl: null,
    },
    scoreHome: null,
    scoreAway: null,
    statusLabel: "Em disputa",
    metaLabel: "A definir",
  },
];

describe("ultimate team dashboard", () => {
  it("renders team photos inside the square team identity slot", () => {
    render(
      <UltimateTeamGroupDashboard
        roundTitle="RODADA 1"
        standings={standings}
        matches={matches}
      />,
    );

    const teamPhotoBadges = screen.getAllByLabelText(/foto da equipe teste1/i);

    expect(teamPhotoBadges).toHaveLength(2);

    teamPhotoBadges.forEach((badge) => {
      expect(badge).toHaveClass("h-9");
      expect(badge).toHaveClass("w-9");
      expect(badge).toHaveClass("rounded-[10px]");
    });
  });
});
