export type GroupMatchStatus = "scheduled" | "completed";
export type BracketMatchStatus = "pending" | "ready" | "completed";
export type BracketProgressState = "not-generated" | "generated" | "in-progress" | "completed";
export type BracketConsistencyStatus = "idle" | "fresh" | "outdated" | "frozen";
export type BracketStageKey =
  | "round-of-16"
  | "quarterfinal"
  | "semifinal"
  | "final"
  | "third-place";
export type MatchResolutionType = "normal" | "extra-time" | "penalties" | "wo";
export type BracketSlot = "home" | "away";

export interface ChampionshipTeam {
  id: string;
  name: string;
  seed: number;
  groupId: string | null;
  pointsAdjustment: number;
}

export interface ChampionshipGroup {
  id: string;
  name: string;
  order: number;
}

export interface ChampionshipGroupMatch {
  id: string;
  championshipId: string;
  groupId: string;
  roundNumber: number;
  matchOrder: number;
  homeTeamId: string;
  awayTeamId: string;
  playedAt: string | null;
  venue: string;
  scoreHome: number | null;
  scoreAway: number | null;
  status: GroupMatchStatus;
}

export interface GroupStandingRow {
  groupId: string;
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  pointsAdjustment: number;
  position: number;
}

export interface GroupStandingGroup {
  groupId: string;
  groupName: string;
  rows: GroupStandingRow[];
}

export type ChampionshipBracketSource =
  | {
      type: "group-position";
      groupId: string;
      position: number;
      label: string;
    }
  | {
      type: "match-winner";
      matchId: string;
      label: string;
    }
  | {
      type: "match-loser";
      matchId: string;
      label: string;
    }
  | {
      type: "manual-team";
      teamId: string | null;
      label: string;
    };

export interface ChampionshipBracketRound {
  id: string;
  stageKey: BracketStageKey;
  stageName: string;
  roundOrder: number;
  visualOrder: number;
}

export interface ChampionshipBracketMatch {
  id: string;
  championshipId: string;
  roundId: string;
  stageKey: BracketStageKey;
  stageName: string;
  roundOrder: number;
  matchOrder: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  sourceHome: ChampionshipBracketSource;
  sourceAway: ChampionshipBracketSource;
  winnerTeamId: string | null;
  loserTeamId: string | null;
  nextMatchId: string | null;
  nextSlot: BracketSlot | null;
  loserNextMatchId: string | null;
  loserNextSlot: BracketSlot | null;
  scoreHome: number | null;
  scoreAway: number | null;
  penaltiesHome: number | null;
  penaltiesAway: number | null;
  playedAt: string | null;
  venue: string;
  resolution: MatchResolutionType | null;
  status: BracketMatchStatus;
}

export interface ChampionshipBracketState {
  state: BracketProgressState;
  consistencyStatus: BracketConsistencyStatus;
  consistencyMessage: string | null;
  classificationSignature: string | null;
  generatedAt: string | null;
  rounds: ChampionshipBracketRound[];
  matches: ChampionshipBracketMatch[];
}

export interface ChampionshipScoringSettings {
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
}

export interface ChampionshipWorkspaceRecord {
  championshipId: string;
  teams: ChampionshipTeam[];
  groups: ChampionshipGroup[];
  groupMatches: ChampionshipGroupMatch[];
  bracket: ChampionshipBracketState;
  scoring: ChampionshipScoringSettings;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMatchUpdateInput {
  playedAt?: string | null;
  venue?: string;
  scoreHome?: number | null;
  scoreAway?: number | null;
}

export interface BracketMatchUpdateInput {
  playedAt?: string | null;
  venue?: string;
  scoreHome?: number | null;
  scoreAway?: number | null;
  penaltiesHome?: number | null;
  penaltiesAway?: number | null;
  resolution?: MatchResolutionType | null;
  winnerTeamId?: string | null;
  manualHomeTeamId?: string | null;
  manualAwayTeamId?: string | null;
}
