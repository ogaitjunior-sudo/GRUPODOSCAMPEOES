import { useEffect, useMemo, useState } from "react";
import { Eye, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminMetricCard } from "@/admin/components/AdminMetricCard";
import { AdminPageHeader } from "@/admin/components/AdminPageHeader";
import { AdminStatusBadge } from "@/admin/components/AdminStatusBadge";
import { AdminTableCard } from "@/admin/components/AdminTableCard";
import { useAdminPanel } from "@/admin/context/AdminPanelContext";
import type { PlatformName, PlayerStatus } from "@/admin/types";
import { formatDateTime, normalizeSearch } from "@/admin/utils/format";
import { useChampionships } from "@/contexts/ChampionshipContext";
import { toast } from "@/hooks/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const inputClassName =
  "h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-muted-foreground";

type FilterPlatform = "all" | PlatformName | "Nao definido";
type FilterStatus = "all" | PlayerStatus;
type ChampionshipFilter = "all" | string;

interface PlayerChampionshipLink {
  championshipId: string;
  championshipName: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
}

interface PlayerAdminRow {
  key: string;
  id?: string;
  name: string;
  email: string;
  platform: PlatformName | "Nao definido";
  status: PlayerStatus;
  linkedTeam: string;
  createdAt: string;
  participationHistoryCount: number;
  championships: PlayerChampionshipLink[];
}

interface PlayerFormState {
  name: string;
  email: string;
  platform: PlatformName;
  status: PlayerStatus;
  linkedTeam: string;
}

interface PendingPlayerSave {
  payload: PlayerFormState;
  sensitiveChanged: boolean;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getPlayerStatusTone(status: PlayerStatus) {
  return status === "approved" ? "success" : status === "pending" ? "warning" : "danger";
}

function getRequestStatusTone(status: PlayerChampionshipLink["status"]) {
  return status === "approved" ? "success" : status === "pending" ? "warning" : "danger";
}

function buildPlayerRows(
  players: ReturnType<typeof useAdminPanel>["state"]["players"],
  championships: ReturnType<typeof useChampionships>["championships"],
) {
  const directory = new Map<string, PlayerAdminRow>();

  players.forEach((player) => {
    const key = normalizeEmail(player.email) || player.id;

    directory.set(key, {
      key,
      id: player.id,
      name: player.name,
      email: player.email,
      platform: player.platform,
      status: player.status,
      linkedTeam: player.linkedTeam,
      createdAt: player.createdAt,
      participationHistoryCount: player.participationHistory.length,
      championships: [],
    });
  });

  championships.forEach((championship) => {
    championship.registrationRequests.forEach((request) => {
      const key = normalizeEmail(request.playerEmail) || request.playerId;
      const existing = directory.get(key);
      const nextLink: PlayerChampionshipLink = {
        championshipId: championship.id,
        championshipName: championship.name,
        status: request.status,
        requestedAt: request.requestedAt,
      };

      if (existing) {
        const alreadyLinked = existing.championships.some(
          (item) => item.championshipId === championship.id,
        );

        directory.set(key, {
          ...existing,
          championships: alreadyLinked ? existing.championships : [nextLink, ...existing.championships],
        });
        return;
      }

      directory.set(key, {
        key,
        name: request.playerName,
        email: request.playerEmail,
        platform: "Nao definido",
        status: request.status === "approved" ? "approved" : "pending",
        linkedTeam: "Sem conta UT",
        createdAt: request.requestedAt,
        participationHistoryCount: 0,
        championships: [nextLink],
      });
    });
  });

  return Array.from(directory.values()).sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

export default function AdminPlayersPage() {
  const [searchParams] = useSearchParams();
  const { state, upsertPlayer } = useAdminPanel();
  const { championships } = useChampionships();
  const [query, setQuery] = useState("");
  const [championshipFilter, setChampionshipFilter] = useState<ChampionshipFilter>("all");
  const [platformFilter, setPlatformFilter] = useState<FilterPlatform>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [pendingSave, setPendingSave] = useState<PendingPlayerSave | null>(null);
  const [passwordResetTarget, setPasswordResetTarget] = useState<PlayerAdminRow | null>(null);
  const [form, setForm] = useState<PlayerFormState>({
    name: "",
    email: "",
    platform: "PlayStation",
    status: "pending",
    linkedTeam: "Sem conta UT",
  });

  const rows = useMemo(() => buildPlayerRows(state.players, championships), [championships, state.players]);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setChampionshipFilter(searchParams.get("championship") ?? "all");
  }, [searchParams]);

  const championshipOptions = useMemo(
    () =>
      championships
        .filter((item) => item.registrationRequests.length > 0)
        .map((item) => ({ id: item.id, name: item.name })),
    [championships],
  );

  const filteredRows = useMemo(() => {
    const search = normalizeSearch(query);

    return rows.filter((row) => {
      const matchesQuery =
        !search ||
        [
          row.name,
          row.email,
          row.linkedTeam,
          row.platform,
          ...row.championships.map((item) => item.championshipName),
        ]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(search);

      const matchesChampionship =
        championshipFilter === "all" ||
        row.championships.some((item) => item.championshipId === championshipFilter);

      const matchesPlatform = platformFilter === "all" || row.platform === platformFilter;
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;

      return matchesQuery && matchesChampionship && matchesPlatform && matchesStatus;
    });
  }, [championshipFilter, platformFilter, query, rows, statusFilter]);

  const selectedRow = filteredRows.find((item) => item.key === selectedKey) ?? rows.find((item) => item.key === selectedKey) ?? null;
  const editingRow = rows.find((item) => item.key === editingKey) ?? null;
  const selectedChampionship =
    championshipFilter === "all"
      ? null
      : championships.find((item) => item.id === championshipFilter) ?? null;

  const pendingPlayers = filteredRows.filter((item) => item.status === "pending").length;
  const linkedToChampionships = filteredRows.filter((item) => item.championships.length > 0).length;
  const approvedPlayers = filteredRows.filter((item) => item.status === "approved").length;

  const openEditor = (row: PlayerAdminRow) => {
    setEditingKey(row.key);
    setForm({
      name: row.name,
      email: row.email,
      platform: row.platform === "Nao definido" ? "PlayStation" : row.platform,
      status: row.status,
      linkedTeam: row.linkedTeam,
    });
  };

  const submitPlayerUpdate = () => {
    if (!editingRow) {
      return;
    }

    setPendingSave({
      payload: form,
      sensitiveChanged:
        editingRow.name.trim() !== form.name.trim() ||
        normalizeEmail(editingRow.email) !== normalizeEmail(form.email),
    });
  };

  const handlePasswordReset = async (row: PlayerAdminRow) => {
    if (!isSupabaseConfigured || !supabase) {
      toast({
        title: "Supabase nao configurado",
        description: "Configure o fluxo de autenticacao real para enviar redefinicoes de senha.",
        variant: "destructive",
      });
      return;
    }

    try {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/recuperar-senha` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(row.email), {
        redirectTo,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Redefinicao enviada",
        description: `Enviamos um link de redefinicao para ${row.email}.`,
      });
    } catch (error) {
      toast({
        title: "Falha ao enviar redefinicao",
        description: error instanceof Error ? error.message : "Nao foi possivel enviar o link agora.",
        variant: "destructive",
      });
    } finally {
      setPasswordResetTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Gestao de jogadores"
        title="Jogadores cadastrados"
        description="Busque jogadores por nome, e-mail ou campeonato, revise dados competitivos e execute acoes administrativas com confirmacao."
        actions={
          selectedChampionship ? (
            <Button asChild variant="outline">
              <Link to="/admin/jogadores">Limpar filtro de campeonato</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          icon={UserRound}
          label="Jogadores visiveis"
          value={filteredRows.length}
          helper="Base exibida com os filtros atuais."
        />
        <AdminMetricCard
          icon={ShieldCheck}
          label="Aprovados"
          value={approvedPlayers}
          helper="Jogadores liberados para competir."
          accent="electric"
        />
        <AdminMetricCard
          icon={UserRound}
          label="Pendentes"
          value={pendingPlayers}
          helper="Cadastros que ainda pedem revisao."
        />
        <AdminMetricCard
          icon={ShieldCheck}
          label="Em campeonatos"
          value={linkedToChampionships}
          helper="Jogadores com solicitacao ou vinculo em eventos."
          accent="electric"
        />
      </div>

      {selectedChampionship ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          Exibindo jogadores vinculados a <strong>{selectedChampionship.name}</strong>.
        </div>
      ) : null}

      <AdminTableCard
        title="Base administrativa de jogadores"
        description="Use filtros rapidos para localizar cadastros, revisar informacoes e abrir a ficha de cada jogador."
        filters={
          <>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome, e-mail, time ou campeonato"
              className={`${inputClassName} min-w-[240px] flex-1`}
            />
            <select
              value={championshipFilter}
              onChange={(event) => setChampionshipFilter(event.target.value)}
              className={inputClassName}
            >
              <option value="all">Todos os campeonatos</option>
              {championshipOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              value={platformFilter}
              onChange={(event) => setPlatformFilter(event.target.value as FilterPlatform)}
              className={inputClassName}
            >
              <option value="all">Todas as plataformas</option>
              <option value="PlayStation">PlayStation</option>
              <option value="Xbox">Xbox</option>
              <option value="PC">PC</option>
              <option value="Nao definido">Nao definido</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as FilterStatus)}
              className={inputClassName}
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovados</option>
              <option value="blocked">Bloqueados</option>
            </select>
          </>
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="border-white/8 hover:bg-transparent">
              <TableHead>Jogador</TableHead>
              <TableHead>Campeonatos</TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => (
                <TableRow key={row.key} className="border-white/8 hover:bg-white/5">
                  <TableCell>
                    <div>
                      <p className="font-semibold text-white">{row.name}</p>
                      <p className="text-sm text-muted-foreground">{row.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.championships.length > 0 ? (
                      <div className="flex max-w-[280px] flex-wrap gap-2">
                        {row.championships.slice(0, 2).map((item) => (
                          <span
                            key={`${row.key}-${item.championshipId}`}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
                          >
                            {item.championshipName}
                          </span>
                        ))}
                        {row.championships.length > 2 ? (
                          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-primary">
                            +{row.championships.length - 2}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sem vinculo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.platform}</TableCell>
                  <TableCell>
                    <AdminStatusBadge label={row.status} tone={getPlayerStatusTone(row.status)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedKey(row.key)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditor(row)}>
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPasswordResetTarget(row)}
                        disabled={!row.email.includes("@")}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="border-white/8">
                <TableCell colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum jogador encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AdminTableCard>

      <Dialog open={Boolean(editingKey)} onOpenChange={(open) => !open && setEditingKey(null)}>
        <DialogContent className="border-white/10 bg-background text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar jogador</DialogTitle>
            <DialogDescription>
              Atualize os dados competitivos e confirme antes de salvar alteracoes sensiveis.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Nome do jogador"
                className={inputClassName}
              />
              <input
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="E-mail da conta"
                className={inputClassName}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <select
                value={form.platform}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    platform: event.target.value as PlatformName,
                  }))
                }
                className={inputClassName}
              >
                <option value="PlayStation">PlayStation</option>
                <option value="Xbox">Xbox</option>
                <option value="PC">PC</option>
              </select>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as PlayerStatus,
                  }))
                }
                className={inputClassName}
              >
                <option value="pending">Pendente</option>
                <option value="approved">Aprovado</option>
                <option value="blocked">Bloqueado</option>
              </select>
              <input
                value={form.linkedTeam}
                onChange={(event) =>
                  setForm((current) => ({ ...current, linkedTeam: event.target.value }))
                }
                placeholder="Conta UT vinculada"
                className={inputClassName}
              />
            </div>

            <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-muted-foreground">
              O ADM pode corrigir nome e e-mail do cadastro. Para senha, use o fluxo seguro de redefinicao e mantenha alteracoes criticas com confirmacao.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingKey(null)}>
              Cancelar
            </Button>
            <Button onClick={submitPlayerUpdate}>Salvar alteracoes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedKey(null)}>
        <DialogContent className="border-white/10 bg-background text-white sm:max-w-3xl">
          {selectedRow ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-primary" />
                  {selectedRow.name}
                </DialogTitle>
                <DialogDescription>{selectedRow.email}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Plataforma</p>
                  <p className="mt-2 font-semibold text-white">{selectedRow.platform}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                  <div className="mt-2">
                    <AdminStatusBadge
                      label={selectedRow.status}
                      tone={getPlayerStatusTone(selectedRow.status)}
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Conta UT</p>
                  <p className="mt-2 font-semibold text-white">{selectedRow.linkedTeam}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cadastro</p>
                  <p className="mt-2 font-semibold text-white">{formatDateTime(selectedRow.createdAt)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Campeonatos vinculados</p>
                <div className="mt-4 space-y-3">
                  {selectedRow.championships.length > 0 ? (
                    selectedRow.championships.map((item) => (
                      <article key={`${selectedRow.key}-${item.championshipId}`} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{item.championshipName}</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Solicitado em {formatDateTime(item.requestedAt)}
                            </p>
                          </div>
                          <AdminStatusBadge
                            label={item.status}
                            tone={getRequestStatusTone(item.status)}
                          />
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem campeonatos vinculados no momento.</p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingSave)} onOpenChange={(open) => !open && setPendingSave(null)}>
        <AlertDialogContent className="border-white/10 bg-background text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteracoes do jogador</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSave?.sensitiveChanged
                ? "Voce esta alterando dados sensiveis do cadastro administrativo. Revise as informacoes antes de confirmar."
                : "Confirme a atualizacao dos dados competitivos do jogador selecionado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingSave || !editingRow) {
                  return;
                }

                upsertPlayer({
                  id: editingRow.id,
                  name: pendingSave.payload.name,
                  email: pendingSave.payload.email,
                  platform: pendingSave.payload.platform,
                  status: pendingSave.payload.status,
                  linkedTeam: pendingSave.payload.linkedTeam,
                  isVerified: pendingSave.payload.status === "approved",
                });

                toast({
                  title: "Jogador atualizado",
                  description: `${pendingSave.payload.name} foi atualizado no painel administrativo.`,
                });

                setPendingSave(null);
                setEditingKey(null);
              }}
            >
              Confirmar alteracoes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(passwordResetTarget)}
        onOpenChange={(open) => !open && setPasswordResetTarget(null)}
      >
        <AlertDialogContent className="border-white/10 bg-background text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar redefinicao de senha</AlertDialogTitle>
            <AlertDialogDescription>
              {passwordResetTarget
                ? `Deseja enviar um link de redefinicao para ${passwordResetTarget.email}? O jogador recebera o fluxo de recuperacao no e-mail cadastrado.`
                : "Confirme o envio da redefinicao de senha."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (passwordResetTarget) {
                  void handlePasswordReset(passwordResetTarget);
                }
              }}
            >
              Enviar link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
