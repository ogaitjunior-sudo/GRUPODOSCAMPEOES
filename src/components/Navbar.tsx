import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
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

type NavbarNotification = {
  id: string;
  title: string;
  description: string;
  read: boolean;
};

const playerNotifications: NavbarNotification[] = [];

function formatPlayerDisplayName(name: string | null) {
  if (!name) {
    return "";
  }

  return name.trim();
}

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    isAuthenticated: isPlayerAuthenticated,
    avatarUrl,
    loginName,
    playerEmail,
    logout: logoutPlayer,
  } = usePlayerAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationWrapperRef = useRef<HTMLDivElement | null>(null);
  const LoginIcon = loginRoute.icon;
  const playerDisplayName = formatPlayerDisplayName(loginName);
  const resolvedPlayerAvatarUrl = avatarUrl ?? readStoredPlayerAvatar(playerEmail);
  const isHomeRoute = location.pathname === "/";
  const unreadCount = playerNotifications.filter((notification) => !notification.read).length;
  const isItemActive = (path: string) =>
    path === "/" ? location.pathname === path : location.pathname.startsWith(path);

  useEffect(() => {
    setMobileOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }

    const handlePointerOutside = (event: MouseEvent) => {
      if (!notificationWrapperRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerOutside);

    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    if (!mobileOpen || window.innerWidth > 768) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const handlePlayerLogout = () => {
    logoutPlayer();
    setMobileOpen(false);
    setNotificationsOpen(false);
    navigate("/entrar", { replace: true });
  };

  return (
    <nav className={cn("premium-header tr-header", !isHomeRoute && "bg-[#020202]/92")}>
      <div className="premium-header-shell tr-header-inner header-inner">
        <Link to="/" className="premium-header-brand tr-brand header-logo">
            <img
              src={logoGC}
              alt="Grupo de Campeões FC26"
              className="h-[38px] w-[38px] object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.38)]"
            />

          <span className="premium-header-brand-copy tr-brand-text hidden sm:block">
            <span className="premium-header-brand-title site-title font-heading">
              {"Grupo de Campeões"}
            </span>
            <span className="premium-header-brand-subtitle tr-brand-subtitle site-subtitle">
              {"FC 26 • X1 UT"}
            </span>
          </span>
        </Link>

        <div className="premium-header-menu tr-nav desktop-nav hidden xl:flex">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "premium-header-link gold-flash-hover py-2",
                isItemActive(item.path) && "is-active",
                item.highlight && !isItemActive(item.path) && "text-primary",
              )}
            >
              <span className="inline-flex items-center gap-2">
                {item.label}
                {item.highlight ? <item.icon className="h-3.5 w-3.5" /> : null}
              </span>
            </Link>
          ))}
        </div>

        <div className="header-actions-wrapper flex items-center gap-3">
          {isPlayerAuthenticated ? (
            <div className="tr-header-actions header-actions">
              <div
                ref={notificationWrapperRef}
                className="tr-notification-wrapper hidden sm:block"
              >
                <button
                  type="button"
                  className="tr-notification-btn gold-flash-hover gold-hover-scale"
                  aria-expanded={notificationsOpen}
                  aria-label={
                    unreadCount > 0
                      ? `Abrir notificações (${unreadCount} não lidas)`
                      : "Abrir notificações"
                  }
                  onClick={() => setNotificationsOpen((current) => !current)}
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {unreadCount > 0 ? (
                    <span className="tr-notification-badge">{unreadCount}</span>
                  ) : null}
                </button>

                {notificationsOpen ? (
                  <div className="tr-notification-dropdown">
                    <div className="tr-notification-title">Notificações</div>

                    {playerNotifications.length > 0 ? (
                      <>
                        {playerNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={cn(
                              "tr-notification-item",
                              !notification.read && "unread",
                            )}
                          >
                            <strong>{notification.title}</strong>
                            <span>{notification.description}</span>
                          </div>
                        ))}

                        <button
                          type="button"
                          className="tr-notification-footer"
                          onClick={() => {
                            setNotificationsOpen(false);
                            navigate("/perfil?aba=atividade");
                          }}
                        >
                          Ver todas as notificações
                        </button>
                      </>
                    ) : (
                      <div className="tr-notification-empty">
                        Nenhuma notificação no momento.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "premium-header-profile tr-user-menu profile-menu user-dropdown-trigger gold-flash-hover gold-hover-scale hidden sm:inline-flex",
                      isHomeRoute ? "min-w-[216px]" : "min-w-[196px]",
                    )}
                  >
                    <PlayerAvatar
                      name={playerDisplayName || "Jogador"}
                      avatarUrl={resolvedPlayerAvatarUrl}
                      size="sm"
                      className="h-8 w-8 border-primary/40"
                    />
                    <span className="premium-header-profile-name truncate uppercase tracking-[0.03em]">
                      {playerDisplayName}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-white/72" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  sideOffset={10}
                  className="profile-dropdown user-dropdown w-60 rounded-[24px] site-card p-1.5 text-foreground shadow-[0_24px_60px_hsl(0_0%_0%_/_0.38)]"
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
                      handlePlayerLogout();
                    }}
                    className="cursor-pointer rounded-2xl px-4 py-3 text-[14px] font-medium text-primary focus:bg-primary/10 focus:text-primary"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
            className="mobile-menu-btn rounded-full border border-primary/20 bg-primary/[0.06] p-2.5 text-foreground shadow-[0_0_14px_rgba(255,204,0,0.08)] xl:hidden"
            aria-expanded={mobileOpen}
            aria-label={"Abrir navegação pública"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div
          className="mobile-menu mobile-menu-layer border-t border-white/8 bg-background/92 xl:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6">
            <div
              className="mobile-menu-panel rounded-[24px] site-card p-3"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-2 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.22em] text-primary">
                  {"NAVEGAÇÃO"}
                </p>
              </div>

              <div className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "mobile-menu-entry flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm transition-colors",
                      isItemActive(item.path)
                        ? "active bg-white/6 text-foreground"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <span className="inline-flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-70" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="my-3 h-px bg-white/8" />

            <div
              className="mobile-menu-panel rounded-[24px] site-card-soft p-3"
              onClick={(event) => event.stopPropagation()}
            >
              {isPlayerAuthenticated ? (
                <>
                  <div className="mobile-menu-account-summary flex items-center gap-3 rounded-2xl px-4 py-3 text-foreground">
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
                      className={cn(
                        "mobile-menu-entry flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground",
                        isItemActive(item.path) && "active text-foreground",
                      )}
                    >
                      <span className="inline-flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      <ChevronRight className="h-4 w-4 opacity-70" />
                    </Link>
                  ))}

                  <button
                    type="button"
                    onClick={handlePlayerLogout}
                    className="mobile-menu-entry mobile-menu-danger flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm text-primary transition-colors hover:bg-primary/10"
                  >
                    <span className="inline-flex items-center gap-3">
                      <LogOut className="h-4 w-4" />
                      Sair da conta
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-70" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3 p-2">
                  <SiteActionLink
                    to={loginRoute.path}
                    variant="primary"
                    icon={LoginIcon}
                    iconPosition="right"
                    className="mobile-menu-entry !flex !min-h-[46px] !w-full !justify-between !rounded-2xl !px-4 !py-3 text-sm"
                  >
                    {loginRoute.label}
                  </SiteActionLink>
                  <SiteActionLink
                    to="/criar-conta"
                    variant="secondary"
                    icon={ChevronRight}
                    iconPosition="right"
                    className="mobile-menu-entry !flex !min-h-[46px] !w-full !justify-between !rounded-2xl !px-4 !py-3 text-sm"
                  >
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
