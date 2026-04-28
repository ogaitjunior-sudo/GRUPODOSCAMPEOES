export type FriendlyChallengeStatus = "pending" | "accepted" | "rejected";

export interface FriendlyChallengeRecord {
  id: string;
  championshipId: string | null;
  championshipName: string | null;
  fromTeamId: string;
  toTeamId: string;
  fromPlayerId: string | null;
  fromPlayerEmail: string | null;
  toPlayerId: string | null;
  toPlayerEmail: string | null;
  fromTeamName: string;
  toTeamName: string;
  fromFlagUrl: string | null;
  toFlagUrl: string | null;
  date: string;
  time: string;
  message: string | null;
  status: FriendlyChallengeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFriendlyChallengeInput {
  championshipId: string | null;
  championshipName: string | null;
  fromTeamId: string;
  toTeamId: string;
  fromPlayerId: string | null;
  fromPlayerEmail: string | null;
  toPlayerId: string | null;
  toPlayerEmail: string | null;
  fromTeamName: string;
  toTeamName: string;
  fromFlagUrl: string | null;
  toFlagUrl: string | null;
  date: string;
  time: string;
  message: string | null;
}

export interface FriendlyChallengeIdentity {
  playerId: string | null;
  playerEmail: string | null;
}
