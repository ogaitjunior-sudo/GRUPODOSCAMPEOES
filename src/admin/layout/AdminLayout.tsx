import { LogOut, Menu, Search, ShieldCheck, Trophy, Users, Wrench } from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import logoGC from "@/assets/logo-gc-fc26.png";
import { adminRoleLabels } from "@/admin/config/security";
import { adminNavigation } from "@/admin/config/navigation";
import { AdminStatusBadge } from "@/admin/components/AdminStatusBadge";
import { useAdminPanel } from "@/admin/context/AdminPanelContext";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function matchesAdminItem(pathname: string, path: string, matchPaths?: string[]) {
  const paths = matchPaths && matchPaths.length > 0 ? matchPaths : [path];

  return paths.some((item) =>
    item === "/admin" ? pathname === "/admin" : pathname === item || pathname.startsWith(`${item}/`),
  );
}

type AdminSearchScope = "campeonatos" | "jogadores" | "configuracoes";

function buildAdminSearchPath(scope: AdminSearchScope, query: string) {
  const trimmedQuery = query.trim();
  const basePath =
    scope === "campeonatos"
      ? "/admin/campeonatos"
      : scope === "jogadores"
        ? "/admin/jogadores"
        : "/admin/configuracoes";

  if (!trimmedQuery) {
    return basePath;
  }

  const params = new URLSearchParams({ q: trimmedQuery });
  return `${basePath}?${params.toString()}`;
}

function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { state } = useAdminPanel();
  const { hasPermission } = useAdminAuth();

  const summaryCards = [
    {
      label: "Campeonatos",
      value: state.championships.length,
      icon: Trophy,
    },
    {
      label: "Jogadores",
      value: state.players.length,
      icon: Users,
    },
    {
      label: "Pendencias",
      value:
        state.players.filter((item) => item.status !== "approved").length +
        state.tickets.filter((item) => item.status !== "resolved").length,
      icon: Wrench,
    },
  ];

  return (
    <div className="flex h-full flex-col panel-premium">
      <div className="border-b border-white/8 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-primary/20 bg-black/30">
            <img src={logoGC} alt="Grupo de Campeoes" className="h-10 w-10 object-contain" />
          </span>
          <div>
            <p className="font-heading text-[11px] uppercase tracking-[0.34em] text-primary">
              Painel do ADM
            </p>
            <h2 className="mt-2 font-heading text-2xl font-black text-white">GC Administracao</h2>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Centro administrativo com foco em campeonatos, jogadores e controle operacional.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 border-b border-white/8 px-4 py-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-[20px] border border-white/8 bg-black/20 p-3">
            <card.icon className="h-4 w-4 text-primary" />
            <p className="mt-3 font-heading text-2xl text-white">{card.value}</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-2">
          {adminNavigation
            .filter((item) => item.permissions.some((permission) => hasPermission(permission)))
            .map((item) => {
              const active = matchesAdminItem(location.pathname, item.path, item.matchPaths);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-start gap-3 rounded-[24px] px-4 py-3 transition-all",
                    active
                      ? "panel-premium-soft text-primary shadow-[0_0_0_1px_hsl(51_100%_50%_/_0.18)]"
                      : "text-muted-foreground hover:bg-white/5 hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border",
                      active
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-white/10 bg-white/5 text-electric",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </NavLink>
              );
            })}
        </nav>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { displayName, logout, role } = useAdminAuth();
  const { state, isLoading, storageMode, syncError } = useAdminPanel();
  const currentSection =
    adminNavigation.find((item) => matchesAdminItem(location.pathname, item.path, item.matchPaths)) ??
    adminNavigation[0];
  const [searchScope, setSearchScope] = useState<AdminSearchScope>("campeonatos");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (location.pathname.startsWith("/admin/jogadores") || location.pathname.startsWith("/admin/perfis")) {
      setSearchScope("jogadores");
      return;
    }

    if (
      location.pathname.startsWith("/admin/configuracoes") ||
      location.pathname.startsWith("/admin/sistema") ||
      location.pathname.startsWith("/admin/suporte") ||
      location.pathname.startsWith("/admin/logs") ||
      location.pathname.startsWith("/admin/idiomas")
    ) {
      setSearchScope("configuracoes");
      return;
    }

    setSearchScope("campeonatos");
  }, [location.pathname]);

  const platformTone =
    state.settings.platformStatus === "healthy"
      ? "success"
      : state.settings.platformStatus === "attention"
        ? "warning"
        : "danger";

  const platformLabel =
    state.settings.platformStatus === "healthy"
      ? "Plataforma saudavel"
      : state.settings.platformStatus === "attention"
        ? "Atencao operacional"
        : "Manutencao";

  const quickLinks = [
    { label: "Criar campeonato", to: "/admin/campeonatos/novo" },
    { label: "Jogadores", to: "/admin/jogadores" },
    { label: "Configuracoes", to: "/admin/configuracoes" },
    { label: "Suporte", to: "/admin/suporte" },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(51_100%_50%_/_0.12),transparent_24%),radial-gradient(circle_at_90%_10%,hsl(195_100%_50%_/_0.12),transparent_20%),linear-gradient(180deg,hsl(0_0%_6%),hsl(0_0%_4%))] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-[320px] shrink-0 border-r border-white/8 xl:block">
          <AdminSidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-white/8 bg-background/72 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6">
              <div className="flex items-center gap-3">
                <Sheet>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl panel-premium-soft text-white xl:hidden"
                    >
                      <Menu className="h-5 w-5" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[320px] border-white/8 bg-background p-0">
                    <AdminSidebar />
                  </SheetContent>
                </Sheet>

                <div>
                  <p className="font-heading text-[11px] uppercase tracking-[0.26em] text-primary">
                    Area administrativa
                  </p>
                  <h1 className="mt-2 font-heading text-xl font-bold text-white">
                    {currentSection.label}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <AdminStatusBadge label={platformLabel} tone={platformTone} />

                <div className="hidden rounded-[24px] panel-premium-soft px-4 py-3 md:block">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {role === "usuario" ? "Usuario" : adminRoleLabels[role]}
                  </p>
                  <p className="mt-1 font-semibold text-white">{displayName ?? "Admin"}</p>
                </div>

                <Link
                  to="/"
                  className="hidden rounded-full panel-premium-soft px-4 py-3 text-sm text-muted-foreground transition hover:bg-white/10 hover:text-white lg:inline-flex"
                >
                  Ver site
                </Link>

                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-2 rounded-full panel-premium-soft px-4 py-3 text-sm text-muted-foreground transition hover:bg-white/10 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-6">
            <div className="mb-6 rounded-[28px] panel-premium-soft px-4 py-4">
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-primary/20 bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.22em] text-primary">Centro administrativo</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Navegue por campeonatos, jogadores e configuracoes com menos ruido e mais controle.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {quickLinks.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.16em] text-muted-foreground transition hover:border-primary/30 hover:text-white"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    navigate(buildAdminSearchPath(searchScope, searchQuery));
                  }}
                  className="rounded-[24px] border border-white/8 bg-black/20 p-4"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Busca rapida</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Encontre campeonatos, jogadores ou parametros sem navegar por varias telas.
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto]">
                    <select
                      value={searchScope}
                      onChange={(event) => setSearchScope(event.target.value as AdminSearchScope)}
                      className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                    >
                      <option value="campeonatos">Campeonatos</option>
                      <option value="jogadores">Jogadores</option>
                      <option value="configuracoes">Configuracoes</option>
                    </select>
                    <div className="flex items-center rounded-xl border border-white/10 bg-white/5 px-4">
                      <Search className="mr-3 h-4 w-4 text-muted-foreground" />
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Buscar por nome, e-mail, status ou campeonato"
                        className="h-11 w-full bg-transparent text-sm text-white outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                    >
                      Buscar
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {syncError ? (
              <div className="mb-6 rounded-[24px] border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-200">
                {syncError}
              </div>
            ) : (
              <div className="mb-6 rounded-[24px] border border-white/8 bg-black/20 px-4 py-4 text-sm text-muted-foreground">
                {isLoading
                  ? "Sincronizando o painel com a base ativa..."
                  : storageMode === "supabase"
                    ? "Painel administrativo sincronizado com o Supabase."
                    : "Painel administrativo rodando em modo local porque o Supabase nao esta configurado."}
              </div>
            )}

            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
