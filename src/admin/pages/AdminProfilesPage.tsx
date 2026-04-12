import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Image as ImageIcon,
  Link2,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AdminMetricCard } from "@/admin/components/AdminMetricCard";
import { AdminPageHeader } from "@/admin/components/AdminPageHeader";
import { AdminSectionCard } from "@/admin/components/AdminSectionCard";
import { AdminStatusBadge } from "@/admin/components/AdminStatusBadge";
import { useAdminPanel } from "@/admin/context/AdminPanelContext";
import { formatDateTime, normalizeSearch } from "@/admin/utils/format";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { cn } from "@/lib/utils";

type ProfileTab = "acesso" | "jogador" | "conta" | "midias";

interface UnifiedProfile {
  id: string;
  name: string;
  email: string;
  user: ReturnType<typeof useAdminPanel>["state"]["users"][number] | null;
  player: ReturnType<typeof useAdminPanel>["state"]["players"][number] | null;
  team: ReturnType<typeof useAdminPanel>["state"]["teams"][number] | null;
  relatedRequests: ReturnType<typeof useAdminPanel>["state"]["imageRequests"];
  needsAttention: boolean;
}

const inputClassName =
  "h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-muted-foreground";

const tabLabels: Record<ProfileTab, string> = {
  acesso: "Acesso",
  jogador: "Jogador UT",
  conta: "Conta UT",
  midias: "Midias",
};

function buildProfiles(state: ReturnType<typeof useAdminPanel>["state"]): UnifiedProfile[] {
  const profiles = new Map<string, UnifiedProfile>();

  const ensureProfile = (key: string, base: Pick<UnifiedProfile, "id" | "name" | "email">) => {
    if (!profiles.has(key)) {
      profiles.set(key, {
        ...base,
        user: null,
        player: null,
        team: null,
        relatedRequests: [],
        needsAttention: false,
      });
    }

    return profiles.get(key)!;
  };

  state.users.forEach((user) => {
    const profile = ensureProfile(user.email || `user:${user.id}`, {
      id: user.id,
      name: user.name,
      email: user.email,
    });
    profile.user = user;
    profile.name = user.name;
    profile.email = user.email;
  });

  state.players.forEach((player) => {
    const profile = ensureProfile(player.email || `player:${player.id}`, {
      id: player.id,
      name: player.name,
      email: player.email,
    });
    profile.player = player;
    if (!profile.user) {
      profile.name = player.name;
      profile.email = player.email;
    }
  });

  state.teams.forEach((team) => {
    const linkedPlayer = state.players.find((player) => player.linkedTeam === team.name);
    const key = linkedPlayer?.email ?? `team:${team.id}`;
    const profile = ensureProfile(key, {
      id: linkedPlayer?.id ?? team.id,
      name: linkedPlayer?.name ?? team.name,
      email: linkedPlayer?.email ?? "",
    });
    profile.team = team;
  });

  profiles.forEach((profile) => {
    const requestNames = [profile.user?.name, profile.player?.name, profile.team?.name].filter(Boolean);
    profile.relatedRequests = state.imageRequests.filter((request) => requestNames.includes(request.requesterName));
    profile.needsAttention = Boolean(
      profile.user?.status === "inactive" ||
        profile.user?.status === "suspended" ||
        profile.player?.status === "pending" ||
        profile.player?.status === "blocked" ||
        profile.team?.status === "pending" ||
        profile.team?.status === "rejected" ||
        profile.relatedRequests.some((request) => request.status === "pending"),
    );
  });

  return Array.from(profiles.values()).sort((left, right) => {
    if (left.needsAttention !== right.needsAttention) {
      return left.needsAttention ? -1 : 1;
    }

    return left.name.localeCompare(right.name, "pt-BR");
  });
}

function getUserTone(status?: string) {
  if (status === "active") return "success";
  if (status === "inactive") return "warning";
  return "danger";
}

function getPlayerTone(status?: string) {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  return "danger";
}

function getTeamTone(status?: string) {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  return "danger";
}

function getImageTone(status: string) {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  return "danger";
}

export default function AdminProfilesPage() {
  const { state, moderateImageRequest, setPlayerStatus, setTeamStatus, setUserStatus } = useAdminPanel();
  const { hasPermission } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "attention" | "approved" | "admins">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const profiles = useMemo(() => buildProfiles(state), [state]);
  const availableTabs = useMemo(
    () =>
      ([
        { value: "acesso", visible: hasPermission("users:view") },
        { value: "jogador", visible: hasPermission("players:view") },
        { value: "conta", visible: hasPermission("teams:view") },
        { value: "midias", visible: hasPermission("images:view") },
      ] as { value: ProfileTab; visible: boolean }[]).filter((item) => item.visible),
    [hasPermission],
  );
  const defaultTab = availableTabs[0]?.value ?? "acesso";
  const currentTab = (searchParams.get("tab") as ProfileTab) || defaultTab;
  const tab = availableTabs.some((item) => item.value === currentTab) ? currentTab : defaultTab;

  const filteredProfiles = useMemo(() => {
    const search = normalizeSearch(query);
    return profiles.filter((profile) => {
      const matchesSearch =
        !search ||
        [
          profile.name,
          profile.email,
          profile.user?.role,
          profile.player?.platform,
          profile.player?.linkedTeam,
          profile.team?.tag,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(search);

      if (!matchesSearch) {
        return false;
      }

      if (filter === "attention") {
        return profile.needsAttention;
      }

      if (filter === "approved") {
        return profile.player?.status === "approved" || profile.team?.status === "approved";
      }

      if (filter === "admins") {
        return Boolean(profile.user && profile.user.permissions.length > 0);
      }

      return true;
    });
  }, [filter, profiles, query]);

  useEffect(() => {
    if (!filteredProfiles.length) {
      setSelectedId(null);
      return;
    }

    const stillExists = filteredProfiles.some((profile) => profile.id === selectedId);
    if (!selectedId || !stillExists) {
      setSelectedId(filteredProfiles[0].id);
    }
  }, [filteredProfiles, selectedId]);

  useEffect(() => {
    if (tab !== currentTab) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", tab);
      setSearchParams(next, { replace: true });
    }
  }, [currentTab, searchParams, setSearchParams, tab]);

  const selectedProfile = filteredProfiles.find((profile) => profile.id === selectedId) ?? filteredProfiles[0] ?? null;
  const profilesWithAttention = profiles.filter((profile) => profile.needsAttention).length;
  const accessAttention = profiles.filter(
    (profile) => profile.user?.status === "inactive" || profile.user?.status === "suspended",
  ).length;
  const playerAttention = profiles.filter(
    (profile) => profile.player?.status === "pending" || profile.player?.status === "blocked",
  ).length;
  const teamAttention = profiles.filter(
    (profile) => profile.team?.status === "pending" || profile.team?.status === "rejected",
  ).length;
  const mediaAttention = profiles.filter((profile) =>
    profile.relatedRequests.some((request) => request.status === "pending"),
  ).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Hub de perfis"
        title="Perfis"
        description="Acesso, jogador, conta UT e midias ficam juntos no mesmo lugar para reduzir menu, ruido e troca de contexto."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          icon={UserCog}
          label="Perfis monitorados"
          value={profiles.length}
          helper="Base unificada entre acesso, jogador e conta UT."
        />
        <AdminMetricCard
          icon={ShieldCheck}
          label="Jogadores aprovados"
          value={state.players.filter((item) => item.status === "approved").length}
          helper="Perfis competitivos liberados para jogar."
          accent="electric"
        />
        <AdminMetricCard
          icon={Users}
          label="Contas UT ativas"
          value={state.teams.filter((item) => item.status === "approved").length}
          helper="Contas aptas para check-in, sorteios e reports."
        />
        <AdminMetricCard
          icon={ImageIcon}
          label="Perfis com pendencia"
          value={profilesWithAttention}
          helper="Qualquer bloqueio de status, aprovacao ou midia."
          accent="danger"
        />
      </div>

      <AdminSectionCard
        title="Fila de perfis"
        description="Leitura rapida das pendencias por tipo para reduzir troca de contexto no modulo."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <QueueCard title="Acessos" value={accessAttention} helper="Contas internas com restricao ou sem liberacao." />
          <QueueCard title="Jogadores" value={playerAttention} helper="Perfis competitivos aguardando aprovacao ou revisao." />
          <QueueCard title="Contas UT" value={teamAttention} helper="Vinculos e aprovacoes que ainda pedem decisao." />
          <QueueCard title="Midias" value={mediaAttention} helper="Solicitacoes pendentes no perfil ou na conta UT." />
        </div>
      </AdminSectionCard>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.3fr]">
        <AdminSectionCard
          title="Lista de perfis"
          description="Selecione um perfil para ver acesso, jogador, conta UT e midias relacionadas."
        >
          <div className="space-y-4">
            <div className="grid gap-3">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome, email, plataforma ou conta UT"
                className={inputClassName}
              />
              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as "all" | "attention" | "approved" | "admins")
                }
                className={inputClassName}
              >
                <option value="all">Todos os perfis</option>
                <option value="attention">Com pendencias</option>
                <option value="approved">Aprovados</option>
                <option value="admins">Somente operacao</option>
              </select>
            </div>

            <div className="space-y-3">
              {filteredProfiles.length > 0 ? (
                filteredProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedId(profile.id)}
                    className={cn(
                      "w-full rounded-[24px] border px-4 py-4 text-left transition-all",
                      profile.id === selectedProfile?.id
                        ? "border-primary/20 bg-primary/10"
                        : "border-white/8 bg-black/20 hover:border-white/20 hover:bg-white/5",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{profile.name}</p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {profile.email || profile.team?.name || "Perfil sem e-mail vinculado"}
                        </p>
                      </div>
                      {profile.needsAttention ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground">
                          revisar
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {profile.user ? (
                        <AdminStatusBadge label={profile.user.role} tone={getUserTone(profile.user.status)} />
                      ) : null}
                      {profile.player ? (
                        <AdminStatusBadge label={profile.player.platform} tone={getPlayerTone(profile.player.status)} />
                      ) : null}
                      {profile.team ? (
                        <AdminStatusBadge label={profile.team.name} tone={getTeamTone(profile.team.status)} />
                      ) : null}
                      {profile.relatedRequests.some((request) => request.status === "pending") ? (
                        <AdminStatusBadge label="midia pendente" tone="warning" />
                      ) : null}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[24px] border border-white/8 bg-black/20 p-4 text-sm text-muted-foreground">
                  Nenhum perfil encontrado com os filtros atuais.
                </div>
              )}
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title={selectedProfile ? selectedProfile.name : "Perfil"}
          description={
            selectedProfile
              ? "Tudo que antes estava espalhado em menus diferentes agora fica reunido neste perfil."
              : "Selecione um perfil para continuar."
          }
        >
          {selectedProfile ? (
            <div className="space-y-5">
              <div className="rounded-[24px] border border-primary/15 bg-primary/8 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Proximo passo</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <ActionTile
                    label="Acesso"
                    helper={
                      selectedProfile.user
                        ? selectedProfile.user.status === "active"
                          ? "Acesso operacional sem bloqueio."
                          : "Existe pendencia de status no acesso."
                        : "Este perfil ainda nao tem acesso vinculado."
                    }
                    tone={
                      selectedProfile.user?.status === "active"
                        ? "neutral"
                        : "warning"
                    }
                  />
                  <ActionTile
                    label="Jogador"
                    helper={
                      selectedProfile.player
                        ? selectedProfile.player.status === "approved"
                          ? "Perfil competitivo pronto para competir."
                          : "Jogador pedindo revisao operacional."
                        : "Perfil competitivo ainda nao criado."
                    }
                    tone={
                      selectedProfile.player?.status === "approved"
                        ? "neutral"
                        : "warning"
                    }
                  />
                  <ActionTile
                    label="Conta UT"
                    helper={
                      selectedProfile.team
                        ? selectedProfile.team.status === "approved"
                          ? "Conta UT apta para uso."
                          : "Conta UT pendente ou rejeitada."
                        : "Nenhuma conta vinculada ainda."
                    }
                    tone={
                      selectedProfile.team?.status === "approved"
                        ? "neutral"
                        : "warning"
                    }
                  />
                  <ActionTile
                    label="Midias"
                    helper={
                      selectedProfile.relatedRequests.some((request) => request.status === "pending")
                        ? "Existem arquivos esperando moderacao."
                        : "Sem pendencias de midia no momento."
                    }
                    tone={
                      selectedProfile.relatedRequests.some((request) => request.status === "pending")
                        ? "warning"
                        : "neutral"
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Acesso</p>
                  <p className="mt-2 font-semibold text-white">
                    {selectedProfile.user ? selectedProfile.user.name : "Sem acesso"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedProfile.user ? selectedProfile.user.status : "Nao vinculado"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Jogador UT</p>
                  <p className="mt-2 font-semibold text-white">
                    {selectedProfile.player ? selectedProfile.player.platform : "Sem perfil competitivo"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedProfile.player ? selectedProfile.player.status : "Nao cadastrado"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Conta UT</p>
                  <p className="mt-2 font-semibold text-white">
                    {selectedProfile.team ? selectedProfile.team.name : "Sem conta"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedProfile.team ? selectedProfile.team.status : "Nao vinculada"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Midias</p>
                  <p className="mt-2 font-semibold text-white">{selectedProfile.relatedRequests.length}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedProfile.relatedRequests.filter((request) => request.status === "pending").length} pendentes
                  </p>
                </div>
              </div>

              <Tabs
                value={tab}
                onValueChange={(value) => {
                  const next = new URLSearchParams(searchParams);
                  next.set("tab", value);
                  setSearchParams(next, { replace: true });
                }}
                className="space-y-4"
              >
                <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl bg-white/5 p-2 text-muted-foreground">
                  {availableTabs.map((item) => (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className="rounded-xl border border-transparent px-4 py-2 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                    >
                      {tabLabels[item.value]}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="acesso" className="mt-0">
                  {selectedProfile.user ? (
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-4">
                        <InfoCard label="Papel" value={selectedProfile.user.role} />
                        <InfoCard
                          label="Status"
                          valueNode={
                            <AdminStatusBadge label={selectedProfile.user.status} tone={getUserTone(selectedProfile.user.status)} />
                          }
                        />
                        <InfoCard label="Criado em" value={formatDateTime(selectedProfile.user.createdAt)} />
                        <InfoCard
                          label="Ultimo acesso"
                          value={selectedProfile.user.lastLoginAt ? formatDateTime(selectedProfile.user.lastLoginAt) : "Sem acesso"}
                        />
                      </div>

                      {hasPermission("users:manage") ? (
                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant="outline"
                            onClick={() =>
                              setUserStatus(
                                selectedProfile.user!.id,
                                selectedProfile.user!.status === "active" ? "inactive" : "active",
                              )
                            }
                          >
                            {selectedProfile.user.status === "active" ? "Desativar acesso" : "Ativar acesso"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              setUserStatus(
                                selectedProfile.user!.id,
                                selectedProfile.user!.status === "suspended" ? "active" : "suspended",
                              )
                            }
                          >
                            {selectedProfile.user.status === "suspended" ? "Remover suspensao" : "Suspender"}
                          </Button>
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Historico do acesso</p>
                        <div className="mt-4 space-y-3">
                          {selectedProfile.user.history.length > 0 ? (
                            selectedProfile.user.history.map((entry) => (
                              <article key={entry.id} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                                <p className="font-semibold text-white">{entry.action}</p>
                                <p className="mt-2 text-sm text-muted-foreground">{entry.description}</p>
                                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  {entry.actor} • {formatDateTime(entry.at)}
                                </p>
                              </article>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">Nenhuma acao registrada para este acesso.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <EmptyProfileBlock message="Este perfil ainda nao tem um acesso vinculado." />
                  )}
                </TabsContent>

                <TabsContent value="jogador" className="mt-0">
                  {selectedProfile.player ? (
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-4">
                        <InfoCard label="Plataforma" value={selectedProfile.player.platform} />
                        <InfoCard
                          label="Status"
                          valueNode={
                            <AdminStatusBadge
                              label={selectedProfile.player.status}
                              tone={getPlayerTone(selectedProfile.player.status)}
                            />
                          }
                        />
                        <InfoCard label="Conta UT" value={selectedProfile.player.linkedTeam} />
                        <InfoCard label="Criado em" value={formatDateTime(selectedProfile.player.createdAt)} />
                      </div>

                      {hasPermission("players:manage") ? (
                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant="outline"
                            onClick={() =>
                              setPlayerStatus(
                                selectedProfile.player!.id,
                                selectedProfile.player!.status === "approved" ? "blocked" : "approved",
                              )
                            }
                          >
                            {selectedProfile.player.status === "approved" ? "Bloquear jogador" : "Aprovar jogador"}
                          </Button>
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Historico competitivo</p>
                        <div className="mt-4 space-y-3">
                          {selectedProfile.player.participationHistory.length > 0 ? (
                            selectedProfile.player.participationHistory.map((entry) => (
                              <article key={entry.id} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                                <p className="font-semibold text-white">{entry.competition}</p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {entry.stage} • {entry.result}
                                </p>
                                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  {formatDateTime(entry.playedAt)}
                                </p>
                              </article>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">Sem participacoes oficiais registradas ainda.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <EmptyProfileBlock message="Este acesso ainda nao ganhou um perfil competitivo de jogador." />
                  )}
                </TabsContent>

                <TabsContent value="conta" className="mt-0">
                  {selectedProfile.team ? (
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-4">
                        <InfoCard label="Conta" value={selectedProfile.team.name} />
                        <InfoCard label="Plataforma" value={selectedProfile.team.platform} />
                        <InfoCard
                          label="Status"
                          valueNode={
                            <AdminStatusBadge
                              label={selectedProfile.team.status}
                              tone={getTeamTone(selectedProfile.team.status)}
                            />
                          }
                        />
                        <InfoCard label="Aliases" value={selectedProfile.team.members.length} />
                      </div>

                      {hasPermission("teams:manage") ? (
                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant="outline"
                            onClick={() =>
                              setTeamStatus(
                                selectedProfile.team!.id,
                                selectedProfile.team!.status === "approved" ? "rejected" : "approved",
                              )
                            }
                          >
                            {selectedProfile.team.status === "approved" ? "Reprovar conta UT" : "Aprovar conta UT"}
                          </Button>
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Resumo operacional</p>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">{selectedProfile.team.summary}</p>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Perfis vinculados</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {selectedProfile.team.members.map((member) => (
                            <span
                              key={member}
                              className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary"
                            >
                              {member}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <EmptyProfileBlock message="Ainda nao existe uma conta UT vinculada a este perfil." />
                  )}
                </TabsContent>

                <TabsContent value="midias" className="mt-0">
                  {selectedProfile.relatedRequests.length > 0 ? (
                    <div className="space-y-3">
                      {selectedProfile.relatedRequests.map((request) => (
                        <article key={request.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-white">{request.requesterName}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {request.requesterType} • {formatDateTime(request.submittedAt)}
                              </p>
                            </div>
                            <AdminStatusBadge label={request.status} tone={getImageTone(request.status)} />
                          </div>

                          {request.moderationHistory[0]?.reason ? (
                            <p className="mt-3 text-sm text-muted-foreground">
                              Ultimo motivo: {request.moderationHistory[0].reason}
                            </p>
                          ) : null}

                          {request.status === "pending" && hasPermission("images:moderate") ? (
                            <div className="mt-4 flex flex-wrap gap-3">
                              <Button variant="outline" onClick={() => moderateImageRequest(request.id, "approved")}>
                                Aprovar imagem
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() =>
                                  moderateImageRequest(
                                    request.id,
                                    "rejected",
                                    "Rejeitado na triagem interna do perfil.",
                                  )
                                }
                              >
                                Rejeitar
                              </Button>
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyProfileBlock message="Nenhuma solicitacao de midia relacionada a este perfil." />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-6 text-sm text-muted-foreground">
              Nenhum perfil disponivel com os filtros atuais.
            </div>
          )}
        </AdminSectionCard>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  valueNode,
}: {
  label: string;
  value?: string | number;
  valueNode?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      {valueNode ? (
        <div className="mt-2">{valueNode}</div>
      ) : (
        <p className="mt-2 font-semibold text-white">{value}</p>
      )}
    </div>
  );
}

function QueueCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <p className="mt-3 font-heading text-3xl text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{helper}</p>
    </div>
  );
}

function ActionTile({
  label,
  helper,
  tone,
}: {
  label: string;
  helper: string;
  tone: "neutral" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "warning"
          ? "border-primary/20 bg-primary/10"
          : "border-white/8 bg-white/5",
      )}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-white">{helper}</p>
    </div>
  );
}

function EmptyProfileBlock({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-black/20 p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/5 text-electric">
          <Link2 className="h-4 w-4" />
        </span>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
