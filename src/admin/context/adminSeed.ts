import type { AdminPanelState, SiteSettings } from "@/admin/types";

export function createDefaultSiteSettings(): SiteSettings {
  return {
    siteName: "Grupo de Campeoes X1 UT",
    logoUrl: "/src/assets/logo-gc-fc26.png",
    faviconUrl: "/favicon.ico",
    primaryColor: "#ffcc00",
    accentColor: "#00b8ff",
    institutionalText:
      "Painel interno para operacao de campeonatos X1 de Ultimate Team, validacao de contas e acompanhamento do circuito competitivo.",
    platformStatus: "healthy",
    seoTitle: "Grupo de Campeoes X1 UT | Circuito oficial",
    seoDescription:
      "Plataforma competitiva com campeonatos X1 de Ultimate Team, ranking, perfis de jogadores e operacao interna dedicada.",
    socialLinks: {
      discord: "https://discord.gg/grupodecampeoes",
      instagram: "https://instagram.com/grupodecampeoes",
      youtube: "https://youtube.com/@grupodecampeoes",
      twitch: "https://twitch.tv/grupodecampeoes",
    },
    registrationMode: "approval_only",
    maintenanceMode: false,
    allowImageUploads: true,
    banners: [],
    staticPages: [],
  };
}

export function createInitialAdminPanelState(): AdminPanelState {
  return {
    users: [],
    players: [],
    teams: [],
    championships: [],
    imageRequests: [],
    languages: [],
    tickets: [],
    auditLogs: [],
    errorLogs: [],
    settings: createDefaultSiteSettings(),
  };
}
