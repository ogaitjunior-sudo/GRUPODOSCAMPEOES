import { useState } from "react";
import { BarChart3, Crown, ShieldCheck, Swords, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useChampionships } from "@/contexts/ChampionshipContext";
import { champions } from "@/data/siteContent";
import {
  formatChampionshipAvailableSlots,
  formatChampionshipDateRange,
} from "@/lib/championships";
import type { ChampionshipRecord } from "@/types/championship";

type RankingView = "temporada" | "titulos" | "monitoramento";

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

function SeasonInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-background/55 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm text-foreground">{value}</p>
    </div>
  );
}

const Ranking = () => {
  const [activeView, setActiveView] = useState<RankingView>("temporada");
  const { championships } = useChampionships();
  const monitors = buildRankingMonitors(championships);
  const openCount = championships.filter((item) => item.status === "REGISTRATION").length;
  const liveCount = championships.filter((item) => item.status === "STARTED").length;
  const finalCount = championships.filter((item) => item.status === "FINISHED").length;
  const totalTitles = champions.reduce((sum, player) => sum + player.titles, 0);
  const topThree = champions.slice(0, 3);

  return (
    <PageShell>
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <PageHeader
              icon={BarChart3}
              title="RANKING DO CIRCUITO"
              description="Pagina mais operacional para monitorar a temporada, o historico por titulos e os rankings abastecidos pelo calendario publico."
            />

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Campeonatos monitorados",
                  value: championships.length,
                  helper: "Eventos que podem alimentar o ranking",
                  icon: Trophy,
                  tone: "text-primary",
                },
                {
                  label: "Inscricoes abertas",
                  value: openCount,
                  helper: "Portas de entrada da temporada",
                  icon: ShieldCheck,
                  tone: "text-primary",
                },
                {
                  label: "Em disputa",
                  value: liveCount,
                  helper: "Eventos ja acontecendo",
                  icon: Swords,
                  tone: "text-electric",
                },
                {
                  label: "Titulos oficiais",
                  value: totalTitles,
                  helper: "Arquivo historico visivel no portal",
                  icon: Crown,
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

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {[
                { key: "temporada", label: "Temporada" },
                { key: "titulos", label: "Por titulos" },
                { key: "monitoramento", label: "Monitoramento" },
              ].map((view) => (
                <button
                  key={view.key}
                  type="button"
                  onClick={() => setActiveView(view.key as RankingView)}
                  className={`rounded-full border px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition-all ${
                    activeView === view.key
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "border-white/10 bg-background/50 text-muted-foreground hover:border-electric/25 hover:text-foreground"
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>

            {activeView === "temporada" && (
              <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <section className="rounded-[30px] border border-white/8 bg-metallic-card p-6 shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-primary">
                        Radar da temporada
                      </p>
                      <h2 className="mt-2 font-heading text-3xl text-foreground">
                        O que esta alimentando o ranking agora
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {championships.length} campeonato(s) visiveis no circuito.
                    </p>
                  </div>

                  {championships.length > 0 ? (
                    <div className="mt-8 space-y-4">
                      {championships.map((championship) => (
                        <Link
                          key={championship.id}
                          to={`/campeonatos/${championship.id}`}
                          className="block rounded-[24px] border border-white/8 bg-background/55 p-5 transition-all hover:-translate-y-0.5 hover:border-electric/30"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-primary">
                                {championship.configuration.rankingName}
                              </p>
                              <h3 className="mt-2 font-heading text-xl text-foreground">
                                {championship.name}
                              </h3>
                            </div>
                            <StatusBadge status={championship.status} />
                          </div>
                          <div className="mt-5 grid gap-3 md:grid-cols-3">
                            <SeasonInfoCard
                              label="Plataforma"
                              value={championship.configuration.platform}
                            />
                            <SeasonInfoCard
                              label="Calendario"
                              value={formatChampionshipDateRange(
                                championship.startDate,
                                championship.endDate,
                              )}
                            />
                            <SeasonInfoCard
                              label="Vagas disponiveis"
                              value={formatChampionshipAvailableSlots(championship)}
                            />
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <EmptyStateCard
                      icon={BarChart3}
                      title="Temporada sem competicoes publicadas"
                      description="Quando os primeiros campeonatos entrarem no ar, esta aba mostra o que esta puxando o ranking do circuito."
                      className="mx-auto mt-8 max-w-3xl"
                    />
                  )}
                </section>

                <aside className="space-y-6">
                  <section className="rounded-[30px] border border-white/8 bg-metallic-card p-6 shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]">
                    <p className="text-xs uppercase tracking-[0.24em] text-primary">
                      Leitura rapida
                    </p>
                    <div className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">
                      <p>{openCount} competicao(oes) estao abertas agora.</p>
                      <p>{liveCount} competicao(oes) ja estao em andamento.</p>
                      <p>{finalCount} competicao(oes) ja foram encerradas.</p>
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
            )}

            {activeView === "titulos" && (
              <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <section className="rounded-[30px] border border-white/8 bg-metallic-card p-6 shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]">
                  <p className="text-xs uppercase tracking-[0.24em] text-primary">
                    Historico por titulos
                  </p>
                  <h2 className="mt-2 font-heading text-3xl text-foreground">
                    Hall historico do circuito
                  </h2>

                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    {topThree.map((player, index) => (
                      <article
                        key={player.name}
                        className={`rounded-[24px] border p-5 ${
                          index === 0
                            ? "border-primary/30 bg-primary/10"
                            : "border-white/8 bg-background/55"
                        }`}
                      >
                        <p className="text-xs uppercase tracking-[0.22em] text-primary">
                          Posicao #{player.rank}
                        </p>
                        <h3 className="mt-3 font-heading text-2xl text-foreground">
                          {player.name}
                        </h3>
                        <p className="mt-3 text-sm text-muted-foreground">
                          {player.titles} titulo(s) oficiais registrados.
                        </p>
                      </article>
                    ))}
                  </div>

                  <div className="mt-8 space-y-3">
                    {champions.map((player) => (
                      <div
                        key={player.name}
                        className="flex items-center justify-between rounded-2xl border border-white/8 bg-background/55 px-5 py-4"
                      >
                        <div className="flex items-center gap-4">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-heading text-sm font-black text-primary">
                            {player.rank}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{player.name}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Registro historico oficial
                            </p>
                          </div>
                        </div>
                        <span className="font-heading text-xl font-black text-primary">
                          {player.titles}x
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <aside className="rounded-[30px] border border-white/8 bg-metallic-card p-6 shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]">
                  <p className="text-xs uppercase tracking-[0.24em] text-primary">
                    Leitura
                  </p>
                  <div className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">
                    <p>Esta visao usa o arquivo oficial do hall de campeoes.</p>
                    <p>Ela fica secundaria no produto, mas continua disponivel para referencia.</p>
                    <p>Use a aba de temporada para o fluxo principal do circuito.</p>
                  </div>
                </aside>
              </div>
            )}

            {activeView === "monitoramento" && (
              monitors.length > 0 ? (
                <div className="mt-10 grid gap-4 lg:grid-cols-2">
                  {monitors.map((monitor) => {
                    const liveRows = monitor.championships.filter(
                      (item) => item.status === "STARTED",
                    ).length;
                    const openRows = monitor.championships.filter(
                      (item) => item.status === "REGISTRATION",
                    ).length;
                    const platformCount = new Set(
                      monitor.championships.map((item) => item.configuration.platform),
                    ).size;

                    return (
                      <article
                        key={monitor.name}
                        className="rounded-[30px] border border-white/8 bg-metallic-card p-6 shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-primary">
                              Monitor
                            </p>
                            <h2 className="mt-2 font-heading text-2xl text-foreground">
                              {monitor.name}
                            </h2>
                          </div>
                          <span className="rounded-full border border-electric/20 bg-electric/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-electric">
                            {monitor.championships.length} evento(s)
                          </span>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                          <SeasonInfoCard label="Abertos" value={String(openRows)} />
                          <SeasonInfoCard label="Ao vivo" value={String(liveRows)} />
                          <SeasonInfoCard label="Plataformas" value={String(platformCount)} />
                        </div>

                        <div className="mt-6 space-y-3">
                          {monitor.championships.map((championship) => (
                            <Link
                              key={championship.id}
                              to={`/campeonatos/${championship.id}`}
                              className="flex items-center justify-between rounded-2xl border border-white/8 bg-background/55 px-4 py-4 transition-colors hover:border-electric/30"
                            >
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {championship.name}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                  {championship.configuration.platform}
                                </p>
                              </div>
                              <StatusBadge status={championship.status} />
                            </Link>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyStateCard
                  icon={BarChart3}
                  title="Nenhum monitor de ranking encontrado"
                  description="Quando os campeonatos publicados tiverem vinculo com rankings do circuito, esta aba consolida os monitores ativos."
                  className="mx-auto mt-10 max-w-3xl"
                />
              )
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
};

export default Ranking;
