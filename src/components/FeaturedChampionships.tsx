import { CalendarDays, Crown, ShieldCheck, Swords, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { SiteActionLink } from "@/components/SiteActionLink";
import { SiteSectionIntro } from "@/components/SiteSectionIntro";
import { StatusBadge } from "@/components/StatusBadge";
import { useChampionships } from "@/contexts/ChampionshipContext";
import { champions } from "@/data/siteContent";
import { formatChampionshipDateRange } from "@/lib/championships";
import type { ChampionshipRecord } from "@/types/championship";

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
          className="block rounded-[22px] site-card-subtle p-4 transition-colors hover:border-white/15 hover:bg-white/4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-primary">
                {championship.teamCount} vagas
              </p>
              <h3 className="mt-2 font-heading text-base font-semibold text-foreground">
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
    .filter((championship) => championship.status === "REGISTRATION")
    .slice(0, 3);
  const liveChampionships = championships
    .filter((championship) => championship.status === "STARTED")
    .slice(0, 3);
  const upcomingChampionships = championships
    .filter((championship) => championship.status === "DRAFT" || championship.status === "READY")
    .slice(0, 3);

  const buckets = [
    {
      title: "Inscrições abertas",
      helper: "Eventos prontos para receber jogadores.",
      icon: ShieldCheck,
      items: openChampionships,
      emptyMessage: "Nenhuma janela de inscrição aberta no momento.",
    },
    {
      title: "Em andamento",
      helper: "Partidas e rodadas já em disputa.",
      icon: Swords,
      items: liveChampionships,
      emptyMessage: "Nenhum campeonato em andamento agora.",
    },
    {
      title: "Preparando tabela",
      helper: "Próximas janelas planejadas do calendário.",
      icon: CalendarDays,
      items: upcomingChampionships,
      emptyMessage: "Nenhum torneio aguardando tabela agora.",
    },
  ];

  return (
    <section className="site-section-shell py-20">
      <div className="container mx-auto px-4">
        <SiteSectionIntro
          eyebrow="Campeonatos em foco"
          title="Acompanhe o que importa agora"
          description="A leitura da home ficou mais direta: o que está aberto, o que já começou e o que entra em breve."
          action={
            <SiteActionLink to="/campeonatos" variant="secondary" icon={Trophy}>
              Ver catálogo completo
            </SiteActionLink>
          }
        />

        {storageMode === "supabase" && syncError ? (
          <EmptyStateCard
            icon={Trophy}
            title="Conexão indisponível"
            description={syncError}
            actionLabel="Abrir campeonatos"
            actionTo="/campeonatos"
            className="mx-auto mt-10 max-w-3xl"
          />
        ) : isLoading ? (
          <EmptyStateCard
            icon={Trophy}
            title="Carregando campeonatos"
            description="Atualizando a visão principal do circuito."
            className="mx-auto mt-10 max-w-3xl"
          />
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_320px] lg:items-start">
            <div className="grid gap-4 items-start xl:grid-cols-3">
              {buckets.map((bucket) => (
                <section key={bucket.title} className="self-start rounded-[30px] site-card p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/18 bg-primary/10 text-primary">
                      <bucket.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-primary">
                        {bucket.title}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">{bucket.helper}</p>
                    </div>
                  </div>

                  <BucketItems items={bucket.items} emptyMessage={bucket.emptyMessage} />
                </section>
              ))}
            </div>

            <aside className="space-y-4 self-start">
              <section className="rounded-[30px] site-card p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/18 bg-primary/10 text-primary">
                    <Crown className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-primary">Arquivo oficial</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      O histórico continua acessível, mas agora como apoio ao fluxo principal.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {champions.slice(0, 4).map((champion) => (
                    <div
                      key={champion.name}
                      className="flex items-center justify-between rounded-[22px] site-card-subtle px-4 py-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{champion.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {champion.titles} título(s)
                        </p>
                      </div>
                      <span className="font-heading text-xl font-semibold text-primary">
                        #{champion.rank}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] site-card-soft p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-primary">Leitura rápida</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                  <p>1. Entre em campeonatos para ver a grade completa.</p>
                  <p>2. Abra um evento para acompanhar grupos, rodada e status.</p>
                  <p>3. Use ranking e perfil para continuar o fluxo depois da inscrição.</p>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
