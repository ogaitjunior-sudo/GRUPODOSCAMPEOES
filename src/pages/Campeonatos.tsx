import { useDeferredValue, useState } from "react";
import { Filter, Search, ShieldCheck, Swords, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useChampionships } from "@/contexts/ChampionshipContext";
import { formatChampionshipDateRange, getFormatOption } from "@/lib/championships";
import type { ChampionshipPlatform, ChampionshipRecord, ChampionshipStatus } from "@/types/championship";

type StatusFilter = "todos" | ChampionshipStatus;

const statusFilters: Array<{ key: StatusFilter; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "Inscricoes abertas", label: "Inscricoes abertas" },
  { key: "Em andamento", label: "Em andamento" },
  { key: "Em breve", label: "Em breve" },
  { key: "Finalizado", label: "Finalizados" },
];

function getRegistrationLabel(item: ChampionshipRecord) {
  return item.configuration.registrationMode === "public" ? "Entrada publica" : "Entrada privada";
}

function getReportLabel(item: ChampionshipRecord) {
  return item.configuration.resultsReportedBy === "players"
    ? "Resultado por jogadores"
    : "Resultado centralizado";
}

function getPrimaryActionLabel(item: ChampionshipRecord) {
  if (item.status === "Inscricoes abertas") {
    return "Participar";
  }

  if (item.status === "Em andamento") {
    return "Acompanhar";
  }

  return "Ver detalhes";
}

function formatChampionshipCount(value: number) {
  return `${value} campeonato${value === 1 ? "" : "s"}`;
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-background/55 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm text-foreground">{value}</p>
    </div>
  );
}

const Campeonatos = () => {
  const { championships, isLoading, storageMode, syncError } = useChampionships();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [platformFilter, setPlatformFilter] = useState<"Todas" | ChampionshipPlatform>("Todas");
  const deferredSearch = useDeferredValue(searchTerm);
  const hasChampionships = championships.length > 0;

  const platformFilters: Array<"Todas" | ChampionshipPlatform> = [
    "Todas",
    ...Array.from(new Set(championships.map((item) => item.configuration.platform))),
  ];

  const normalizedSearch = deferredSearch.trim().toLocaleLowerCase("pt-BR");
  const filteredChampionships = championships.filter((championship) => {
    const matchesStatus =
      statusFilter === "todos" ? true : championship.status === statusFilter;
    const matchesPlatform =
      platformFilter === "Todas"
        ? true
        : championship.configuration.platform === platformFilter;
    const matchesSearch =
      normalizedSearch.length === 0
        ? true
        : [
            championship.name,
            championship.description,
            championship.configuration.rankingName,
            championship.configuration.platform,
          ]
            .join(" ")
            .toLocaleLowerCase("pt-BR")
            .includes(normalizedSearch);

    return matchesStatus && matchesPlatform && matchesSearch;
  });

  const openCount = championships.filter((item) => item.status === "Inscricoes abertas").length;
  const liveCount = championships.filter((item) => item.status === "Em andamento").length;
  const upcomingCount = championships.filter((item) => item.status === "Em breve").length;
  const totalSlots = championships.reduce((total, item) => total + item.teamCount, 0);

  return (
    <PageShell>
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <PageHeader
              icon={Trophy}
              title="CATALOGO DE CAMPEONATOS"
              description="Leitura publica mais utilitaria para encontrar competicoes X1 UT por status, plataforma, ranking e janela de inscricao."
            />

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Publicados",
                  value: championships.length,
                  helper: "Eventos visiveis no circuito",
                  icon: Trophy,
                  tone: "text-primary",
                },
                {
                  label: "Inscricoes abertas",
                  value: openCount,
                  helper: "Prontos para entrada",
                  icon: ShieldCheck,
                  tone: "text-primary",
                },
                {
                  label: "Em disputa",
                  value: liveCount,
                  helper: "Rodadas acontecendo",
                  icon: Swords,
                  tone: "text-electric",
                },
                {
                  label: "Vagas previstas",
                  value: totalSlots,
                  helper: "Capacidade total publicada",
                  icon: Users,
                  tone: "text-electric",
                },
              ].map((item) => (
                <article
                  key={item.label}
                  className="rounded-[26px] border border-white/8 bg-metallic-card p-5 shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]"
                >
                  <div className={`flex items-center gap-3 ${item.tone}`}>
                    <item.icon className="h-5 w-5" />
                    <span className="text-xs uppercase tracking-[0.24em]">{item.label}</span>
                  </div>
                  <p className="mt-4 font-heading text-3xl font-black text-foreground">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.helper}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="rounded-[30px] border border-white/8 bg-metallic-card p-6 shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]">
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-3 text-primary">
                    <Filter className="h-5 w-5" />
                    <p className="font-heading text-xs uppercase tracking-[0.28em]">
                      Filtros do catalogo
                    </p>
                  </div>

                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Buscar por campeonato, ranking ou plataforma"
                      aria-label="Buscar campeonatos"
                      className="h-12 w-full rounded-2xl border border-border bg-background/70 pl-11 pr-4 text-sm text-foreground outline-none transition-colors focus:border-primary/40"
                    />
                  </label>

                  <div>
                    <p className="mb-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      Status
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {statusFilters.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setStatusFilter(item.key)}
                          className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] transition-all ${
                            statusFilter === item.key
                              ? "border-primary/35 bg-primary/10 text-primary"
                              : "border-white/10 bg-background/45 text-muted-foreground hover:border-electric/25 hover:text-foreground"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      Plataforma
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {platformFilters.map((platform) => (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => setPlatformFilter(platform)}
                          className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] transition-all ${
                            platformFilter === platform
                              ? "border-electric/35 bg-electric/10 text-electric"
                              : "border-white/10 bg-background/45 text-muted-foreground hover:border-primary/25 hover:text-foreground"
                          }`}
                        >
                          {platform}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <aside className="space-y-6">
                <section className="rounded-[30px] border border-white/8 bg-metallic-card p-6 shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]">
                  <p className="text-xs uppercase tracking-[0.24em] text-primary">Leitura rapida</p>
                  <div className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">
                    <p>1. Use os filtros para reduzir o calendario para o seu recorte.</p>
                    <p>2. Abra o detalhe para ver grupos, bracket, regras e andamento.</p>
                    <p>3. Ranking e Perfil acompanham o mesmo circuito publico.</p>
                  </div>
                </section>

                <section className="rounded-[30px] border border-white/8 bg-card/70 p-6 shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    Areas secundarias
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      to="/campeoes"
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-all hover:border-electric/30 hover:text-foreground"
                    >
                      Campeoes
                    </Link>
                    <Link
                      to="/ligas"
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-all hover:border-electric/30 hover:text-foreground"
                    >
                      Ligas
                    </Link>
                  </div>
                </section>
              </aside>
            </div>

            {storageMode === "supabase" && syncError ? (
              <EmptyStateCard
                icon={Trophy}
                title="Falha ao consultar o Supabase"
                description={syncError}
                actionLabel="Reabrir o catalogo"
                actionTo="/campeonatos"
                className="mx-auto mt-10 max-w-3xl"
              />
            ) : isLoading ? (
              <EmptyStateCard
                icon={Trophy}
                title="Carregando campeonatos"
                description="Sincronizando a vitrine publica do circuito X1 UT."
                className="mx-auto mt-10 max-w-3xl"
              />
            ) : hasChampionships ? (
              filteredChampionships.length > 0 ? (
                <>
                  <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      {formatChampionshipCount(filteredChampionships.length)} no recorte atual.
                    </p>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {formatChampionshipCount(openCount)} abertos, {formatChampionshipCount(liveCount)} ao vivo e {formatChampionshipCount(upcomingCount)} em breve
                    </p>
                  </div>

                  <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    {filteredChampionships.map((championship, index) => {
                      const formatLabel = getFormatOption(championship.configuration.format).label;

                      return (
                        <article
                          key={championship.id}
                          className="rounded-[30px] border border-white/8 bg-metallic-card p-6 opacity-0 transition-all duration-300 animate-fade-in-up hover:-translate-y-1 hover:border-electric/30"
                          style={{ animationDelay: `${index * 0.06}s` }}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.22em] text-primary">
                                {championship.configuration.rankingName}
                              </p>
                              <Link to={`/campeonatos/${championship.id}`}>
                                <h2 className="mt-2 font-heading text-2xl font-bold text-foreground transition-colors hover:text-primary">
                                  {championship.name}
                                </h2>
                              </Link>
                            </div>
                            <StatusBadge status={championship.status} />
                          </div>

                          <p className="mt-4 text-sm leading-7 text-muted-foreground">
                            {championship.description}
                          </p>

                          <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <InfoChip label="Plataforma" value={championship.configuration.platform} />
                            <InfoChip label="Formato" value={formatLabel} />
                            <InfoChip
                              label="Calendario"
                              value={formatChampionshipDateRange(championship.startDate, championship.endDate)}
                            />
                            <InfoChip label="Vagas" value={`${championship.teamCount} jogadores`} />
                          </div>

                          <div className="mt-6 flex flex-wrap gap-3">
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-primary">
                              {getRegistrationLabel(championship)}
                            </span>
                            <span className="rounded-full border border-electric/20 bg-electric/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-electric">
                              {getReportLabel(championship)}
                            </span>
                          </div>

                          <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                              to={`/campeonatos/${championship.id}${championship.status === "Inscricoes abertas" ? "?acao=participar" : ""}`}
                              className="rounded-full border-glow-gold px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-primary-foreground gradient-gold transition-all hover:-translate-y-0.5 hover:brightness-110"
                            >
                              {getPrimaryActionLabel(championship)}
                            </Link>
                            <Link
                              to={`/campeonatos/${championship.id}`}
                              className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-all hover:border-electric/30 hover:text-foreground"
                            >
                              Abrir campeonato
                            </Link>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="mt-10 rounded-[30px] border border-white/8 bg-metallic-card p-8 text-center shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]">
                  <p className="font-heading text-xs uppercase tracking-[0.28em] text-primary">
                    Nenhum resultado no recorte
                  </p>
                  <h2 className="mt-3 font-heading text-2xl text-foreground">
                    Ajuste a busca ou os filtros
                  </h2>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                    O catalogo tem eventos publicados, mas nenhum bateu com a combinacao atual de
                    busca, status e plataforma.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("todos");
                      setPlatformFilter("Todas");
                    }}
                    className="mt-6 rounded-full border border-primary/30 px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-primary transition-all hover:bg-primary/10"
                  >
                    Limpar filtros
                  </button>
                </div>
              )
            ) : (
              <EmptyStateCard
                icon={Trophy}
                title="Nenhum campeonato publicado ainda"
                description="Quando o proximo torneio X1 UT entrar no ar, ele aparecera aqui com plataforma, formato, ranking vinculado e status."
                className="mx-auto mt-10 max-w-3xl"
              />
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
};

export default Campeonatos;
