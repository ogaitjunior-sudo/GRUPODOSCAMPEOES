import { useMemo, useState } from "react";
import { Eye, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
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
import { formatDateTime, normalizeSearch } from "@/admin/utils/format";

const inputClassName =
  "h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-muted-foreground";

const roleLabels: Record<string, string> = {
  player: "Jogador",
  captain: "Capitao",
  manager: "Manager",
  support_manager: "Suporte",
  operations_manager: "Operacoes",
  moderator: "Moderacao",
  super_admin: "Super admin",
};

export default function AdminUsersPage() {
  const { state, deleteUser, setUserStatus, upsertUser } = useAdminPanel();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "suspended">("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "player",
    status: "active" as "active" | "inactive" | "suspended",
  });

  const filteredUsers = useMemo(() => {
    const search = normalizeSearch(query);
    return state.users.filter((item) => {
      const matchesQuery =
        !search ||
        [item.name, item.email, item.role].join(" ").toLocaleLowerCase("pt-BR").includes(search);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, state.users, statusFilter]);

  const selectedUser = state.users.find((item) => item.id === selectedUserId) ?? null;

  const openCreate = () => {
    setEditingUserId(null);
    setForm({ name: "", email: "", role: "player", status: "active" });
    setIsFormOpen(true);
  };

  const openEdit = (id: string) => {
    const target = state.users.find((item) => item.id === id);
    if (!target) return;
    setEditingUserId(id);
    setForm({
      name: target.name,
      email: target.email,
      role: target.role,
      status: target.status,
    });
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Controle de acessos"
        title="Acessos"
        description="Gerencie operadores internos e contas de usuarios sem expor a camada administrativa na navegacao publica."
        actions={
          <Button onClick={openCreate} className="font-heading font-bold">
            <Plus className="h-4 w-4" />
            Novo acesso
          </Button>
        }
      />

      <AdminTableCard
        title="Base de acessos"
        description="Busque, filtre e mantenha contas usadas por jogadores e operadores da plataforma."
        filters={
          <>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome, e-mail ou papel"
              className={`${inputClassName} min-w-[240px] flex-1`}
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | "active" | "inactive" | "suspended")
              }
              className={`${inputClassName} min-w-[180px]`}
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="suspended">Suspensos</option>
            </select>
          </>
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="border-white/8 hover:bg-transparent">
              <TableHead>Usuario</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ultimo acesso</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((item) => (
              <TableRow key={item.id} className="border-white/8 hover:bg-white/5">
                <TableCell>
                  <div>
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{roleLabels[item.role] ?? item.role}</TableCell>
                <TableCell>
                  <AdminStatusBadge
                    label={item.status}
                    tone={
                      item.status === "active"
                        ? "success"
                        : item.status === "inactive"
                        ? "warning"
                        : "danger"
                    }
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.lastLoginAt ? formatDateTime(item.lastLoginAt) : "Ainda sem acesso"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedUserId(item.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(item.id)}>
                      <ShieldCheck className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserStatus(item.id, item.status === "active" ? "inactive" : "active")}
                    >
                      {item.status === "active" ? "Desativar" : "Ativar"}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteUser(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableCard>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="border-white/10 bg-background text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingUserId ? "Editar acesso" : "Novo acesso"}</DialogTitle>
            <DialogDescription>Formulario centralizado para contas, papeis e status do backoffice.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Nome completo"
              className={inputClassName}
            />
            <input
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="E-mail"
              className={inputClassName}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                className={inputClassName}
              >
                <option value="player">Jogador</option>
                <option value="captain">Capitao</option>
                <option value="manager">Manager</option>
                <option value="support_manager">Suporte</option>
                <option value="operations_manager">Operacoes</option>
                <option value="moderator">Moderacao</option>
                <option value="super_admin">Super admin</option>
              </select>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as "active" | "inactive" | "suspended",
                  }))
                }
                className={inputClassName}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="suspended">Suspenso</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                upsertUser({
                  id: editingUserId ?? undefined,
                  name: form.name,
                  email: form.email,
                  role: form.role as never,
                  status: form.status,
                });
                setIsFormOpen(false);
              }}
            >
              Salvar acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedUser)} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="border-white/10 bg-background text-white sm:max-w-2xl">
          {selectedUser ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-primary" />
                  {selectedUser.name}
                </DialogTitle>
                <DialogDescription>{selectedUser.email}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Papel</p>
                  <p className="mt-2 font-semibold text-white">{roleLabels[selectedUser.role] ?? selectedUser.role}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                  <div className="mt-2">
                    <AdminStatusBadge
                      label={selectedUser.status}
                      tone={
                        selectedUser.status === "active"
                          ? "success"
                          : selectedUser.status === "inactive"
                          ? "warning"
                          : "danger"
                      }
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Permissoes</p>
                  <p className="mt-2 font-semibold text-white">{selectedUser.permissions.length}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Historico de acoes</p>
                <div className="mt-4 space-y-3">
                  {selectedUser.history.length > 0 ? (
                    selectedUser.history.map((entry) => (
                      <article key={entry.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
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
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
