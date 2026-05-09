import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  ChevronDown,
  HelpCircle,
  List,
  LogOut,
  Menu,
  Search,
  User,
} from "lucide-react";
import logoGC from "@/assets/logo-gc-fc26.png";
import { AppRefreshButton } from "@/components/AppRefreshButton";
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

const desktopPlayerMenuPrimaryItems = [
  { label: "Perfil", path: "/perfil", icon: User },
  { label: "Campeonatos", path: "/perfil?aba=campeonatos", icon: List },
  { label: "Ranking", path: "/perfil?aba=rankings", icon: BarChart3 },
];

const mobilePlayerMenuPrimaryItems = [
  { label: "Perfil", path: "/perfil", icon: User },
  { label: "Campeonatos", path: "/campeonatos", icon: List },
  { label: "Ranking", path: "/ranking", icon: BarChart3 },
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const notificationWrapperRef = useRef<HTMLDivElement | null>(null);
  const profileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement | null>(null);
  const LoginIcon = loginRoute.icon;
  const playerDisplayName = formatPlayerDisplayName(loginName);
  const resolvedPlayerAvatarUrl = avatarUrl ?? readStoredPlayerAvatar(playerEmail);
  const isHomeRoute = location.pathname === "/";
  const unreadCount = playerNotifications.filter((notification) => !notification.read).length;
  const profileMenuPrimaryItems = isMobileViewport
    ? mobilePlayerMenuPrimaryItems
    : desktopPlayerMenuPrimaryItems;
  const isItemActive = (path: string) =>
    path === "/" ? location.pathname === path : location.pathname.startsWith(path);

  useEffect(() => {
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);

    syncViewport();

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    mediaQuery.addListener(handleChange);

    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

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
    if (!profileMenuOpen) {
      return;
    }

    const handlePointerOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;

      if (
        profileTriggerRef.current?.contains(target) ||
        profileDropdownRef.current?.contains(target)
      ) {
        return;
      }

      setProfileMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerOutside);
    document.addEventListener("touchstart", handlePointerOutside);

    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
      document.removeEventListener("touchstart", handlePointerOutside);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (typeof document === "undefined" || !isMobileViewport) {
      return;
    }

    const { overflow } = document.body.style;

    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isMobileViewport, mobileMenuOpen]);

  const handlePlayerLogout = () => {
    logoutPlayer();
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    navigate("/entrar", { replace: true });
  };

  const renderNotificationsPanel = () => {
    if (!notificationsOpen) {
      return null;
    }

    return (
      <div className="tr-notification-dropdown">
        <div className="tr-notification-title">Notificacoes</div>

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
              Ver todas as notificacoes
            </button>
          </>
        ) : (
          <div className="tr-notification-empty">
            Nenhuma notificacao no momento.
          </div>
        )}
      </div>
    );
  };

  const renderProfileMenuContent = () => (
    <DropdownMenuContent
      ref={profileDropdownRef}
      align="end"
      sideOffset={10}
      className="profile-dropdown user-dropdown tr-user-dropdown w-60 rounded-[24px] site-card p-1.5 text-foreground shadow-[0_24px_60px_hsl(0_0%_0%_/_0.38)]"
    >
      {profileMenuPrimaryItems.map((item) => (
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
  );

  return (
    <nav
      className={cn(
        "premium-header tr-header",
        isHomeRoute && "home-mobile-header",
        !isHomeRoute && "bg-[#020202]/92",
      )}
    >
      <div className="premium-header-shell tr-header-inner header-inner">
        <Link to="/" className="premium-header-brand tr-brand header-logo">
          <img
            src={logoGC}
            alt="Grupo de Campeoes FC26"
            className="h-[38px] w-[38px] object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.38)]"
          />

          <span className="premium-header-brand-copy tr-brand-text hidden sm:block">
            <span className="premium-header-brand-title site-title font-heading">
              Grupo de Campeoes
            </span>
            <span className="premium-header-brand-subtitle tr-brand-subtitle site-subtitle">
              FC 26 • X1 UT
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
          {isMobileViewport ? (
            <div className="tr-header-actions header-actions tr-mobile-header-actions">
              <div ref={notificationWrapperRef} className="tr-notification-wrapper">
                <button
                  type="button"
                  className="tr-notification-btn gold-flash-hover gold-hover-scale"
                  aria-expanded={notificationsOpen}
                  aria-label={
                    unreadCount > 0
                      ? `Abrir notificacoes (${unreadCount} nao lidas)`
                      : "Abrir notificacoes"
                  }
                  onClick={() => setNotificationsOpen((current) => !current)}
                >
                  <Bell className="h-[20px] w-[20px]" />
                  {unreadCount > 0 ? (
                    <span className="tr-notification-badge">{unreadCount}</span>
                  ) : null}
                </button>

                {renderNotificationsPanel()}
              </div>

              <AppRefreshButton
                iconOnly
                className="gold-flash-hover gold-hover-scale tr-notification-btn"
              />

              {isPlayerAuthenticated ? (
                <DropdownMenu open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      ref={profileTriggerRef}
                      type="button"
                      className="premium-header-profile tr-user-menu profile-menu user-dropdown-trigger gold-flash-hover gold-hover-scale tr-mobile-profile-btn"
                      aria-label="Abrir menu do perfil"
                    >
                      <PlayerAvatar
                        name={playerDisplayName || "Jogador"}
                        avatarUrl={resolvedPlayerAvatarUrl}
                        size="sm"
                        className="h-10 w-10 border-primary/40"
                      />
                    </button>
                  </DropdownMenuTrigger>

                  {renderProfileMenuContent()}
                </DropdownMenu>
              ) : (
                <Link
                  to={loginRoute.path}
                  className="premium-header-profile tr-user-menu profile-menu user-dropdown-trigger gold-flash-hover gold-hover-scale tr-mobile-profile-btn"
                  aria-label={loginRoute.label}
                >
                  <PlayerAvatar
                    name={loginRoute.label}
                    size="sm"
                    className="h-10 w-10 border-primary/40"
                  />
                </Link>
              )}

              {!isHomeRoute ? (
                <button
                  type="button"
                  className="mobile-menu-btn gold-flash-hover gold-hover-scale"
                  aria-expanded={mobileMenuOpen}
                  aria-label="Abrir menu principal"
                  onClick={() => setMobileMenuOpen((current) => !current)}
                >
                  <Menu className="h-[22px] w-[22px]" />
                </button>
              ) : null}
            </div>
          ) : isPlayerAuthenticated ? (
            <div className="tr-header-actions header-actions">
              <AppRefreshButton className="hidden lg:inline-flex" />

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
                      ? `Abrir notificacoes (${unreadCount} nao lidas)`
                      : "Abrir notificacoes"
                  }
                  onClick={() => setNotificationsOpen((current) => !current)}
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {unreadCount > 0 ? (
                    <span className="tr-notification-badge">{unreadCount}</span>
                  ) : null}
                </button>

                {renderNotificationsPanel()}
              </div>

              <DropdownMenu open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    ref={profileTriggerRef}
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

                  {renderProfileMenuContent()}
              </DropdownMenu>
            </div>
          ) : (
            <>
              <AppRefreshButton className="hidden lg:inline-flex" />

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
        </div>
      </div>

      {isMobileViewport && mobileMenuOpen ? (
        <div className="mobile-menu-layer" onClick={() => setMobileMenuOpen(false)}>
          <div onClick={(event) => event.stopPropagation()}>
            <div className="mobile-menu-panel open">
              {isPlayerAuthenticated ? (
                <div className="mobile-menu-account-summary mobile-menu-entry">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar
                      name={playerDisplayName || "Jogador"}
                      avatarUrl={resolvedPlayerAvatarUrl}
                      size="sm"
                      className="h-12 w-12 border-primary/40"
                    />
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-semibold uppercase tracking-[0.08em] text-white">
                        {playerDisplayName || "Jogador"}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-primary/80">
                        Grupo de Campeoes
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn("mobile-menu-entry", isItemActive(item.path) && "active")}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </span>
                    <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                  </Link>
                ))}

                {isPlayerAuthenticated ? (
                  <button
                    type="button"
                    className="mobile-menu-entry mobile-menu-danger"
                    onClick={handlePlayerLogout}
                  >
                    <span className="flex items-center gap-3">
                      <LogOut className="h-5 w-5" />
                      Sair
                    </span>
                  </button>
                ) : (
                  <Link to={loginRoute.path} className="mobile-menu-entry">
                    <span className="flex items-center gap-3">
                      <LoginIcon className="h-5 w-5" />
                      {loginRoute.label}
                    </span>
                    <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
