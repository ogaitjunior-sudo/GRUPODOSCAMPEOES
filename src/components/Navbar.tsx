import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  ChevronDown,
  HelpCircle,
  List,
  LogOut,
  Menu,
  Search,
  User,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import logoGC from "@/assets/logo-gc-fc26.png";
import { usePlayerAuth } from "@/contexts/PlayerAuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { loginRoute, navItems } from "@/navigation";

const playerMenuPrimaryItems = [
  { label: "Perfil", path: "/perfil", icon: User },
  { label: "Campeonatos", path: "/perfil?aba=campeonatos", icon: List },
  { label: "Ranking", path: "/perfil?aba=rankings", icon: BarChart3 },
];

const playerMenuSecondaryItems = [
  { label: "Explorar", path: "/explorar", icon: Search },
  { label: "Ajuda", path: "/ajuda", icon: HelpCircle },
];

function formatPlayerDisplayName(name: string | null) {
  if (!name) {
    return "";
  }

  return name.trim();
}

export function Navbar() {
  const location = useLocation();
  const {
    isAuthenticated: isPlayerAuthenticated,
    loginName,
    logout: logoutPlayer,
  } = usePlayerAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const LoginIcon = loginRoute.icon;
  const playerDisplayName = formatPlayerDisplayName(loginName);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/8 bg-background/72 backdrop-blur-xl">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-full panel-premium-soft px-3 py-2 transition-transform hover:-translate-y-0.5"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-black/30">
            <img src={logoGC} alt="Grupo de Campeoes FC26" className="h-9 w-9" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block font-heading text-sm font-bold gradient-gold-text">
              GRUPO DE CAMPEOES
            </span>
            <span className="block text-[10px] uppercase tracking-[0.26em] text-muted-foreground">
              X1 UT FC 26
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-2 rounded-full panel-premium-soft px-2 py-2 lg:flex">
          {navItems.map((item) => {
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-medium transition-all duration-200",
                  item.highlight && "font-bold text-primary text-glow-gold",
                  active &&
                    "bg-primary/12 text-primary shadow-[0_0_0_1px_hsl(51_100%_50%_/_0.18)]",
                  !active &&
                    !item.highlight &&
                    "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.highlight ? <span className="text-[10px]">X1</span> : null}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {isPlayerAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden h-12 items-center gap-2 rounded-full panel-premium px-3.5 text-[13px] font-heading font-bold text-foreground transition hover:-translate-y-0.5 hover:border-electric/45 sm:flex"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/25 bg-background/80 text-primary">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <span className="text-sm">{playerDisplayName}</span>
                  <ChevronDown className="h-4 w-4 text-electric" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-60 rounded-[24px] panel-premium p-1.5 text-foreground shadow-[0_24px_60px_hsl(0_0%_0%_/_0.5)]"
              >
                {playerMenuPrimaryItems.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    asChild
                    className="cursor-pointer rounded-2xl px-4 py-3 text-[14px] font-medium text-foreground focus:bg-electric/10 focus:text-electric"
                  >
                    <Link to={item.path} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-primary" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="mx-2 my-1 bg-border" />

                {playerMenuSecondaryItems.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    asChild
                    className="cursor-pointer rounded-2xl px-4 py-3 text-[14px] font-medium text-muted-foreground focus:bg-electric/10 focus:text-electric"
                  >
                    <Link to={item.path} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-electric" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="mx-2 my-1 bg-border" />

                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    logoutPlayer();
                  }}
                  className="cursor-pointer rounded-2xl px-4 py-3 text-[14px] font-medium text-primary focus:bg-primary/10 focus:text-primary"
                >
                  <LogOut className="mr-2 h-4 w-4 text-primary" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                to="/criar-conta"
                className="hidden items-center gap-1.5 rounded-full panel-premium-soft px-5 py-2.5 text-xs font-heading font-bold text-foreground transition-all hover:-translate-y-0.5 hover:bg-white/10 md:flex"
              >
                <UserPlus className="h-4 w-4" />
                Criar conta
              </Link>
              <Link
                to={loginRoute.path}
                className="hidden items-center gap-1.5 rounded-full border-glow-gold px-5 py-2.5 text-xs font-heading font-bold gradient-gold text-primary-foreground transition-all hover:-translate-y-0.5 hover:brightness-110 sm:flex"
              >
                <LoginIcon className="h-4 w-4" />
                {loginRoute.label}
              </Link>
            </>
          )}

          <button
            onClick={() => setMobileOpen((current) => !current)}
            className="rounded-full panel-premium-soft p-2.5 text-foreground lg:hidden"
            aria-expanded={mobileOpen}
            aria-label="Abrir navegacao publica"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/8 bg-background/92 panel-premium animate-fade-in-up lg:hidden">
          <div className="mx-3 mt-3 rounded-2xl border border-primary/15 bg-primary/8 px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.28em] text-primary">Plataforma publica</p>
            <p className="mt-2 text-sm text-foreground">
              Campeonatos X1 UT, ranking, relampagos e painel do jogador.
            </p>
          </div>

          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "mx-3 mt-3 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm transition-colors",
                location.pathname === item.path && "bg-primary/12 text-primary",
                item.highlight && "font-bold text-primary",
                location.pathname !== item.path &&
                  !item.highlight &&
                  "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}

          {isPlayerAuthenticated ? (
            <>
              <div className="mx-3 mt-3 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-electric">
                <UserRound className="h-4 w-4" />
                {playerDisplayName}
              </div>
              <Link
                to="/perfil"
                className="mx-3 mt-3 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm text-foreground"
              >
                <User className="h-4 w-4" />
                Perfil
              </Link>
              <Link
                to="/perfil?aba=campeonatos"
                className="mx-3 mt-3 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm text-foreground"
              >
                <List className="h-4 w-4" />
                Campeonatos
              </Link>
              <Link
                to="/perfil?aba=rankings"
                className="mx-3 mt-3 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm text-foreground"
              >
                <BarChart3 className="h-4 w-4" />
                Ranking
              </Link>
              <button
                type="button"
                onClick={logoutPlayer}
                className="mx-3 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-2xl px-6 py-3 text-left text-sm font-bold text-primary"
              >
                <LogOut className="h-4 w-4" />
                Sair da conta
              </button>
            </>
          ) : (
            <>
              <Link
                to="/criar-conta"
                className="mx-3 mt-3 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-foreground"
              >
                <UserPlus className="h-4 w-4" />
                Criar conta
              </Link>
              <Link
                to={loginRoute.path}
                className="mx-3 mb-3 mt-3 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-primary"
              >
                <LoginIcon className="h-4 w-4" />
                {loginRoute.label}
              </Link>
            </>
          )}

        </div>
      ) : null}
    </nav>
  );
}
