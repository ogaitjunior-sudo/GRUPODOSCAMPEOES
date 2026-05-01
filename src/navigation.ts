import {
  BarChart3,
  Clock3,
  Compass,
  Crown,
  HelpCircle,
  LogIn,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  highlight?: boolean;
}

export const navItems: NavItem[] = [
  { label: "In\u00edcio", path: "/", icon: Trophy },
  { label: "Campeonatos", path: "/campeonatos", icon: Trophy },
  { label: "Explorar", path: "/explorar", icon: Compass },
  { label: "Ranking", path: "/ranking", icon: BarChart3 },
  { label: "Campe\u00f5es", path: "/campeoes", icon: Crown },
  { label: "Ligas", path: "/ligas", icon: Clock3 },
  { label: "Rel\u00e2mpago", path: "/relampago", icon: Zap, highlight: true },
  { label: "Ajuda", path: "/ajuda", icon: HelpCircle },
];

export const loginRoute = { label: "Entrar", path: "/entrar", icon: LogIn };
