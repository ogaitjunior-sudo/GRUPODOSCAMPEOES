import type { AdminPermission, AdminRole } from "@/admin/config/security";

export type PlatformName = "PlayStation" | "Xbox" | "PC";

export type UserStatus = "active" | "inactive" | "suspended";
export type PlayerStatus = "pending" | "approved" | "blocked";
export type TeamStatus = "pending" | "approved" | "rejected";
export type ChampionshipStatus = "draft" | "published" | "live" | "finished";
export type ImageRequestStatus = "pending" | "approved" | "rejected";
export type LanguageStatus = "active" | "inactive";
export type TicketStatus = "open" | "in_progress" | "waiting_user" | "resolved";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type ErrorSeverity = "warning" | "error" | "critical";
export type ActivityTone = "info" | "warning" | "critical" | "success";
export type ImageRequestType = "user" | "player" | "team";

export interface HistoryEntry {
  id: string;
  action: string;
  actor: string;
  at: string;
  description: string;
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole | "player" | "captain" | "manager";
  status: UserStatus;
  permissions: AdminPermission[];
  createdAt: string;
  lastLoginAt: string;
  history: HistoryEntry[];
}

export interface PlayerParticipation {
  id: string;
  competition: string;
  stage: string;
  result: string;
  playedAt: string;
}

export interface PlayerRecord {
  id: string;
  name: string;
  email: string;
  status: PlayerStatus;
  platform: PlatformName;
  linkedTeam: string;
  isVerified: boolean;
  participationHistory: PlayerParticipation[];
  createdAt: string;
}

export interface TeamRecord {
  id: string;
  name: string;
  tag: string;
  captain: string;
  platform: PlatformName;
  status: TeamStatus;
  members: string[];
  championships: number;
  summary: string;
  createdAt: string;
}

export interface ChampionshipParticipant {
  id: string;
  name: string;
  type: "player" | "team";
}

export interface ChampionshipRecord {
  id: string;
  name: string;
  format: string;
  status: ChampionshipStatus;
  registrationOpen: boolean;
  phase: string;
  participants: ChampionshipParticipant[];
  rules: string;
  startsAt: string;
  endsAt: string;
}

export interface ModerationAction {
  id: string;
  actor: string;
  action: "approved" | "rejected";
  reason?: string;
  at: string;
}

export interface ImageRequestRecord {
  id: string;
  requesterName: string;
  requesterType: ImageRequestType;
  previewUrl: string;
  status: ImageRequestStatus;
  submittedAt: string;
  moderationHistory: ModerationAction[];
}

export interface LanguageRecord {
  id: string;
  code: string;
  label: string;
  status: LanguageStatus;
  completion: number;
  updatedAt: string;
  sampleTranslations: Record<string, string>;
}

export interface TicketMessage {
  id: string;
  author: string;
  role: "user" | "admin";
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  requester: string;
  requesterEmail: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo: string;
  category: string;
  updatedAt: string;
  createdAt: string;
  messages: TicketMessage[];
}

export interface AuditLog {
  id: string;
  actor: string;
  module: string;
  action: string;
  target: string;
  createdAt: string;
  severity: ActivityTone;
}

export interface ErrorLog {
  id: string;
  module: string;
  message: string;
  stackSummary: string;
  createdAt: string;
  severity: ErrorSeverity;
  status: "new" | "investigating" | "resolved";
}

export interface BannerSetting {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  isActive: boolean;
}

export interface StaticPageSetting {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  published: boolean;
}

export interface SiteSettings {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
  institutionalText: string;
  platformStatus: "healthy" | "attention" | "maintenance";
  seoTitle: string;
  seoDescription: string;
  socialLinks: {
    discord: string;
    instagram: string;
    youtube: string;
    twitch: string;
  };
  registrationMode: "open" | "approval_only" | "invite_only";
  maintenanceMode: boolean;
  allowImageUploads: boolean;
  banners: BannerSetting[];
  staticPages: StaticPageSetting[];
}

export interface AdminAlert {
  id: string;
  title: string;
  description: string;
  tone: ActivityTone;
}

export interface AdminPanelState {
  users: ManagedUser[];
  players: PlayerRecord[];
  teams: TeamRecord[];
  championships: ChampionshipRecord[];
  imageRequests: ImageRequestRecord[];
  languages: LanguageRecord[];
  tickets: SupportTicket[];
  auditLogs: AuditLog[];
  errorLogs: ErrorLog[];
  settings: SiteSettings;
}
