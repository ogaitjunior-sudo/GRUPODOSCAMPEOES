import { useMemo, useState } from "react";
import { Eye, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminPageHeader } from "@/admin/components/AdminPageHeader";
import { AdminStatusBadge } from "@/admin/components/AdminStatusBadge";
import { AdminTableCard } from "@/admin/components/AdminTableCard";
import { useAdminPanel } from "@/admin/context/AdminPanelContext";
import { normalizeSearch } from "@/admin/utils/format";

const inputClassName =
  "h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-muted-foreground";

export default function AdminTeamsPage() {
  const { state, deleteTeam, setTeamStatus, upsertTeam } = useAdminPanel();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    tag: "",
    captain: "",
    platform: "PlayStation" as "PlayStation" | "Xbox" | "PC",
    status: "pending" as "pending" | "approved" | "rejected",
    members: "",
    summary: "",
  });

  const filteredTeams = useMemo(() => {
    const search = normalizeSearch(query);
    return state.teams.filter((item) => {
      const matchesQuery =
        !search ||
        [item.name, item.tag, item.captain, item.platform].join(" ").toLocaleLowerCase("pt-BR").includes(search);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, state.teams, statusFilter]);

  const selectedTeam = state.teams.find((item) => item.id === selectedId) ?? null;

  const openEditor = (id: string) => {
    const target = state.teams.find((item) => item.id === id);
    if (!target) return;
    setEditingId(id);
    setForm({
      name: target.name,
      tag: target.tag,
      captain: target.captain,
      platform: target.platform,
      status: target.status,
      members: target.members.join(", "),
      summary: target.summary,
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Ownership e cadastro"
        title="Contas UT"
        description="Gerencie contas cadastradas, ownership, plataforma, aliases e qualidade da base usada pelos campeonatos X1."
      />

      <AdminTableCard
        title="Base de contas UT"
        description="Modulo central para aprovar, revisar e limpar contas usadas pelos jogadores no circuito."
        filters={
          <>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por conta, tag, responsavel ou plataforma"
              className={`${inputClassName} min-w-[240px] flex-1`}
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | "pending" | "approved" | "rejected")
              }
              className={inputClassName}
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovadas</option>
              <option value="rejected">Rejeitadas</option>
            </select>
          </>
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="border-white/8 hover:bg-transparent">
              <TableHead>Conta UT</TableHead>
              <TableHead>Responsavel</TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeams.map((item) => (
              <TableRow key={item.id} className="border-white/8 hover:bg-white/5">
                <TableCell>
                  <div>
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.tag}</p>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{item.captain}</TableCell>
                <TableCell className="text-muted-foreground">{item.platform}</TableCell>
                <TableCell>
                  <AdminStatusBadge
                    label={item.status}
                    tone={
                      item.status === "approved"
                        ? "success"
                        : item.status === "pending"
                        ? "warning"
                        : "danger"
                    }
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedId(item.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditor(item.id)}>
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setTeamStatus(item.id, item.status === "approved" ? "rejected" : "approved")
                      }
                    >
                      {item.status === "approved" ? "Reprovar" : "Aprovar"}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteTeam(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableCard>

      <Dialog open={Boolean(editingId)} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="border-white/10 bg-background text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar conta UT</DialogTitle>
            <DialogDescription>Revise ownership, aliases vinculados e status competitivo desta conta.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Nome da conta UT"
                className={inputClassName}
              />
              <input
                value={form.tag}
                onChange={(event) => setForm((current) => ({ ...current, tag: event.target.value }))}
                placeholder="Tag curta"
                className={inputClassName}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <input
                value={form.captain}
                onChange={(event) => setForm((current) => ({ ...current, captain: event.target.value }))}
                placeholder="Responsavel"
                className={inputClassName}
              />
              <select
                value={form.platform}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    platform: event.target.value as "PlayStation" | "Xbox" | "PC",
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
                    status: event.target.value as "pending" | "approved" | "rejected",
                  }))
                }
                className={inputClassName}
              >
                <option value="pending">Pendente</option>
                <option value="approved">Aprovada</option>
                <option value="rejected">Rejeitada</option>
              </select>
            </div>
            <input
              value={form.members}
              onChange={(event) => setForm((current) => ({ ...current, members: event.target.value }))}
              placeholder="Aliases ou perfis separados por virgula"
              className={inputClassName}
            />
            <textarea
              value={form.summary}
              onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
              placeholder="Resumo operacional da conta"
              className="min-h-[120px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-muted-foreground"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                upsertTeam({
                  id: editingId ?? undefined,
                  name: form.name,
                  tag: form.tag,
                  captain: form.captain,
                  platform: form.platform,
                  status: form.status,
                  members: form.members
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                  summary: form.summary,
                });
                setEditingId(null);
              }}
            >
              Salvar conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedTeam)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="border-white/10 bg-background text-white sm:max-w-2xl">
          {selectedTeam ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {selectedTeam.name}
                </DialogTitle>
                <DialogDescription>Tag {selectedTeam.tag}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Responsavel</p>
                  <p className="mt-2 font-semibold text-white">{selectedTeam.captain}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Plataforma</p>
                  <p className="mt-2 font-semibold text-white">{selectedTeam.platform}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Aliases</p>
                  <p className="mt-2 font-semibold text-white">{selectedTeam.members.length}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                  <div className="mt-2">
                    <AdminStatusBadge
                      label={selectedTeam.status}
                      tone={
                        selectedTeam.status === "approved"
                          ? "success"
                          : selectedTeam.status === "pending"
                          ? "warning"
                          : "danger"
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Resumo</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{selectedTeam.summary}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Perfis vinculados</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedTeam.members.map((member) => (
                    <span
                      key={member}
                      className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary"
                    >
                      {member}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
