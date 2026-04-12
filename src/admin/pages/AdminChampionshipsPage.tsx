import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { CalendarRange, PencilLine, RefreshCcw, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminMetricCard } from "@/admin/components/AdminMetricCard";
import { AdminPageHeader } from "@/admin/components/AdminPageHeader";
import { AdminStatusBadge } from "@/admin/components/AdminStatusBadge";
import { AdminTableCard } from "@/admin/components/AdminTableCard";
import { useChampionships } from "@/contexts/ChampionshipContext";
import {
  formatChampionshipDateRange,
  getFormatOption,
} from "@/lib/championships";
import { formatChampionshipStoreError } from "@/lib/championship-store";
import { toast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { normalizeSearch } from "@/admin/utils/format";
import type {
  ChampionshipPlatform,
  ChampionshipRecord,
  ChampionshipStatus,
} from "@/types/championship";

type ChampionshipsView = "fila" | "tabela";

const inputClassName =
  "h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-muted-foreground";

function getStatusTone(status: ChampionshipStatus) {
  if (status === "Em andamento") return "info";
  if (status === "Inscricoes abertas") return "success";
  if (status === "Em breve") return "warning";
  if (status === "Finalizado") return "neutral";
  return "danger";
}

function getRegistrationLabel(item: ChampionshipRecord) {
  return item.configuration.registrationMode === "public" ? "Entrada publica" : "Entrada privada";
}

function getReportLabel(item: ChampionshipRecord) {
  return item.configuration.resultsReportedBy === "players"
    ? "Resultado por jogadores"
    : "Resultado centralizado";
}

export default function AdminChampionshipsPage() {
  const [searchParams] = useSearchParams();
  const { championships, isLoading, refreshChampionships, removeChampionship, syncError, storageMode } =
    useChampionships();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ChampionshipStatus>("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | ChampionshipPlatform>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<ChampionshipsView>("fila");
  const [championshipToRemove, setChampionshipToRemove] = useState<ChampionshipRecord | null>(null);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");

    const nextStatus = searchParams.get("status");
    setStatusFilter(
      nextStatus === "Inscricoes abertas" ||
        nextStatus === "Em andamento" ||
        nextStatus === "Em breve" ||
        nextStatus === "Finalizado" ||
        nextStatus === "Cancelado"
        ? nextStatus
        : "all",
    );

    const nextPlatform = searchParams.get("platform");
    setPlatformFilter(
      nextPlatform === "PlayStation 5" ||
        nextPlatform === "PlayStation 4" ||
        nextPlatform === "Xbox Series" ||
        nextPlatform === "Xbox One" ||
        nextPlatform === "PC"
        ? nextPlatform
        : "all",
    );
  }, [searchParams]);

  const platformOptions = useMemo(
    () => [
      "all",
      ...Array.from(new Set(championships.map((item) => item.configuration.platform))),
    ] as Array<"all" | ChampionshipPlatform>,
    [championships],
  );

  const filteredChampionships = useMemo(() => {
    const search = normalizeSearch(query);
    return championships.filter((item) => {
      const matchesQuery =
        !search ||
        [
          item.name,
          item.description,
          item.configuration.platform,
          item.configuration.rankingName,
          getFormatOption(item.configuration.format).label,
          item.status,
        ]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(search);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesPlatform =
        platformFilter === "all" || item.configuration.platform === platformFilter;

      return matchesQuery && matchesStatus && matchesPlatform;
    });
  }, [championships, platformFilter, query, statusFilter]);

  const metricPublished = championships.length;
  const metricOpen = championships.filter((item) => item.status === "Inscricoes abertas").length;
  const metricLive = championships.filter((item) => item.status === "Em andamento").length;
  const totalSlots = championships.reduce((total, item) => total + item.teamCount, 0);
  const bucketedChampionships: Array<{
    title: string;
    helper: string;
    items: ChampionshipRecord[];
  }> = [
    {
      title: "Inscricoes abertas",
      helper: "Eventos prontos para entrada no fluxo publico.",
      items: filteredChampionships.filter((item) => item.status === "Inscricoes abertas"),
    },
    {
      title: "Em andamento",
      helper: "Campeonatos que pedem acompanhamento de rodada e bracket.",
      items: filteredChampionships.filter((item) => item.status === "Em andamento"),
    },
    {
      title: "Em breve",
      helper: "Janelas futuras que ainda podem precisar de revisao.",
      items: filteredChampionships.filter((item) => item.status === "Em breve"),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Grade competitiva"
        title="Campeonatos X1"
        description="A grade do admin agora espelha a leitura do catalogo publico, com o mesmo recorte de status, plataforma, vagas e operacao."
        actions={
          <>
            <Button
              variant="outline"
              onClick={async () => {
                setIsRefreshing(true);

                try {
                  await refreshChampionships();
                  toast({
                    title: "Lista atualizada",
                    description:
                      storageMode === "supabase"
                        ? "Os campeonatos foram sincronizados com a base ativa."
                        : "A lista local de campeonatos foi recarregada.",
                  });
                } catch (error) {
                  toast({
                    title: "Falha ao atualizar",
                    description: formatChampionshipStoreError(error),
                    variant: "destructive",
                  });
                } finally {
                  setIsRefreshing(false);
                }
              }}
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Atualizar lista
            </Button>
            <Button asChild className="font-heading font-bold">
              <Link to="/admin/campeonatos/novo">
                <Trophy className="h-4 w-4" />
                Criar campeonato
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          icon={Trophy}
          label="Publicados"
          value={metricPublished}
          helper="Eventos visiveis no circuito."
        />
        <AdminMetricCard
          icon={CalendarRange}
          label="Inscricoes abertas"
          value={metricOpen}
          helper="Prontos para entrada no catalogo."
        />
        <AdminMetricCard
          icon={PencilLine}
          label="Em disputa"
          value={metricLive}
          helper="Rodadas acontecendo no circuito."
          accent="electric"
        />
        <AdminMetricCard
          icon={Trophy}
          label="Vagas previstas"
          value={totalSlots}
          helper="Capacidade total publicada."
        />
      </div>

      {syncError ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {syncError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Use a fila para operar o que pede decisao agora e a tabela para varrer toda a grade.
        </p>
        <Tabs
          value={activeView}
          onValueChange={(value) => setActiveView(value as ChampionshipsView)}
          className="w-auto"
        >
          <TabsList className="h-auto gap-2 rounded-2xl bg-white/5 p-2">
            <TabsTrigger
              value="fila"
              className="rounded-xl border border-transparent px-4 py-2 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              Fila operacional
            </TabsTrigger>
            <TabsTrigger
              value="tabela"
              className="rounded-xl border border-transparent px-4 py-2 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              Tabela completa
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeView === "fila" ? (
        <div className="grid gap-6 xl:grid-cols-3">
          {bucketedChampionships.map((bucket) => (
            <AdminTableCard
              key={bucket.title}
              title={bucket.title}
              description={bucket.helper}
              filters={
                bucket.title === "Inscricoes abertas" ? (
                  <>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Buscar campeonato, descricao, ranking ou plataforma"
                      className={`${inputClassName} min-w-[240px] flex-1`}
                    />
                  </>
                ) : undefined
              }
            >
              <div className="space-y-3 p-4">
                {bucket.items.length > 0 ? (
                  bucket.items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[24px] border border-white/8 bg-black/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-primary">
                            {item.configuration.rankingName}
                          </p>
                          <p className="mt-2 font-semibold text-white">{item.name}</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <AdminStatusBadge label={item.status} tone={getStatusTone(item.status)} />
                      </div>

                      <div className="mt-4 grid gap-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {item.configuration.platform} • {getFormatOption(item.configuration.format).label}
                        </p>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {formatChampionshipDateRange(item.startDate, item.endDate)}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-primary">
                          {getRegistrationLabel(item)}
                        </span>
                        <span className="rounded-full border border-electric/20 bg-electric/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-electric">
                          {getReportLabel(item)}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button asChild size="sm">
                          <Link to={`/admin/campeonatos/${item.id}`}>Painel</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/admin/campeonatos/${item.id}/editar`}>Editar</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/admin/jogadores?championship=${item.id}`}>Jogadores</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/campeonatos/${item.id}`}>Publico</Link>
                        </Button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-muted-foreground">
                    Nenhum campeonato neste recorte.
                  </div>
                )}
              </div>
            </AdminTableCard>
          ))}
        </div>
      ) : (
      <AdminTableCard
        title="Calendario competitivo"
        description="Mesma leitura do catalogo publico, mas com acoes operacionais para abrir, editar e retirar eventos da grade."
        filters={
          <>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por campeonato, descricao, ranking ou plataforma"
              className={`${inputClassName} min-w-[240px] flex-1`}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | ChampionshipStatus)}
              className={inputClassName}
            >
              <option value="all">Todos os status</option>
              <option value="Inscricoes abertas">Inscricoes abertas</option>
              <option value="Em andamento">Em andamento</option>
              <option value="Em breve">Em breve</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
            <select
              value={platformFilter}
              onChange={(event) => setPlatformFilter(event.target.value as "all" | ChampionshipPlatform)}
              className={inputClassName}
            >
              <option value="all">Todas as plataformas</option>
              {platformOptions
                .filter((item) => item !== "all")
                .map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
            </select>
          </>
        }
      >
        {isLoading ? (
          <div className="rounded-2xl border border-white/8 bg-black/20 p-6 text-sm text-muted-foreground">
            Carregando campeonatos do cadastro principal...
          </div>
        ) : filteredChampionships.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full">
              <thead>
                <tr className="border-b border-white/8 text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3">Campeonato</th>
                  <th className="px-4 py-3">Plataforma</th>
                  <th className="px-4 py-3">Formato</th>
                  <th className="px-4 py-3">Calendario</th>
                  <th className="px-4 py-3">Vagas</th>
                  <th className="px-4 py-3">Operacao publica</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredChampionships.map((item) => (
                  <tr key={item.id} className="border-b border-white/8 text-sm last:border-b-0 hover:bg-white/5">
                    <td className="px-4 py-4 align-top">
                      <p className="text-xs uppercase tracking-[0.16em] text-primary">
                        {item.configuration.rankingName}
                      </p>
                      <p className="mt-2 font-semibold text-white">{item.name}</p>
                      <p className="mt-2 max-w-[320px] text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top text-muted-foreground">
                      {item.configuration.platform}
                    </td>
                    <td className="px-4 py-4 align-top text-muted-foreground">
                      {getFormatOption(item.configuration.format).label}
                    </td>
                    <td className="px-4 py-4 align-top text-muted-foreground">
                      {formatChampionshipDateRange(item.startDate, item.endDate)}
                    </td>
                    <td className="px-4 py-4 align-top text-muted-foreground">
                      {item.teamCount} jogadores
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex max-w-[260px] flex-wrap gap-2">
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-primary">
                          {getRegistrationLabel(item)}
                        </span>
                        <span className="rounded-full border border-electric/20 bg-electric/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-electric">
                          {getReportLabel(item)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <AdminStatusBadge label={item.status} tone={getStatusTone(item.status)} />
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/admin/campeonatos/${item.id}/editar`}>Editar</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/admin/campeonatos/${item.id}`}>Painel</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/admin/jogadores?championship=${item.id}`}>Jogadores</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/campeonatos/${item.id}`}>Publico</Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setChampionshipToRemove(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/8 bg-black/20 p-6">
            <p className="text-sm text-muted-foreground">
              Nenhum campeonato encontrado com os filtros atuais.
            </p>
            <div className="mt-4">
              <Button asChild>
                <Link to="/admin/campeonatos/novo">Criar primeiro campeonato</Link>
              </Button>
            </div>
          </div>
        )}
      </AdminTableCard>
      )}

      <AlertDialog
        open={Boolean(championshipToRemove)}
        onOpenChange={(open) => !open && setChampionshipToRemove(null)}
      >
        <AlertDialogContent className="border-white/10 bg-background text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campeonato</AlertDialogTitle>
            <AlertDialogDescription>
              {championshipToRemove
                ? `Voce esta prestes a remover ${championshipToRemove.name}. Essa acao afeta a grade administrativa e exige confirmacao.`
                : "Confirme a exclusao do campeonato selecionado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!championshipToRemove) {
                  return;
                }

                try {
                  await removeChampionship(championshipToRemove.id);
                  toast({
                    title: "Campeonato removido",
                    description: `${championshipToRemove.name} saiu da grade competitiva.`,
                  });
                } catch (error) {
                  toast({
                    title: "Falha ao remover",
                    description: formatChampionshipStoreError(error),
                    variant: "destructive",
                  });
                } finally {
                  setChampionshipToRemove(null);
                }
              }}
            >
              Confirmar exclusao
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
