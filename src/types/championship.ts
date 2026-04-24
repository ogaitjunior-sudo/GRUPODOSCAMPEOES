export type ChampionshipStatus =
  | "DRAFT"
  | "REGISTRATION"
  | "READY"
  | "STARTED"
  | "FINISHED";

export type ChampionshipGame = "FC 26";

export type ChampionshipPlatform =
  | "PlayStation 5"
  | "PlayStation 4"
  | "Xbox Series"
  | "Xbox One"
  | "PC";

export type ChampionshipFormat =
  | "points-league"
  | "points-league-knockout"
  | "groups-knockout"
  | "knockout"
  | "cross-brackets";

export type RoundTripMode = "single-leg" | "home-away";
export type KnockoutBracketMode = "cross-groups" | "best-vs-worst";
export type KnockoutSetupMode = "automatic" | "manual";
export type MatchReportingMode = "admin" | "players";
export type RegistrationMode = "public" | "private";
export type BracketSyncPolicy = "warn" | "freeze";
export type ChampionshipRegistrationStatus = "pending" | "approved" | "rejected";

export interface ChampionshipPhaseLabels {
  roundOf16: string;
  quarterfinal: string;
  semifinal: string;
  final: string;
  thirdPlace: string;
}

export interface ChampionshipConfiguration {
  game: ChampionshipGame;
  rankingName: string;
  isRankedGame: boolean;
  platform: ChampionshipPlatform;
  format: ChampionshipFormat;
  qualifiedPerGroup: number;
  groupCount: number;
  groupStageMode: RoundTripMode;
  knockoutMode: RoundTripMode;
  knockoutBracketMode: KnockoutBracketMode;
  knockoutSetupMode: KnockoutSetupMode;
  finalMode: RoundTripMode;
  hasFinalStage: boolean;
  thirdPlaceMatch: boolean;
  awayGoalsRule: boolean;
  bracketSyncPolicy: BracketSyncPolicy;
  phaseLabels: ChampionshipPhaseLabels;
  resultsReportedBy: MatchReportingMode;
  registrationMode: RegistrationMode;
  playerChoosesTeamOnSignup: boolean;
  liveDraw: boolean;
  entryFee: string;
  extraInformation: string;
}

export interface ChampionshipRecord {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  teamCount: number;
  rules: string;
  status: ChampionshipStatus;
  configuration: ChampionshipConfiguration;
  registrationRequests: ChampionshipRegistrationRequest[];
  createdAt: string;
  updatedAt: string;
}

export interface ChampionshipFormValues {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  teamCount: number;
  rules: string;
  status: ChampionshipStatus;
  configuration: ChampionshipConfiguration;
}

export interface ChampionshipRegistrationRequest {
  id: string;
  playerId: string;
  playerName: string;
  playerEmail: string;
  status: ChampionshipRegistrationStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}
