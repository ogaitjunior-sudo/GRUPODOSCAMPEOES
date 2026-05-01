import {
  Cog,
  LayoutDashboard,
  Trophy,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AdminPermission } from "@/admin/config/security";

export interface AdminNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  permissions: AdminPermission[];
  description: string;
  matchPaths?: string[];
}

export const adminNavigation: AdminNavItem[] = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
    permissions: ["dashboard:view"],
    description: "Resumo operacional, alertas e acoes rapidas",
    matchPaths: ["/admin", "/admin/dashboard"],
  },
  {
    label: "Campeonatos",
    path: "/admin/campeonatos",
    icon: Trophy,
    permissions: ["championships:view"],
    description: "Criacao, edicao, calendario e gestao dos eventos",
    matchPaths: ["/admin/campeonatos"],
  },
  {
    label: "Jogadores",
    path: "/admin/jogadores",
    icon: Users,
    permissions: ["users:view", "players:view", "teams:view", "images:view"],
    description: "Cadastro, filtros, campeonatos vinculados e revisoes",
    matchPaths: [
      "/admin/jogadores",
      "/admin/perfis",
      "/admin/usuarios",
      "/admin/times",
      "/admin/imagens",
    ],
  },
  {
    label: "Configuracoes",
    path: "/admin/configuracoes",
    icon: Cog,
    permissions: ["settings:view", "logs:view", "languages:view", "support:view"],
    description: "Parametros globais, acessos avancados e sistema",
    matchPaths: [
      "/admin/configuracoes",
      "/admin/sistema",
      "/admin/logs",
      "/admin/idiomas",
      "/admin/suporte",
    ],
  },
];
