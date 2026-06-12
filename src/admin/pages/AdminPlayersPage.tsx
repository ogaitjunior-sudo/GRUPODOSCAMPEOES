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
import {
  adminSupabase,
  getPasswordRecoveryRedirectUrl,
  isSupabaseConfigured,
  isUsingLocalPasswordRecoveryRedirect,
  supabase,
} from "@/lib/supabase";
import {
  formatPlayerAccountsStoreError,
  listPlayerAccounts,
  type PlayerAccountRecord,
} from "@/lib/player-accounts-store";

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
  authUserId: string | null;
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

interface PasswordFormState {
  password: string;
  confirmPassword: string;
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
  playerAccounts: PlayerAccountRecord[],
  users: ReturnType<typeof useAdminPanel>["state"]["users"],
  players: ReturnType<typeof useAdminPanel>["state"]["players"],
  championships: ReturnType<typeof useChampionships>["championships"],
) {
  const directory = new Map<string, PlayerAdminRow>();

  players.forEach((player) => {
    const key = normalizeEmail(player.email) || player.id;

    directory.set(key, {
      key,
      id: player.id,
      authUserId: null,
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

  playerAccounts.forEach((account) => {
    const key = normalizeEmail(account.email) || account.id;

    const existing = directory.get(key);

    if (existing) {
      directory.set(key, {
        ...existing,
        authUserId: account.authUserId,
      });
      return;
    }

    directory.set(key, {
      key,
      id: account.id,
      authUserId: account.authUserId,
      name: account.name,
      email: account.email,
      platform: "Nao definido",
      status: "pending",
      linkedTeam: "Sem conta UT",
      createdAt: account.createdAt,
      participationHistoryCount: 0,
      championships: [],
    });
  });

  users
    .filter(
      (user) =>
        user.role === "player" ||
        user.role === "captain" ||
        user.role === "manager",
    )
    .forEach((user) => {
      const key = normalizeEmail(user.email) || user.id;

      if (directory.has(key)) {
        return;
      }

      directory.set(key, {
        key,
        id: user.id,
        authUserId: null,
        name: user.name,
        email: user.email,
        platform: "Nao definido",
        status: user.status === "suspended" ? "blocked" : "pending",
        linkedTeam: "Sem conta UT",
        createdAt: user.createdAt,
        participationHistoryCount: 0,
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
        authUserId: null,
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
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    password: "",
    confirmPassword: "",
  });
  const [isPasswordActionPending, setIsPasswordActionPending] = useState(false);
  const [playerAccounts, setPlayerAccounts] = useState<PlayerAccountRecord[]>([]);
  const [playerAccountsError, setPlayerAccountsError] = useState("");
  const [isLoadingPlayerAccounts, setIsLoadingPlayerAccounts] = useState(false);
  const [form, setForm] = useState<PlayerFormState>({
    name: "",
    email: "",
    platform: "PlayStation",
    status: "pending",
    linkedTeam: "Sem conta UT",
  });

  const rows = useMemo(
    () => buildPlayerRows(playerAccounts, state.users, state.players, championships),
    [championships, playerAccounts, state.players, state.users],
  );

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setChampionshipFilter(searchParams.get("championship") ?? "all");
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    const loadPlayerAccounts = async () => {
      setIsLoadingPlayerAccounts(true);

      try {
        const accounts = await listPlayerAccounts();

        if (!active) {
          return;
        }

        setPlayerAccounts(accounts);
        setPlayerAccountsError("");
      } catch (error) {
        if (!active) {
          return;
        }

        setPlayerAccounts([]);
        setPlayerAccountsError(formatPlayerAccountsStoreError(error));
      } finally {
        if (active) {
          setIsLoadingPlayerAccounts(false);
        }
      }
    };

    void loadPlayerAccounts();

    return () => {
      active = false;
    };
  }, []);

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
  const registeredAccesses = filteredRows.filter((item) => item.email.includes("@")).length;

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

  const openPasswordDialog = (row: PlayerAdminRow) => {
    setPasswordForm({ password: "", confirmPassword: "" });
    setPasswordResetTarget(row);
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

    setIsPasswordActionPending(true);

    try {
      const redirectTo = getPasswordRecoveryRedirectUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(row.email), {
        redirectTo,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Redefinicao enviada",
        description: isUsingLocalPasswordRecoveryRedirect()
          ? `Enviamos um link para ${row.email}. Como o painel esta em localhost, configure VITE_PUBLIC_SITE_URL para gerar links publicos.`
          : `Enviamos um link de redefinicao para ${row.email}.`,
      });
    } catch (error) {
      toast({
        title: "Falha ao enviar redefinicao",
        description: error instanceof Error ? error.message : "Nao foi possivel enviar o link agora.",
        variant: "destructive",
      });
    } finally {
      setIsPasswordActionPending(false);
      setPasswordResetTarget(null);
    }
  };

  const handlePasswordChange = async (row: PlayerAdminRow) => {
    const password = passwordForm.password.trim();

    if (!row.authUserId) {
      toast({
        title: "Conta de acesso nao localizada",
        description: "Este jogador nao possui um usuario do Supabase vinculado para alterar a senha.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Senha muito curta",
        description: "Use pelo menos 8 caracteres para a nova senha.",
        variant: "destructive",
      });
      return;
    }

    if (password !== passwordForm.confirmPassword.trim()) {
      toast({
        title: "Senhas diferentes",
        description: "A confirmacao precisa ser igual a nova senha.",
        variant: "destructive",
      });
      return;
    }

    if (!adminSupabase) {
      toast({
        title: "Supabase nao configurado",
        description: "A alteracao direta de senha exige uma sessao administrativa no Supabase.",
        variant: "destructive",
      });
      return;
    }

    setIsPasswordActionPending(true);

    try {
      const {
        data: { session },
      } = await adminSupabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sua sessao administrativa expirou. Entre novamente no painel.");
      }

      const response = await fetch("/api/admin-player-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authUserId: row.authUserId,
          password,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;

      if (!response.ok) {
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Nao foi possivel alterar a senha agora.",
        );
      }

      toast({
        title: "Senha alterada",
        description: `A nova senha de ${row.name} ja esta ativa.`,
      });

      setPasswordResetTarget(null);
      setPasswordForm({ password: "", confirmPassword: "" });
    } catch (error) {
      toast({
        title: "Falha ao alterar senha",
        description: error instanceof Error ? error.message : "Nao foi possivel alterar a senha agora.",
        variant: "destructive",
      });
    } finally {
      setIsPasswordActionPending(false);
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
          label="Acessos criados"
          value={registeredAccesses}
          helper="Pessoas que criaram conta no site."
          accent="electric"
        />
        <AdminMetricCard
          icon={ShieldCheck}
          label="Aprovados"
          value={approvedPlayers}
          helper="Jogadores liberados para competir."
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

      {playerAccountsError ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {playerAccountsError}
        </div>
      ) : null}

      <AdminTableCard
        title="Base administrativa de jogadores"
        description={
          isLoadingPlayerAccounts
            ? "Carregando cadastros criados no site..."
            : "Use filtros rapidos para localizar cadastros, revisar informacoes e abrir a ficha de cada jogador."
        }
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
                        onClick={() => openPasswordDialog(row)}
                        disabled={!row.email.includes("@")}
                        title="Alterar senha"
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

      <Dialog
        open={Boolean(passwordResetTarget)}
        onOpenChange={(open) => {
          if (!open && !isPasswordActionPending) {
            setPasswordResetTarget(null);
            setPasswordForm({ password: "", confirmPassword: "" });
          }
        }}
      >
        <DialogContent className="border-white/10 bg-background text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Alterar senha do jogador</DialogTitle>
            <DialogDescription>
              {passwordResetTarget
                ? `Defina uma nova senha para ${passwordResetTarget.name} ou envie um link de recuperacao para ${passwordResetTarget.email}.`
                : "Defina uma nova senha para o jogador."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <input
              type="password"
              value={passwordForm.password}
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Nova senha (minimo 8 caracteres)"
              autoComplete="new-password"
              className={inputClassName}
              disabled={isPasswordActionPending || !passwordResetTarget?.authUserId}
            />
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              placeholder="Confirmar nova senha"
              autoComplete="new-password"
              className={inputClassName}
              disabled={isPasswordActionPending || !passwordResetTarget?.authUserId}
            />
            {!passwordResetTarget?.authUserId ? (
              <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                A conta de autenticacao deste jogador nao foi localizada. Ainda e possivel enviar o
                link de recuperacao por e-mail.
              </p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (passwordResetTarget) {
                  void handlePasswordReset(passwordResetTarget);
                }
              }}
              disabled={isPasswordActionPending}
            >
              Enviar link
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPasswordResetTarget(null)}
                disabled={isPasswordActionPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (passwordResetTarget) {
                    void handlePasswordChange(passwordResetTarget);
                  }
                }}
                disabled={isPasswordActionPending || !passwordResetTarget?.authUserId}
              >
                {isPasswordActionPending ? "Salvando..." : "Alterar senha"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
