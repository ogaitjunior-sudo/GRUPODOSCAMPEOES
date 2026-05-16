import { useEffect, useMemo, useState } from "react";
import { BarChart3, Crown, ShieldCheck, Swords, TrendingUp, Trophy } from "lucide-react";
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
import {
  CHAMPION_RANKING_POINTS,
  buildChampionshipRanking,
  compareChampionshipRankingRows,
  type ChampionshipRankingTeamRecord,
} from "@/lib/championship-ranking";
import { loadChampionshipWorkspaceRecord } from "@/lib/championship-workspace-store";
import type { ChampionshipRecord } from "@/types/championship";
import type { ChampionshipWorkspaceRecord } from "@/types/championship-runtime";

type RankingView = "temporada" | "titulos" | "monitoramento";

function normalizeRankingName(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function createHistoricalRankingRow(name: string, titles: number): ChampionshipRankingTeamRecord {
  const achievementRankingPoints = titles * CHAMPION_RANKING_POINTS;

  return {
    key: `historical:${normalizeRankingName(name)}`,
    teamIds: [],
    playerId: null,
    playerEmail: null,
    name,
    rankingPoints: achievementRankingPoints,
    matchRankingPoints: 0,
    achievementRankingPoints,
    titlesCount: titles,
    viceTitlesCount: 0,
    thirdPlacesCount: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    efficiency: 0,
    championshipsCount: titles,
    championshipIds: [],
  };
}

function mergeHistoricalTitles(
  rankingRows: ChampionshipRankingTeamRecord[],
): ChampionshipRankingTeamRecord[] {
  const rowsByName = new Map(
    rankingRows.map((row) => [
      normalizeRankingName(row.name),
      {
        ...row,
        teamIds: [...row.teamIds],
        championshipIds: [...row.championshipIds],
      },
    ]),
  );

  champions.forEach((champion) => {
    const key = normalizeRankingName(champion.name);
    const existing = rowsByName.get(key);
    const achievementRankingPoints = champion.titles * CHAMPION_RANKING_POINTS;

    if (existing) {
      rowsByName.set(key, {
        ...existing,
        rankingPoints: existing.rankingPoints + achievementRankingPoints,
        achievementRankingPoints: existing.achievementRankingPoints + achievementRankingPoints,
        titlesCount: existing.titlesCount + champion.titles,
      });
      return;
    }

    rowsByName.set(key, createHistoricalRankingRow(champion.name, champion.titles));
  });

  return Array.from(rowsByName.values()).sort(compareChampionshipRankingRows);
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
  const [rankingWorkspaces, setRankingWorkspaces] = useState<
    Record<string, ChampionshipWorkspaceRecord>
  >({});
  const [isRankingLoading, setIsRankingLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadRankingWorkspaces = async () => {
      setIsRankingLoading(championships.length > 0);

      try {
        const results = await Promise.allSettled(
          championships.map(async (championship) => ({
            championshipId: championship.id,
            workspace: await loadChampionshipWorkspaceRecord(championship),
          })),
        );

        if (!isActive) {
          return;
        }

        const nextWorkspaces: Record<string, ChampionshipWorkspaceRecord> = {};

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            nextWorkspaces[result.value.championshipId] = result.value.workspace;
          }
        });

        setRankingWorkspaces(nextWorkspaces);
      } finally {
        if (isActive) {
          setIsRankingLoading(false);
        }
      }
    };

    void loadRankingWorkspaces();

    return () => {
      isActive = false;
    };
  }, [championships]);

  const monitors = buildRankingMonitors(championships);
  const rankingInputs = useMemo(
    () =>
      championships
        .map((championship) => {
          const workspace = rankingWorkspaces[championship.id];

          return workspace ? { championship, workspace } : null;
        })
        .filter((item): item is { championship: ChampionshipRecord; workspace: ChampionshipWorkspaceRecord } =>
          Boolean(item),
        ),
    [championships, rankingWorkspaces],
  );
  const liveRankingRows = useMemo(() => buildChampionshipRanking(rankingInputs), [rankingInputs]);
  const rankingRows = useMemo(() => mergeHistoricalTitles(liveRankingRows), [liveRankingRows]);
  const openCount = championships.filter((item) => item.status === "REGISTRATION").length;
  const liveCount = championships.filter((item) => item.status === "STARTED").length;
  const finalCount = championships.filter((item) => item.status === "FINISHED").length;
  const dynamicTitleCount = rankingRows.reduce((sum, player) => sum + player.titlesCount, 0);
  const totalTitles =
    dynamicTitleCount || champions.reduce((sum, player) => sum + player.titles, 0);
  const topThree = rankingRows.slice(0, 3);

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

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
                  helper: dynamicTitleCount
                    ? "Conquistas calculadas dos campeonatos finalizados"
                    : "Arquivo historico visivel no portal",
                  icon: Crown,
                  tone: "text-electric",
                },
                {
                  label: "Pontos de ranking",
                  value: rankingRows.reduce((sum, player) => sum + player.rankingPoints, 0),
                  helper: "Partidas + conquistas oficiais",
                  icon: TrendingUp,
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
                { key: "titulos", label: "Conquistas" },
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
              <>
                <section className="mt-10 overflow-hidden rounded-[32px] border border-primary/15 bg-[radial-gradient(circle_at_top_left,hsl(51_100%_50%_/_0.16),transparent_28%),linear-gradient(180deg,hsl(220_26%_12%_/_0.96),hsl(222_24%_8%_/_0.98))] shadow-[0_28px_80px_hsl(222_45%_2%_/_0.48)]">
                  <div className="flex flex-col gap-5 border-b border-white/8 px-5 py-6 md:flex-row md:items-end md:justify-between md:px-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-primary">
                        Ranking geral do clube
                      </p>
                      <h2 className="mt-2 font-heading text-3xl text-foreground">
                        Pontuacao oficial EA FC
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                        Vitoria vale 2 pontos, empate vale 1 ponto. Campeao recebe +15,
                        vice +8 e terceiro lugar +5 quando o campeonato e finalizado oficialmente.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Vitoria +2",
                        "Empate +1",
                        "Campeao +15",
                        "Vice +8",
                        "3o lugar +5",
                      ].map((rule) => (
                        <span
                          key={rule}
                          className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-primary"
                        >
                          {rule}
                        </span>
                      ))}
                    </div>
                  </div>

                  {rankingRows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-[980px] w-full border-separate border-spacing-0 text-sm">
                        <thead>
                          <tr className="text-left text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                            <th className="px-5 py-4">#</th>
                            <th className="px-4 py-4">Time</th>
                            <th className="px-4 py-4 text-center">Pontos</th>
                            <th className="px-4 py-4 text-center">Titulos</th>
                            <th className="px-4 py-4 text-center">Vice</th>
                            <th className="px-4 py-4 text-center">3o</th>
                            <th className="px-4 py-4 text-center">Jogos</th>
                            <th className="px-4 py-4 text-center">V</th>
                            <th className="px-4 py-4 text-center">SG</th>
                            <th className="px-5 py-4 text-center">Aprov.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rankingRows.map((player, index) => (
                            <tr
                              key={player.key}
                              className="group border-t border-white/8 transition-colors hover:bg-white/[0.035]"
                            >
                              <td className="border-t border-white/8 px-5 py-4">
                                <span
                                  className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border font-heading text-sm font-black ${
                                    index === 0
                                      ? "border-primary/35 bg-primary/15 text-primary"
                                      : "border-white/10 bg-white/[0.04] text-slate-200"
                                  }`}
                                >
                                  {index + 1}
                                </span>
                              </td>
                              <td className="border-t border-white/8 px-4 py-4">
                                <div>
                                  <p className="font-heading text-lg uppercase tracking-[0.06em] text-foreground">
                                    {player.name}
                                  </p>
                                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                    {player.championshipsCount} campeonato(s) no circuito
                                  </p>
                                </div>
                              </td>
                              <td className="border-t border-white/8 px-4 py-4 text-center">
                                <span className="font-heading text-2xl text-primary">
                                  {player.rankingPoints}
                                </span>
                                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                                  {player.matchRankingPoints} jogos + {player.achievementRankingPoints} conquistas
                                </p>
                              </td>
                              <td className="border-t border-white/8 px-4 py-4 text-center font-semibold text-foreground">
                                {player.titlesCount}
                              </td>
                              <td className="border-t border-white/8 px-4 py-4 text-center text-slate-300">
                                {player.viceTitlesCount}
                              </td>
                              <td className="border-t border-white/8 px-4 py-4 text-center text-slate-300">
                                {player.thirdPlacesCount}
                              </td>
                              <td className="border-t border-white/8 px-4 py-4 text-center text-slate-300">
                                {player.played}
                              </td>
                              <td className="border-t border-white/8 px-4 py-4 text-center text-slate-300">
                                {player.wins}
                              </td>
                              <td className="border-t border-white/8 px-4 py-4 text-center text-slate-300">
                                {player.goalDifference}
                              </td>
                              <td className="border-t border-white/8 px-5 py-4 text-center text-slate-300">
                                {player.efficiency}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyStateCard
                      icon={TrendingUp}
                      title={isRankingLoading ? "Calculando ranking" : "Ranking ainda sem pontuacao"}
                      description={
                        isRankingLoading
                          ? "Buscando os workspaces dos campeonatos para montar a classificacao geral."
                          : "Assim que houver partidas ou campeonatos finalizados, a tabela geral aparece aqui."
                      }
                      className="mx-auto my-8 max-w-3xl"
                    />
                  )}
                </section>

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
              </>
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
                    {(topThree.length > 0 ? topThree : champions.slice(0, 3)).map((player, index) => {
                      const position = "rankingPoints" in player ? index + 1 : player.rank;
                      const titleCount = "rankingPoints" in player ? player.titlesCount : player.titles;

                      return (
                      <article
                        key={player.name}
                        className={`rounded-[24px] border p-5 ${
                          index === 0
                            ? "border-primary/30 bg-primary/10"
                            : "border-white/8 bg-background/55"
                        }`}
                      >
                        <p className="text-xs uppercase tracking-[0.22em] text-primary">
                          Posicao #{position}
                        </p>
                        <h3 className="mt-3 font-heading text-2xl text-foreground">
                          {player.name}
                        </h3>
                        <p className="mt-3 text-sm text-muted-foreground">
                          {titleCount} titulo(s) oficiais registrados.
                        </p>
                      </article>
                    );
                    })}
                  </div>

                  <div className="mt-8 space-y-3">
                    {(rankingRows.length > 0 ? rankingRows : champions).map((player, index) => {
                      const position = "rankingPoints" in player ? index + 1 : player.rank;
                      const titleCount = "rankingPoints" in player ? player.titlesCount : player.titles;
                      const points = "rankingPoints" in player ? player.rankingPoints : titleCount * 15;

                      return (
                      <div
                        key={player.name}
                        className="flex items-center justify-between rounded-2xl border border-white/8 bg-background/55 px-5 py-4"
                      >
                        <div className="flex items-center gap-4">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-heading text-sm font-black text-primary">
                            {position}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{player.name}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {points} pontos totais
                            </p>
                          </div>
                        </div>
                        <span className="font-heading text-xl font-black text-primary">
                          {titleCount}x
                        </span>
                      </div>
                    );
                    })}
                  </div>
                </section>

                <aside className="rounded-[30px] border border-white/8 bg-metallic-card p-6 shadow-[0_18px_45px_hsl(0_0%_0%_/_0.24)]">
                  <p className="text-xs uppercase tracking-[0.24em] text-primary">
                    Leitura
                  </p>
                  <div className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">
                    <p>Campeao soma +15 pontos, vice +8 e terceiro lugar +5.</p>
                    <p>A visao recalcula automaticamente quando o resultado final muda.</p>
                    <p>Se ainda nao houver campeonatos finalizados, aparece o arquivo historico do hall.</p>
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
