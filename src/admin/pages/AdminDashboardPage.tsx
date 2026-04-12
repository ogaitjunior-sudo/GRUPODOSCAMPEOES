import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  ShieldCheck,
  Swords,
  Trophy,
  UploadCloud,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminMetricCard } from "@/admin/components/AdminMetricCard";
import { AdminPageHeader } from "@/admin/components/AdminPageHeader";
import { AdminSectionCard } from "@/admin/components/AdminSectionCard";
import { AdminStatusBadge } from "@/admin/components/AdminStatusBadge";
import { useAdminPanel } from "@/admin/context/AdminPanelContext";
import { formatDateTime } from "@/admin/utils/format";
import { Button } from "@/components/ui/button";
import { useChampionships } from "@/contexts/ChampionshipContext";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
});

function profilesLabel(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function buildGrowthSeries(dates: string[]) {
  const grouped = new Map<string, number>();

  dates.forEach((item) => {
    const date = new Date(item);
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  });

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, total]) => {
      const [year, month] = key.split("-").map(Number);
      return {
        label: monthFormatter.format(new Date(Date.UTC(year, month - 1, 1))),
        total,
      };
    });
}

export default function AdminDashboardPage() {
  const { state } = useAdminPanel();
  const { championships } = useChampionships();
  const platformBreakdown = ["PlayStation", "Xbox", "PC"].map((platform) => ({
    platform,
    total: state.players.filter((item) => item.platform === platform).length,
    approved: state.players.filter(
      (item) => item.platform === platform && item.status === "approved",
    ).length,
  }));
  const pendingImages = state.imageRequests.filter((item) => item.status === "pending").length;
  const openTickets = state.tickets.filter((item) => item.status !== "resolved").length;
  const criticalErrors = state.errorLogs.filter((item) => item.severity === "critical").length;
  const pendingAccounts = state.teams.filter((item) => item.status === "pending").length;
  const growthData = buildGrowthSeries([
    ...state.users.map((item) => item.createdAt),
    ...state.players.map((item) => item.createdAt),
    ...state.teams.map((item) => item.createdAt),
  ]);
  const activeChampionships = championships
    .filter(
      (item) =>
        item.status === "Inscricoes abertas" ||
        item.status === "Em andamento" ||
        item.status === "Em breve",
    )
    .slice(0, 5);
  const quickActions = [
    {
      title: "Abrir jogadores",
      helper: `${profilesLabel(state.players.filter((item) => item.status !== "approved").length, "jogador", "jogadores")} com pendencia competitiva`,
      to: "/admin/jogadores",
    },
    {
      title: "Criar campeonato",
      helper: "Abrir o wizard simplificado de criacao",
      to: "/admin/campeonatos/novo",
    },
    {
      title: "Gerir campeonatos",
      helper: `${activeChampionships.length} campeonato(s) em foco agora`,
      to: "/admin/campeonatos",
    },
    {
      title: "Abrir configuracoes",
      helper: `${criticalErrors} alerta(s) tecnico(s) no sistema`,
      to: "/admin/configuracoes",
    },
  ];
  const importantAlerts = [
    pendingAccounts > 0
      ? {
          id: "alert-accounts",
          title: `${pendingAccounts} contas UT aguardando liberacao`,
          description: "Existem perfis que ainda precisam de ownership, prova de elenco ou validação final.",
          tone: "warning" as const,
        }
      : null,
    pendingImages > 0
      ? {
          id: "alert-images",
          title: `${pendingImages} artes pendentes de moderacao`,
          description: "Itens em fila podem atrasar cards de jogadores, contas UT e banners do circuito.",
          tone: "warning" as const,
        }
      : null,
    openTickets > 0
      ? {
          id: "alert-support",
          title: `${openTickets} tickets ativos na operacao`,
          description: "O atendimento segue com demandas de acesso, campeonatos e validacao de contas.",
          tone: "info" as const,
        }
      : null,
    criticalErrors > 0
      ? {
          id: "alert-errors",
          title: `${criticalErrors} erros criticos registrados`,
          description: "Ha falhas severas que exigem revisao imediata do backoffice oculto.",
          tone: "danger" as const,
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Visao geral"
        title="Dashboard ADM"
        description="Acompanhe o estado do circuito, priorize o que pede acao agora e navegue rapido entre campeonatos, jogadores e configuracoes."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/admin/jogadores">Abrir jogadores</Link>
            </Button>
            <Button asChild>
              <Link to="/admin/campeonatos/novo">Criar campeonato</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          icon={Users}
          label="Acessos totais"
          value={state.users.length}
          helper="Contas com rastreio de login, papeis e historico interno."
        />
        <AdminMetricCard
          icon={ShieldCheck}
          label="Jogadores aprovados"
          value={state.players.filter((item) => item.status === "approved").length}
          helper="Perfis prontos para competir no circuito X1 UT."
          accent="electric"
        />
        <AdminMetricCard
          icon={Swords}
          label="Contas UT liberadas"
          value={state.teams.filter((item) => item.status === "approved").length}
          helper="Contas aptas para check-in, sorteio e reports oficiais."
        />
        <AdminMetricCard
          icon={Trophy}
          label="Campeonatos ativos"
          value={
            championships.filter(
              (item) => item.status === "Inscricoes abertas" || item.status === "Em andamento" || item.status === "Em breve",
            ).length
          }
          helper="Eventos publicados ou em andamento na grade atual."
          accent="electric"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <AdminSectionCard
          title="Fila de hoje"
          description="O painel agora prioriza o que precisa de decisao rapida antes dos blocos analiticos."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.to}
                className="rounded-[24px] border border-white/8 bg-black/20 p-5 transition-all hover:-translate-y-0.5 hover:border-electric/25 hover:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{action.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.helper}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
                </div>
              </Link>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Campeonatos em foco"
          description="Eventos que mais pedem leitura operacional agora."
        >
          <div className="space-y-3">
            {activeChampionships.length > 0 ? (
              activeChampionships.map((championship) => (
                <article
                  key={championship.id}
                  className="rounded-[24px] border border-white/8 bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-primary">
                        {championship.configuration.rankingName}
                      </p>
                      <p className="mt-2 font-semibold text-white">{championship.name}</p>
                    </div>
                    <AdminStatusBadge
                      label={championship.status}
                      tone={
                        championship.status === "Inscricoes abertas"
                          ? "success"
                          : championship.status === "Em andamento"
                            ? "info"
                            : "warning"
                      }
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/admin/campeonatos/${championship.id}`}>Painel</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/campeonatos/${championship.id}`}>Publico</Link>
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum campeonato ativo no momento.
              </p>
            )}
          </div>
        </AdminSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <AdminSectionCard
          title="Crescimento do circuito"
          description="Entradas de acessos, jogadores e contas UT ao longo das ultimas janelas."
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="dashboardPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffcc00" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ffcc00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#111111",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    color: "#ffffff",
                  }}
                />
                <Area type="monotone" dataKey="total" stroke="#ffcc00" fill="url(#dashboardPrimary)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Pulso operacional"
          description="Saude da plataforma e distribuicao de jogadores por plataforma."
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status da plataforma</p>
                  <p className="mt-2 text-lg font-semibold text-white">{state.settings.siteName}</p>
                </div>
                <AdminStatusBadge
                  label={state.settings.platformStatus}
                  tone={
                    state.settings.platformStatus === "healthy"
                      ? "success"
                      : state.settings.platformStatus === "attention"
                      ? "warning"
                      : "danger"
                  }
                />
              </div>
            </div>

            <div className="grid gap-3">
              {platformBreakdown.map((item) => (
                <div key={item.platform} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{item.platform}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {item.approved} aprovados
                      </p>
                    </div>
                    <span className="font-heading text-2xl text-primary">{item.total}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Total de jogadores monitorados nesta plataforma.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </AdminSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
        <AdminSectionCard
          title="Alertas importantes"
          description="Itens que pedem resposta rapida da operacao interna."
        >
          <div className="space-y-3">
            {importantAlerts.length > 0 ? (
              importantAlerts.map((alert) => (
                <article key={alert.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    <p className="font-semibold text-white">{alert.title}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{alert.description}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum alerta critico no momento.</p>
            )}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Atividade recente"
          description="Ultimas acoes relevantes registradas no backoffice."
        >
          <div className="space-y-3">
            {state.auditLogs.slice(0, 6).map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{entry.action}</p>
                  <AdminStatusBadge
                    label={entry.severity}
                    tone={entry.severity === "success" ? "success" : entry.severity === "warning" ? "warning" : "info"}
                  />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{entry.target}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {entry.actor} • {formatDateTime(entry.createdAt)}
                </p>
              </article>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Erros recentes"
          description="Ocorrencias tecnicas com impacto em login, uploads ou inscricoes."
        >
          <div className="space-y-3">
            {state.errorLogs.slice(0, 4).map((error) => (
              <article key={error.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{error.module}</p>
                  <AdminStatusBadge
                    label={error.status}
                    tone={error.status === "resolved" ? "success" : error.severity === "critical" ? "danger" : "warning"}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{error.message}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {formatDateTime(error.createdAt)}
                </p>
              </article>
            ))}
          </div>
        </AdminSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AdminSectionCard
          title="Filas humanas"
          description="Volume rapido das filas que dependem de avaliacao manual."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <UploadCloud className="h-5 w-5 text-primary" />
                <p className="font-semibold text-white">Artes pendentes</p>
              </div>
              <p className="mt-4 font-heading text-3xl text-primary">{pendingImages}</p>
              <p className="mt-2 text-sm text-muted-foreground">Cards, contas UT e banners aguardando decisao.</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-electric" />
                <p className="font-semibold text-white">Tickets ativos</p>
              </div>
              <p className="mt-4 font-heading text-3xl text-electric">{openTickets}</p>
              <p className="mt-2 text-sm text-muted-foreground">Atendimentos ainda sem encerramento final.</p>
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Radar competitivo"
          description="Panorama rapido do calendario e da fila de torneios."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Publicados</p>
              <p className="mt-3 font-heading text-3xl text-white">
                {championships.filter((item) => item.status === "Inscricoes abertas" || item.status === "Em breve").length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ao vivo</p>
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 font-heading text-3xl text-primary">
                {championships.filter((item) => item.status === "Em andamento").length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Encerrados</p>
              <p className="mt-3 font-heading text-3xl text-electric">
                {championships.filter((item) => item.status === "Finalizado").length}
              </p>
            </div>
          </div>
        </AdminSectionCard>
      </div>
    </div>
  );
}
