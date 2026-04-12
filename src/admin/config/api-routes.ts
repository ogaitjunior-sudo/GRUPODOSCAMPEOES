export const adminApiRoutes = {
  auth: {
    login: "/api/admin/auth/login",
    logout: "/api/admin/auth/logout",
    me: "/api/admin/auth/me",
  },
  dashboard: {
    overview: "/api/admin/dashboard/overview",
    activity: "/api/admin/dashboard/activity",
    errors: "/api/admin/dashboard/errors",
  },
  users: {
    list: "/api/admin/users",
    detail: (id: string) => `/api/admin/users/${id}`,
    history: (id: string) => `/api/admin/users/${id}/history`,
    status: (id: string) => `/api/admin/users/${id}/status`,
    permissions: (id: string) => `/api/admin/users/${id}/permissions`,
  },
  players: {
    list: "/api/admin/players",
    detail: (id: string) => `/api/admin/players/${id}`,
    status: (id: string) => `/api/admin/players/${id}/status`,
    participation: (id: string) => `/api/admin/players/${id}/participation`,
  },
  teams: {
    list: "/api/admin/teams",
    detail: (id: string) => `/api/admin/teams/${id}`,
    members: (id: string) => `/api/admin/teams/${id}/members`,
    status: (id: string) => `/api/admin/teams/${id}/status`,
  },
  championships: {
    list: "/api/admin/championships",
    detail: (id: string) => `/api/admin/championships/${id}`,
    phases: (id: string) => `/api/admin/championships/${id}/phases`,
    registrations: (id: string) => `/api/admin/championships/${id}/registrations`,
  },
  images: {
    list: "/api/admin/image-requests",
    detail: (id: string) => `/api/admin/image-requests/${id}`,
    moderate: (id: string) => `/api/admin/image-requests/${id}/moderate`,
  },
  languages: {
    list: "/api/admin/languages",
    detail: (id: string) => `/api/admin/languages/${id}`,
    translations: (id: string) => `/api/admin/languages/${id}/translations`,
  },
  support: {
    list: "/api/admin/tickets",
    detail: (id: string) => `/api/admin/tickets/${id}`,
    reply: (id: string) => `/api/admin/tickets/${id}/reply`,
  },
  logs: {
    audit: "/api/admin/logs/audit",
    errors: "/api/admin/logs/errors",
    exportAudit: "/api/admin/logs/audit/export",
    exportErrors: "/api/admin/logs/errors/export",
  },
  settings: {
    site: "/api/admin/settings/site",
    banners: "/api/admin/settings/banners",
    staticPages: "/api/admin/settings/static-pages",
  },
} as const;

