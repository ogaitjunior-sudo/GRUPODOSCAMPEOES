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
  X,
} from "lucide-react";
import logoGC from "@/assets/logo-gc-fc26.png";
import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { SiteActionLink } from "@/components/SiteActionLink";
import { usePlayerAuth } from "@/contexts/PlayerAuthContext";
import { readStoredPlayerAvatar } from "@/lib/player-profile-store";
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
    avatarUrl,
    loginName,
    playerEmail,
    logout: logoutPlayer,
  } = usePlayerAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const LoginIcon = loginRoute.icon;
  const playerDisplayName = formatPlayerDisplayName(loginName);
  const resolvedPlayerAvatarUrl = avatarUrl ?? readStoredPlayerAvatar(playerEmail);
  const isItemActive = (path: string) =>
    path === "/" ? location.pathname === path : location.pathname.startsWith(path);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/8 bg-[#020304]/94 backdrop-blur-xl">
      <div className="mx-auto flex h-24 max-w-[1860px] items-center justify-between gap-8 px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-[70px] w-[70px] items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/30 shadow-[0_16px_36px_rgba(0,0,0,0.35)]">
            <img src={logoGC} alt="Grupo de Campeões FC26" className="h-[58px] w-[58px] object-contain" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block font-heading text-xl font-semibold tracking-[0.08em] text-foreground">
              Grupo de Campeões
            </span>
            <span className="mt-1 block text-sm tracking-[0.38em] text-muted-foreground">
              FC 26 • X1 UT
            </span>
          </span>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-8 xl:flex">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative py-3 text-base font-medium tracking-[0.01em] transition-colors after:absolute after:-bottom-2 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform",
                isItemActive(item.path)
                  ? "text-primary after:scale-x-100"
                  : "text-foreground/86 hover:text-primary",
                item.highlight && !isItemActive(item.path) && "text-primary hover:text-primary",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {isPlayerAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-foreground transition-colors hover:border-white/15 sm:inline-flex"
                >
                  <PlayerAvatar
                    name={playerDisplayName || "Jogador"}
                    avatarUrl={resolvedPlayerAvatarUrl}
                    size="sm"
                    className="h-7 w-7 border-primary/20"
                  />
                  <span className="font-medium">{playerDisplayName}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-60 rounded-[24px] site-card p-1.5 text-foreground shadow-[0_24px_60px_hsl(0_0%_0%_/_0.38)]"
              >
                {playerMenuPrimaryItems.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    asChild
                    className="cursor-pointer rounded-2xl px-4 py-3 text-[14px] font-medium text-foreground focus:bg-white/5"
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
                    className="cursor-pointer rounded-2xl px-4 py-3 text-[14px] font-medium text-muted-foreground focus:bg-white/5 focus:text-foreground"
                  >
                    <Link to={item.path} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
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
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <SiteActionLink
                to="/criar-conta"
                variant="ghost"
                size="sm"
                className="hidden text-base text-foreground/86 hover:text-primary lg:inline-flex"
              >
                Criar conta
              </SiteActionLink>
              <SiteActionLink
                to={loginRoute.path}
                variant="primary"
                size="sm"
                icon={LoginIcon}
                className="hidden min-h-[58px] min-w-[150px] px-8 text-base shadow-[0_18px_36px_rgba(255,204,0,0.18)] sm:inline-flex"
              >
                {loginRoute.label}
              </SiteActionLink>
            </>
          )}

          <button
            onClick={() => setMobileOpen((current) => !current)}
            className="rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-foreground xl:hidden"
            aria-expanded={mobileOpen}
            aria-label="Abrir navegação pública"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/8 bg-background/92 xl:hidden">
          <div className="container mx-auto px-4 py-4">
            <div className="rounded-[24px] site-card p-3">
              <div className="mb-2 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.22em] text-primary">Navegação</p>
              </div>

              <div className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors",
                      isItemActive(item.path)
                        ? "bg-white/6 text-foreground"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-[24px] site-card-soft p-3">
              {isPlayerAuthenticated ? (
                <>
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 text-foreground">
                    <PlayerAvatar
                      name={playerDisplayName || "Jogador"}
                      avatarUrl={resolvedPlayerAvatarUrl}
                      size="md"
                      className="h-9 w-9 border-primary/20"
                    />
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Conta do jogador
                      </p>
                      <span className="mt-1 block font-medium">{playerDisplayName}</span>
                    </div>
                  </div>

                  {[...playerMenuPrimaryItems, ...playerMenuSecondaryItems].map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}

                  <button
                    type="button"
                    onClick={logoutPlayer}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-primary transition-colors hover:bg-primary/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair da conta
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3 p-2">
                  <SiteActionLink to={loginRoute.path} variant="primary" icon={LoginIcon}>
                    {loginRoute.label}
                  </SiteActionLink>
                  <SiteActionLink to="/criar-conta" variant="secondary">
                    Criar conta
                  </SiteActionLink>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
