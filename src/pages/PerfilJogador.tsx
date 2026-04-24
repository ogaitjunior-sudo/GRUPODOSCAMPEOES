import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock3,
  Crown,
  Search,
  ShieldCheck,
  Trophy,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import logoGC from "@/assets/logo-gc-fc26.png";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { useChampionships } from "@/contexts/ChampionshipContext";
import { usePlayerAuth } from "@/contexts/PlayerAuthContext";
import { champions } from "@/data/siteContent";
import {
  formatChampionshipDateRange,
  getChampionshipRegistrationByPlayer,
  getChampionshipRegistrationStatusLabel,
} from "@/lib/championships";
import type { ChampionshipRecord } from "@/types/championship";

type ProfileTab = "atividade" | "campeonatos" | "rankings";

function isProfileTab(value: string | null): value is ProfileTab {
  return value === "atividade" || value === "campeonatos" || value === "rankings";
}

function formatDisplayName(name: string | null) {
  if (!name) {
    return "Jogador";
  }

  return name.trim();
}

function formatJoinedDate(value: string | null | undefined) {
  if (!value) {
    return "Conta conectada ao portal";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Conta conectada ao portal";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
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

function LinkButton({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-md border border-primary/30 px-4 py-2 font-heading text-xs font-bold uppercase tracking-[0.16em] text-primary transition-all hover:bg-primary/10"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function ProfileInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-background/55 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm text-foreground">{value}</p>
    </div>
  );
}

function QuickLinkCard({
  to,
  icon: Icon,
  title,
  helper,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  helper: string;
}) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-white/8 bg-background/55 p-4 transition-all hover:-translate-y-0.5 hover:border-electric/30"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{helper}</p>
        </div>
      </div>
    </Link>
  );
}

function ChampionshipRows({
  items,
  playerId,
  emptyTitle,
  emptyDescription,
}: {
  items: ChampionshipRecord[];
  playerId: string | null;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyStateCard
        icon={Trophy}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel="Abrir catalogo"
        actionTo="/campeonatos"
        className="mx-auto max-w-3xl"
      />
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        (() => {
          const registrationRequest = getChampionshipRegistrationByPlayer(item, playerId);

          return (
            <Link
              key={item.id}
              to={`/campeonatos/${item.id}`}
              className="block rounded-[28px] border border-white/8 bg-background/55 p-5 transition-all hover:-translate-y-0.5 hover:border-electric/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">
                    {item.configuration.rankingName}
                  </p>
                  <h3 className="mt-2 font-heading text-xl text-foreground">{item.name}</h3>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {registrationRequest ? (
                    <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                      {getChampionshipRegistrationStatusLabel(registrationRequest.status)}
                    </Badge>
                  ) : null}
                  <StatusBadge status={item.status} />
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{item.description}</p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <ProfileInfoCard label="Plataforma" value={item.configuration.platform} />
                <ProfileInfoCard
                  label="Calendario"
                  value={formatChampionshipDateRange(item.startDate, item.endDate)}
                />
                <ProfileInfoCard
                  label="Participacao"
                  value={
                    registrationRequest
                      ? getChampionshipRegistrationStatusLabel(registrationRequest.status)
                      : "Sem pedido enviado"
                  }
                />
              </div>
            </Link>
          );
        })()
      ))}
    </div>
  );
}

export default function PerfilJogador() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ProfileTab>("atividade");
  const { championships } = useChampionships();
  const { isAuthenticated, loginName, playerEmail, session } = usePlayerAuth();

  useEffect(() => {
    const tabFromUrl = searchParams.get("aba");
    setActiveTab(isProfileTab(tabFromUrl) ? tabFromUrl : "atividade");
  }, [searchParams]);

  if (!isAuthenticated) {
    return (
      <PageShell>
        <section className="px-4 py-20">
          <div className="container mx-auto">
            <EmptyStateCard
              icon={UserRound}
              title="Entre para abrir o perfil"
              description="O perfil do jogador fica disponivel depois do login. Entre com sua conta para acessar atividade, campeonatos e rankings pessoais."
              actionLabel="Abrir login"
              actionTo="/entrar"
              className="mx-auto max-w-3xl"
            />
          </div>
        </section>
      </PageShell>
    );
  }

  const playerName = formatDisplayName(loginName);
  const openChampionships = championships.filter((item) => item.status === "REGISTRATION");
  const liveChampionships = championships.filter((item) => item.status === "STARTED");
  const upcomingChampionships = championships.filter((item) => item.status === "DRAFT" || item.status === "READY");
  const rankingMonitors = buildRankingMonitors(championships);
  const historicalTitles = champions.reduce((total, item) => total + item.titles, 0);
  const tabButtons: Array<{
    key: ProfileTab;
    label: string;
    helper: string;
    icon: LucideIcon;
  }> = [
    {
      key: "atividade",
      label: "Painel",
      helper: "Resumo do acesso e radar do circuito.",
      icon: UserRound,
    },
    {
      key: "campeonatos",
      label: "Campeonatos",
      helper: "Catalogo, janelas e eventos ao vivo.",
      icon: Trophy,
    },
    {
      key: "rankings",
      label: "Ranking",
      helper: "Monitoramento e historico do circuito.",
      icon: BarChart3,
    },
  ];

  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);

    const nextParams = new URLSearchParams(searchParams);

    if (tab === "atividade") {
      nextParams.delete("aba");
    } else {
      nextParams.set("aba", tab);
    }

    setSearchParams(nextParams, { replace: true });
  };

  return (
    <PageShell className="bg-background">
      <section className="relative overflow-hidden px-4 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(51_100%_50%_/_0.10),transparent_28%),radial-gradient(circle_at_82%_18%,hsl(195_100%_50%_/_0.12),transparent_24%),linear-gradient(180deg,hsl(0_0%_6%),hsl(0_0%_4%))]" />

        <div className="relative z-10 container mx-auto">
          <div className="mb-10">
            <p className="font-heading text-xs uppercase tracking-[0.35em] text-primary">
              Perfil do jogador
            </p>
            <h1 className="mt-3 font-heading text-4xl font-black gradient-gold-text text-glow-gold">
              PAINEL DE {playerName.toUpperCase()}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              O perfil agora funciona como central publica do jogador para acompanhar o circuito
              X1 UT, sem depender de um backoffice separado.
            </p>
          </div>

          <div className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-5">
              <div className="overflow-hidden rounded-[28px] border border-primary/20 bg-metallic-card shadow-[0_18px_45px_hsl(0_0%_0%_/_0.34)] border-glow-gold">
                <div className="relative flex h-72 items-end justify-center bg-[radial-gradient(circle_at_top,hsl(51_100%_50%_/_0.18),transparent_38%),linear-gradient(180deg,hsl(0_0%_18%),hsl(0_0%_10%))]">
                  <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(hsl(0_0%_100%_/_0.04)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%_/_0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
                  <div className="mb-6 flex h-36 w-36 items-center justify-center rounded-full border border-primary/25 bg-background/80 shadow-[0_0_30px_hsl(51_100%_50%_/_0.12)]">
                    <UserRound className="h-20 w-20 text-primary" />
                  </div>
                </div>

                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-heading text-xl text-foreground">{playerName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-electric">
                        Conta publica do circuito
                      </p>
                    </div>
                    <img
                      src={logoGC}
                      alt="Grupo de Campeoes"
                      className="h-11 w-11 rounded-full border border-primary/20 bg-background/70 object-contain p-1"
                    />
                  </div>

                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span>{playerEmail ?? loginName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-4 w-4 text-electric" />
                      <span>Conta ativa desde {formatJoinedDate(session?.loginAt)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Zap className="h-4 w-4 text-primary" />
                      <span>Foco atual em campeonatos X1 de Ultimate Team</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <LinkButton to="/campeonatos" icon={Trophy} label="Abrir catalogo" />
                    <LinkButton to="/ranking" icon={BarChart3} label="Ver ranking" />
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-border bg-card/80 p-3 shadow-[0_12px_30px_hsl(0_0%_0%_/_0.26)]">
                {tabButtons.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleTabChange(tab.key)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                      activeTab === tab.key
                        ? "bg-primary/12 text-primary"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                        activeTab === tab.key
                          ? "border-primary/30 bg-primary/12 text-primary"
                          : "border-border bg-background/50 text-electric"
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{tab.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {tab.helper}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  </button>
                ))}
              </div>
            </aside>

            <div className="space-y-8">
              {activeTab === "atividade" && (
                <>
                  <section className="rounded-[28px] border border-primary/18 bg-metallic-card p-6 shadow-[0_20px_45px_hsl(0_0%_0%_/_0.32)]">
                    <div className="mb-6">
                      <p className="font-heading text-xs uppercase tracking-[0.35em] text-primary">
                        Painel
                      </p>
                      <h2 className="mt-2 font-heading text-3xl text-foreground">
                        Radar do seu acesso
                      </h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        {
                          label: "Conta",
                          value: "Ativa",
                          helper: "Pronta para acompanhar o circuito",
                          icon: ShieldCheck,
                          tone: "text-primary",
                        },
                        {
                          label: "Inscricoes abertas",
                          value: String(openChampionships.length),
                          helper: "Eventos disponiveis agora",
                          icon: Trophy,
                          tone: "text-primary",
                        },
                        {
                          label: "Ao vivo",
                          value: String(liveChampionships.length),
                          helper: "Campeonatos em andamento",
                          icon: Zap,
                          tone: "text-electric",
                        },
                        {
                          label: "Arquivo oficial",
                          value: String(historicalTitles),
                          helper: "Titulos registrados no hall",
                          icon: Crown,
                          tone: "text-electric",
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-2xl border border-border bg-background/55 p-5 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.02)]"
                        >
                          <div className={`flex items-center gap-3 ${stat.tone}`}>
                            <stat.icon className="h-5 w-5" />
                            <span className="text-xs font-heading uppercase tracking-[0.24em]">
                              {stat.label}
                            </span>
                          </div>
                          <p className="mt-4 font-heading text-3xl font-black text-foreground">
                            {stat.value}
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">{stat.helper}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="rounded-[28px] border border-electric/15 bg-metallic-card p-6 shadow-[0_20px_40px_hsl(0_0%_0%_/_0.28)]">
                      <p className="font-heading text-xs uppercase tracking-[0.35em] text-electric">
                        Proximo passo
                      </p>
                      <div className="mt-6 space-y-4">
                        <QuickLinkCard
                          to="/campeonatos"
                          icon={Trophy}
                          title="Entrar em um campeonato"
                          helper="Veja o que esta aberto e compare formato, vagas e calendario."
                        />
                        <QuickLinkCard
                          to="/ranking"
                          icon={BarChart3}
                          title="Monitorar ranking"
                          helper="Acompanhe o que esta alimentando o ranking publico do circuito."
                        />
                        <QuickLinkCard
                          to="/explorar"
                          icon={Search}
                          title="Explorar eventos e rankings"
                          helper="Use filtros e busca para ir direto ao ponto."
                        />
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-border bg-card/75 p-6 shadow-[0_20px_40px_hsl(0_0%_0%_/_0.28)]">
                      <p className="font-heading text-xs uppercase tracking-[0.35em] text-primary">
                        Estado do circuito
                      </p>
                      <div className="mt-5 space-y-3">
                        {[
                          {
                            title: "Inscricoes abertas",
                            value: openChampionships.length,
                            helper: "Prontas para receber jogadores",
                            tone: "text-primary",
                          },
                          {
                            title: "Em andamento",
                            value: liveChampionships.length,
                            helper: "Rodadas ja acontecendo",
                            tone: "text-electric",
                          },
                          {
                            title: "Preparando tabela",
                            value: upcomingChampionships.length,
                            helper: "Janelas programadas no calendario",
                            tone: "text-muted-foreground",
                          },
                        ].map((item) => (
                          <article
                            key={item.title}
                            className="flex items-center justify-between rounded-2xl border border-white/8 bg-background/45 px-5 py-4"
                          >
                            <div>
                              <p className={`text-sm font-semibold ${item.tone}`}>{item.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{item.helper}</p>
                            </div>
                            <span className="font-heading text-3xl font-black text-foreground">
                              {item.value}
                            </span>
                          </article>
                        ))}
                      </div>
                    </div>
                  </section>
                </>
              )}

              {activeTab === "campeonatos" && (
                <section className="rounded-[28px] border border-primary/18 bg-metallic-card p-6 shadow-[0_20px_45px_hsl(0_0%_0%_/_0.32)]">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <p className="font-heading text-xs uppercase tracking-[0.35em] text-primary">
                        Campeonatos
                      </p>
                      <h2 className="mt-2 font-heading text-3xl text-foreground">
                        O que esta disponivel para seu perfil
                      </h2>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                        Em vez de uma aba administrativa, o perfil virou ponto de entrada para
                        descobrir o que esta aberto, o que esta ao vivo e o que entra em breve.
                      </p>
                    </div>

                    <LinkButton to="/campeonatos" icon={Trophy} label="Abrir catalogo" />
                  </div>

                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <ProfileInfoCard label="Inscricoes abertas" value={String(openChampionships.length)} />
                    <ProfileInfoCard label="Eventos ao vivo" value={String(liveChampionships.length)} />
                    <ProfileInfoCard label="Preparando tabela" value={String(upcomingChampionships.length)} />
                  </div>

                  <div className="mt-8">
                    <ChampionshipRows
                      items={championships}
                      playerId={session?.id ?? null}
                      emptyTitle="Nenhum campeonato publicado ainda"
                      emptyDescription="Quando o proximo evento oficial entrar no ar, ele aparecera aqui para o seu perfil acompanhar sem depender de uma area administrativa."
                    />
                  </div>

                  <div className="mt-8 rounded-[24px] border border-white/8 bg-background/45 p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      Areas secundarias
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <LinkButton to="/campeoes" icon={Crown} label="Abrir campeoes" />
                      <LinkButton to="/ligas" icon={Clock3} label="Ver ligas" />
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "rankings" && (
                <section className="rounded-[28px] border border-electric/18 bg-metallic-card p-6 shadow-[0_20px_45px_hsl(0_0%_0%_/_0.32)]">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <p className="font-heading text-xs uppercase tracking-[0.35em] text-electric">
                        Ranking
                      </p>
                      <h2 className="mt-2 font-heading text-3xl text-foreground">
                        Monitores do circuito
                      </h2>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                        O perfil mostra quais rankings publicos estao sendo alimentados pelo
                        calendario atual e deixa o hall historico como apoio, nao como foco central.
                      </p>
                    </div>

                    <LinkButton to="/ranking" icon={BarChart3} label="Abrir ranking geral" />
                  </div>

                  {rankingMonitors.length > 0 ? (
                    <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="space-y-4">
                        {rankingMonitors.map((monitor) => {
                          const liveCount = monitor.championships.filter(
                            (item) => item.status === "STARTED",
                          ).length;
                          const openCount = monitor.championships.filter(
                            (item) => item.status === "REGISTRATION",
                          ).length;

                          return (
                            <article
                              key={monitor.name}
                              className="rounded-[28px] border border-white/8 bg-background/55 p-5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-heading text-xl text-foreground">{monitor.name}</p>
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    {monitor.championships.length} campeonato(s) vinculados a este monitor.
                                  </p>
                                </div>
                                <Link
                                  to="/ranking"
                                  className="rounded-full border border-electric/20 bg-electric/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-electric"
                                >
                                  Ver no ranking
                                </Link>
                              </div>

                              <div className="mt-5 grid gap-3 md:grid-cols-3">
                                <ProfileInfoCard label="Ao vivo" value={String(liveCount)} />
                                <ProfileInfoCard label="Abertos" value={String(openCount)} />
                                <ProfileInfoCard
                                  label="Plataformas"
                                  value={String(
                                    new Set(
                                      monitor.championships.map((item) => item.configuration.platform),
                                    ).size,
                                  )}
                                />
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      <aside className="rounded-[28px] border border-white/8 bg-background/55 p-5">
                        <p className="text-xs uppercase tracking-[0.24em] text-primary">
                          Arquivo historico
                        </p>
                        <div className="mt-5 space-y-3">
                          {champions.slice(0, 5).map((champion) => (
                            <div
                              key={champion.name}
                              className="flex items-center justify-between rounded-2xl border border-white/8 bg-background/45 px-4 py-4"
                            >
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
                          ))}
                        </div>
                      </aside>
                    </div>
                  ) : (
                    <EmptyStateCard
                      icon={BarChart3}
                      title="Nenhum ranking monitorado ainda"
                      description="Assim que os campeonatos publicados apontarem para um ranking oficial, esta aba lista os monitores ativos do circuito."
                      actionLabel="Abrir ranking geral"
                      actionTo="/ranking"
                      className="mx-auto mt-8 max-w-3xl"
                    />
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
