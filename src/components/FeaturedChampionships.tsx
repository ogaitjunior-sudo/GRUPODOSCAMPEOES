import { CalendarDays, Crown, ShieldCheck, Swords, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useChampionships } from "@/contexts/ChampionshipContext";
import { champions } from "@/data/siteContent";
import { formatChampionshipDateRange } from "@/lib/championships";
import type { ChampionshipRecord } from "@/types/championship";

function BucketHeader({
  title,
  helper,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  helper: string;
  icon: typeof Trophy;
  iconClassName: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${iconClassName}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
      </div>
    </div>
  );
}

function BucketItems({
  items,
  emptyMessage,
}: {
  items: ChampionshipRecord[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm leading-7 text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((championship) => (
        <Link
          key={championship.id}
          to={`/campeonatos/${championship.id}`}
          className="block rounded-[22px] border border-white/8 bg-background/50 p-4 transition-all hover:-translate-y-0.5 hover:border-electric/25 hover:bg-white/5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-primary">
                {championship.teamCount} vagas no grid
              </p>
              <h3 className="mt-2 font-heading text-base font-bold text-foreground">
                {championship.name}
              </h3>
            </div>
            <StatusBadge status={championship.status} />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{championship.description}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {formatChampionshipDateRange(championship.startDate, championship.endDate)}
          </p>
        </Link>
      ))}
    </div>
  );
}

export function FeaturedChampionships() {
  const { championships, isLoading, storageMode, syncError } = useChampionships();

  const openChampionships = championships
    .filter((championship) => championship.status.startsWith("Inscri"))
    .slice(0, 3);
  const liveChampionships = championships
    .filter((championship) => championship.status === "Em andamento")
    .slice(0, 3);
  const upcomingChampionships = championships
    .filter((championship) => championship.status === "Em breve")
    .slice(0, 3);

  return (
    <section className="site-section-shell py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="font-heading text-xs uppercase tracking-[0.34em] text-primary">
            Painel publico
          </p>
          <h2 className="mt-3 text-center font-heading text-2xl font-bold gradient-gold-text text-glow-gold md:text-4xl">
            VISAO RAPIDA DO CIRCUITO
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            A home agora mostra o que esta aberto, o que ja comecou e o que entra em breve,
            com leitura mais operacional para jogador de X1 UT.
          </p>
        </div>

        {storageMode === "supabase" && syncError ? (
          <EmptyStateCard
            icon={Trophy}
            title="Supabase indisponivel"
            description={syncError}
            actionLabel="Abrir campeonatos"
            actionTo="/campeonatos"
            className="mx-auto max-w-3xl"
          />
        ) : isLoading ? (
          <EmptyStateCard
            icon={Trophy}
            title="Carregando circuito"
            description="Sincronizando campeonatos, status e cards publicos da home."
            className="mx-auto max-w-3xl"
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="grid gap-6 xl:grid-cols-3">
              <section className="rounded-[30px] panel-premium p-6">
                <BucketHeader
                  title="Inscricoes abertas"
                  helper="Torneios prontos para receber jogadores."
                  icon={ShieldCheck}
                  iconClassName="border-primary/20 bg-primary/10 text-primary"
                />
                <BucketItems
                  items={openChampionships}
                  emptyMessage="Nenhuma janela de inscricao aberta no momento."
                />
              </section>

              <section className="rounded-[30px] panel-premium p-6">
                <BucketHeader
                  title="Em andamento"
                  helper="Eventos que ja estao em disputa agora."
                  icon={Swords}
                  iconClassName="border-electric/20 bg-electric/10 text-electric"
                />
                <BucketItems
                  items={liveChampionships}
                  emptyMessage="Nenhum campeonato em andamento agora."
                />
              </section>

              <section className="rounded-[30px] panel-premium p-6">
                <BucketHeader
                  title="Em breve"
                  helper="Proximas janelas programadas do calendario."
                  icon={CalendarDays}
                  iconClassName="border-white/10 bg-white/5 text-muted-foreground"
                />
                <BucketItems
                  items={upcomingChampionships}
                  emptyMessage="Nenhum torneio agendado para breve."
                />
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-[30px] panel-premium p-6">
                <BucketHeader
                  title="Arquivo historico"
                  helper="Campeoes oficiais continuam visiveis, mas agora como camada secundaria do portal."
                  icon={Crown}
                  iconClassName="border-primary/20 bg-primary/10 text-primary"
                />

                <div className="space-y-3">
                  {champions.slice(0, 5).map((champion) => (
                    <div
                      key={champion.name}
                      className="flex items-center justify-between rounded-[22px] border border-white/8 bg-background/50 px-4 py-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{champion.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {champion.titles} titulo(s)
                        </p>
                      </div>
                      <span className="font-heading text-xl font-black text-primary">
                        #{champion.rank}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    to="/campeoes"
                    className="inline-flex rounded-full panel-premium-soft px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-primary transition-all hover:-translate-y-0.5 hover:bg-primary/10"
                  >
                    Abrir campeoes
                  </Link>
                  <Link
                    to="/ligas"
                    className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-electric/30 hover:text-foreground"
                  >
                    Ver ligas
                  </Link>
                </div>
              </section>

              <section className="rounded-[30px] panel-premium-soft p-6">
                <BucketHeader
                  title="Como navegar"
                  helper="Fluxo publico priorizando descoberta, inscricao, ranking e historico."
                  icon={Users}
                  iconClassName="border-primary/20 bg-primary/10 text-primary"
                />

                <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                  <p>1. Entre em Explorar para filtrar o circuito e achar eventos abertos.</p>
                  <p>2. Use Ranking e Perfil para acompanhar campanha e desempenho.</p>
                  <p>3. Abra Relampago quando quiser torneio curto e decisivo.</p>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
