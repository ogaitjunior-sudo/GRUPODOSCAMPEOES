import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChart3, House, Search, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { loginRoute } from "@/navigation";

const mobileBottomNavItems = [
  { label: "Inicio", path: "/", icon: House, matchPaths: ["/"] },
  { label: "Campeonatos", path: "/campeonatos", icon: Trophy },
  { label: "Ranking", path: "/ranking", icon: BarChart3 },
  { label: "Explorar", path: "/explorar", icon: Search, matchPaths: ["/explorar", "/pesquisar"] },
  { label: "Perfil", path: "/perfil", icon: User },
] as const;

function isItemActive(currentPathname: string, path: string) {
  return path === "/" ? currentPathname === path : currentPathname.startsWith(path);
}

export function MobileBottomNav() {
  const location = useLocation();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const isHiddenRoute =
    location.pathname.startsWith("/admin") ||
    [
      loginRoute.path,
      "/criar-conta",
      "/recuperar-senha",
      "/acesso-implantacao",
    ].includes(location.pathname);

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

  if (!isMobileViewport || isHiddenRoute) {
    return null;
  }

  return (
    <nav className="mobile-bottom-nav bottom-nav" aria-label="Navegacao inferior mobile">
      {mobileBottomNavItems.map((item) => {
        const isActive = (item.matchPaths ?? [item.path]).some((path) =>
          isItemActive(location.pathname, path),
        );

        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn("bottom-nav-item", isActive && "active")}
          >
            <item.icon className="h-[18px] w-[18px]" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
