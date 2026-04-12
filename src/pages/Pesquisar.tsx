import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  Compass,
  Crown,
  Search,
  ShieldCheck,
  Swords,
  Trophy,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useChampionships } from "@/contexts/ChampionshipContext";
import { champions } from "@/data/siteContent";
import { formatChampionshipDateRange, getFormatOption } from "@/lib/championships";
import type { ChampionshipPlatform, ChampionshipRecord, ChampionshipStatus } from "@/types/championship";

type DiscoveryView = "todos" | "campeonatos" | "rankings" | "arquivo" | "atalhos";
type StatusFilter = "todos" | ChampionshipStatus;

const discoveryViews: Array<{ key: DiscoveryView; label: string }> = [
  { key: "todos", label: "Tudo" },
  { key: "campeonatos", label: "Campeonatos" },
  { key: "rankings", label: "Rankings" },
  { key: "arquivo", label: "Historico" },
  { key: "atalhos", label: "Atalhos" },
];

const statusFilters: Array<{ key: StatusFilter; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "Inscricoes abertas", label: "Inscricoes abertas" },
  { key: "Em andamento", label: "Em andamento" },
  { key: "Em breve", label: "Em breve" },
  { key: "Finalizado", label: "Finalizados" },
];

const quickRoutes: Array<{
  title: string;
  helper: string;
  to: string;
  icon: LucideIcon;
}> = [
  {
    title: "Perfil do jogador",
    helper: "Central do acesso, historico e janelas do circuito.",
    to: "/perfil",
    icon: UserRound,
  },
  {
    title: "Ranking geral",
    helper: "Monitoramento da temporada e arquivo oficial.",
    to: "/ranking",
    icon: BarChart3,
  },
  {
    title: "Relampago X1",
    helper: "Copas curtas para entrar e resolver rapido.",
    to: "/relampago",
    icon: Zap,
  },
  {
    title: "Ajuda operacional",
    helper: "Suporte, regras e orientacoes do portal.",
    to: "/ajuda",
    icon: ShieldCheck,
  },
];

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function buildRankingMonitors(championships: ChampionshipRecord[]) {
  const registry = new Map<
    string,
    {
      name: string;
      championships: ChampionshipRecord[];
    }
  >();

  championships.forEach((championship) => {
    const key = championship.configuration.rankingName.trim() || "Circuito principal";
    const current = registry.get(key);

    if (current) {
      current.championships.push(championship);
      return;
    }

    registry.set(key, {
      name: key,
      championships: [championship],
    });
  });

  return Array.from(registry.values());
}

function DiscoveryMetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <article className="rounded-[26px] border border-white/8 bg-metallic-card p-5 shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]">
      <div className={`flex items-center gap-3 ${tone}`}>
        <Icon className="h-5 w-5" />
        <span className="text-xs uppercase tracking-[0.24em]">{label}</span>
      </div>
      <p className="mt-4 font-heading text-3xl font-black text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
    </article>
  );
}

function FilterChip({
  active,
  label,
  onClick,
  activeClassName,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  activeClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] transition-all ${
        active
          ? activeClassName
          : "border-white/10 bg-background/45 text-muted-foreground hover:border-electric/25 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function ChampionshipDiscoveryCard({
  item,
  index,
}: {
  item: ChampionshipRecord;
  index: number;
}) {
  const formatLabel = getFormatOption(item.configuration.format).label;
  const primaryActionLabel =
    item.status === "Inscricoes abertas" ? "Participar" : "Ver detalhes";

  return (
    <article
      className="rounded-[30px] border border-white/8 bg-metallic-card p-6 opacity-0 transition-all duration-300 animate-fade-in-up"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">
            {item.configuration.rankingName}
          </p>
          <h2 className="mt-2 font-heading text-2xl text-foreground">{item.name}</h2>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <p className="mt-4 text-sm leading-7 text-muted-foreground">{item.description}</p>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DiscoveryInfo label="Plataforma" value={item.configuration.platform} />
        <DiscoveryInfo label="Formato" value={formatLabel} />
        <DiscoveryInfo
          label="Calendario"
          value={formatChampionshipDateRange(item.startDate, item.endDate)}
        />
        <DiscoveryInfo label="Vagas" value={`${item.teamCount} jogadores`} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to={`/campeonatos/${item.id}${item.status === "Inscricoes abertas" ? "?acao=participar" : ""}`}
          className="rounded-full border-glow-gold px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-primary-foreground gradient-gold transition-all hover:-translate-y-0.5 hover:brightness-110"
        >
          {primaryActionLabel}
        </Link>
        <Link
          to={`/campeonatos/${item.id}`}
          className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-all hover:border-electric/30 hover:text-foreground"
        >
          Abrir campeonato
        </Link>
      </div>
    </article>
  );
}

function DiscoveryInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-background/55 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm text-foreground">{value}</p>
    </div>
  );
}

function RankingMonitorCard({
  name,
  count,
  openCount,
  liveCount,
  platformCount,
}: {
  name: string;
  count: number;
  openCount: number;
  liveCount: number;
  platformCount: number;
}) {
  return (
    <article className="rounded-[30px] border border-white/8 bg-metallic-card p-6 shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-electric">Monitor</p>
          <h2 className="mt-2 font-heading text-2xl text-foreground">{name}</h2>
        </div>
        <span className="rounded-full border border-electric/20 bg-electric/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-electric">
          {count} evento(s)
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <DiscoveryInfo label="Abertos" value={String(openCount)} />
        <DiscoveryInfo label="Ao vivo" value={String(liveCount)} />
        <DiscoveryInfo label="Plataformas" value={String(platformCount)} />
      </div>

      <div className="mt-6">
        <Link
          to="/ranking"
          className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-all hover:border-electric/30 hover:text-foreground"
        >
          Abrir ranking
        </Link>
      </div>
    </article>
  );
}

function QuickRouteCard({
  title,
  helper,
  to,
  icon: Icon,
}: {
  title: string;
  helper: string;
  to: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      to={to}
      className="rounded-[28px] border border-white/8 bg-metallic-card p-5 transition-all hover:-translate-y-0.5 hover:border-electric/30"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{helper}</p>
        </div>
      </div>
    </Link>
  );
}

export default function Pesquisar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { championships } = useChampionships();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [activeView, setActiveView] = useState<DiscoveryView>("todos");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [platformFilter, setPlatformFilter] = useState<"Todas" | ChampionshipPlatform>("Todas");
  const deferredQuery = useDeferredValue(query);
  const searchTerm = normalize(deferredQuery);

  const platformFilters: Array<"Todas" | ChampionshipPlatform> = useMemo(
    () => [
      "Todas",
      ...Array.from(new Set(championships.map((item) => item.configuration.platform))),
    ],
    [championships],
  );

  const rankingMonitors = useMemo(() => buildRankingMonitors(championships), [championships]);
  const openChampionships = championships.filter((item) => item.status === "Inscricoes abertas");
  const liveChampionships = championships.filter((item) => item.status === "Em andamento");
  const highlightChampionship =
    openChampionships[0] ?? liveChampionships[0] ?? championships[0] ?? null;

  const filteredChampionships = championships.filter((item) => {
    const matchesView = activeView === "todos" || activeView === "campeonatos";
    const matchesStatus = statusFilter === "todos" ? true : item.status === statusFilter;
    const matchesPlatform =
      platformFilter === "Todas" ? true : item.configuration.platform === platformFilter;
    const matchesSearch =
      searchTerm.length === 0
        ? true
        : [
            item.name,
            item.description,
            item.configuration.rankingName,
            item.configuration.platform,
            getFormatOption(item.configuration.format).label,
          ]
            .join(" ")
            .toLocaleLowerCase("pt-BR")
            .includes(searchTerm);

    return matchesView && matchesStatus && matchesPlatform && matchesSearch;
  });

  const filteredMonitors = rankingMonitors.filter((monitor) => {
    const matchesView = activeView === "todos" || activeView === "rankings";
    const matchesSearch =
      searchTerm.length === 0
        ? true
        : [
            monitor.name,
            ...monitor.championships.map((championship) => championship.name),
          ]
            .join(" ")
            .toLocaleLowerCase("pt-BR")
            .includes(searchTerm);

    return matchesView && matchesSearch;
  });

  const filteredChampions = champions.filter((item) => {
    const matchesView = activeView === "todos" || activeView === "arquivo";
    const matchesSearch =
      searchTerm.length === 0
        ? true
        : `${item.name} ${item.titles} ${item.rank}`
            .toLocaleLowerCase("pt-BR")
            .includes(searchTerm);

    return matchesView && matchesSearch;
  });

  const filteredRoutes = quickRoutes.filter((item) => {
    const matchesView = activeView === "todos" || activeView === "atalhos";
    const matchesSearch =
      searchTerm.length === 0
        ? true
        : `${item.title} ${item.helper}`.toLocaleLowerCase("pt-BR").includes(searchTerm);

    return matchesView && matchesSearch;
  });

  const totalResults =
    filteredChampionships.length +
    filteredMonitors.length +
    filteredChampions.length +
    filteredRoutes.length;

  return (
    <PageShell>
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <PageHeader
              icon={Compass}
              title="EXPLORAR O CIRCUITO"
              description="Descubra campeonatos, rankings, historico e atalhos do portal em uma leitura publica mais clara e mais direta."
            />

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DiscoveryMetricCard
                label="Eventos publicados"
                value={championships.length}
                helper="Catalogo oficial visivel no portal"
                icon={Trophy}
                tone="text-primary"
              />
              <DiscoveryMetricCard
                label="Inscricoes abertas"
                value={openChampionships.length}
                helper="Portas de entrada do circuito"
                icon={ShieldCheck}
                tone="text-primary"
              />
              <DiscoveryMetricCard
                label="Ao vivo"
                value={liveChampionships.length}
                helper="Campeonatos em disputa agora"
                icon={Swords}
                tone="text-electric"
              />
              <DiscoveryMetricCard
                label="Arquivo historico"
                value={champions.length}
                helper="Registros ativos no hall"
                icon={Crown}
                tone="text-electric"
              />
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
              <section className="rounded-[30px] border border-white/8 bg-metallic-card p-6 shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]">
                <label
                  htmlFor="global-search"
                  className="mb-3 block text-xs uppercase tracking-[0.24em] text-primary"
                >
                  Busca global
                </label>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/75 px-4 py-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input
                      id="global-search"
                      type="search"
                      value={query}
                      onChange={(event) => {
                        const nextValue = event.target.value;

                        startTransition(() => {
                          setQuery(nextValue);

                          const nextParams = new URLSearchParams(searchParams);

                          if (nextValue.trim()) {
                            nextParams.set("q", nextValue);
                          } else {
                            nextParams.delete("q");
                          }

                          setSearchParams(nextParams, { replace: true });
                        });
                      }}
                      placeholder="Buscar campeonato, ranking, hall ou atalho"
                      className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>

                  <div>
                    <p className="mb-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      Recorte
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {discoveryViews.map((view) => (
                        <FilterChip
                          key={view.key}
                          active={activeView === view.key}
                          label={view.label}
                          onClick={() => setActiveView(view.key)}
                          activeClassName="border-primary/35 bg-primary/10 text-primary"
                        />
                      ))}
                    </div>
                  </div>

                  {(activeView === "todos" || activeView === "campeonatos") && (
                    <>
                      <div>
                        <p className="mb-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                          Status
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {statusFilters.map((filter) => (
                            <FilterChip
                              key={filter.key}
                              active={statusFilter === filter.key}
                              label={filter.label}
                              onClick={() => setStatusFilter(filter.key)}
                              activeClassName="border-electric/35 bg-electric/10 text-electric"
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                          Plataforma
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {platformFilters.map((platform) => (
                            <FilterChip
                              key={platform}
                              active={platformFilter === platform}
                              label={platform}
                              onClick={() => setPlatformFilter(platform)}
                              activeClassName="border-primary/35 bg-primary/10 text-primary"
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>

              <aside className="space-y-6">
                <section className="rounded-[30px] border border-white/8 bg-metallic-card p-6 shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]">
                  <p className="text-xs uppercase tracking-[0.24em] text-primary">
                    Leitura rapida
                  </p>
                  <div className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">
                    <p>1. Use os filtros para reduzir o circuito para o seu recorte.</p>
                    <p>2. Quando a inscricao estiver aberta, va direto em participar.</p>
                    <p>3. Use ranking e perfil para acompanhar campanha e historico.</p>
                  </div>
                </section>

                {highlightChampionship ? (
                  <section className="rounded-[30px] border border-primary/18 bg-card/75 p-6 shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]">
                    <p className="text-xs uppercase tracking-[0.24em] text-primary">
                      Destaque atual
                    </p>
                    <h2 className="mt-3 font-heading text-2xl text-foreground">
                      {highlightChampionship.name}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {highlightChampionship.description}
                    </p>
                    <div className="mt-4">
                      <StatusBadge status={highlightChampionship.status} />
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        to={`/campeonatos/${highlightChampionship.id}${highlightChampionship.status === "Inscricoes abertas" ? "?acao=participar" : ""}`}
                        className="rounded-full border-glow-gold px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-primary-foreground gradient-gold transition-all hover:-translate-y-0.5 hover:brightness-110"
                      >
                        {highlightChampionship.status === "Inscricoes abertas"
                          ? "Participar agora"
                          : "Abrir campeonato"}
                      </Link>
                    </div>
                  </section>
                ) : null}
              </aside>
            </div>

            {totalResults === 0 ? (
              <EmptyStateCard
                icon={Compass}
                title="Nenhum resultado encontrado"
                description="A combinacao atual de busca e filtros nao trouxe itens do circuito. Ajuste o recorte e tente novamente."
                actionLabel="Limpar filtros"
                actionTo="/explorar"
                className="mx-auto mt-10 max-w-3xl"
              />
            ) : (
              <div className="mt-10 space-y-10">
                {filteredChampionships.length > 0 ? (
                  <section className="space-y-5">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-primary">
                          Campeonatos
                        </p>
                        <h2 className="mt-2 font-heading text-3xl text-foreground">
                          Descoberta de torneios
                        </h2>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {filteredChampionships.length} campeonato(s) no recorte atual.
                      </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      {filteredChampionships.map((item, index) => (
                        <ChampionshipDiscoveryCard key={item.id} item={item} index={index} />
                      ))}
                    </div>
                  </section>
                ) : null}

                {filteredMonitors.length > 0 ? (
                  <section className="space-y-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-electric">
                        Rankings
                      </p>
                      <h2 className="mt-2 font-heading text-3xl text-foreground">
                        Monitores do circuito
                      </h2>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      {filteredMonitors.map((monitor) => (
                        <RankingMonitorCard
                          key={monitor.name}
                          name={monitor.name}
                          count={monitor.championships.length}
                          openCount={
                            monitor.championships.filter(
                              (item) => item.status === "Inscricoes abertas",
                            ).length
                          }
                          liveCount={
                            monitor.championships.filter(
                              (item) => item.status === "Em andamento",
                            ).length
                          }
                          platformCount={
                            new Set(
                              monitor.championships.map((item) => item.configuration.platform),
                            ).size
                          }
                        />
                      ))}
                    </div>
                  </section>
                ) : null}

                {filteredChampions.length > 0 ? (
                  <section className="space-y-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-primary">
                        Arquivo oficial
                      </p>
                      <h2 className="mt-2 font-heading text-3xl text-foreground">
                        Hall historico
                      </h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {filteredChampions.map((champion) => (
                        <article
                          key={champion.name}
                          className="rounded-[28px] border border-white/8 bg-metallic-card p-5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {champion.name}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                {champion.titles} titulo(s)
                              </p>
                            </div>
                            <span className="font-heading text-xl font-black text-primary">
                              #{champion.rank}
                            </span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}

                {filteredRoutes.length > 0 ? (
                  <section className="space-y-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-electric">
                        Atalhos
                      </p>
                      <h2 className="mt-2 font-heading text-3xl text-foreground">
                        Entradas rapidas do portal
                      </h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {filteredRoutes.map((item) => (
                        <QuickRouteCard key={item.title} {...item} />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
