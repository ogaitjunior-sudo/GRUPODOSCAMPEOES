import { useMemo, useState } from "react";
import { Check, Eye, X } from "lucide-react";
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

const requesterTypeLabel: Record<string, string> = {
  user: "Acesso",
  player: "Jogador",
  team: "Conta UT",
};

export default function AdminImageRequestsPage() {
  const { state, moderateImageRequest } = useAdminPanel();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "user" | "player" | "team">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const filteredRequests = useMemo(() => {
    const search = normalizeSearch(query);
    return state.imageRequests.filter((item) => {
      const matchesQuery =
        !search ||
        [item.requesterName, item.requesterType].join(" ").toLocaleLowerCase("pt-BR").includes(search);
      const matchesType = typeFilter === "all" || item.requesterType === typeFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesQuery && matchesType && matchesStatus;
    });
  }, [query, state.imageRequests, statusFilter, typeFilter]);

  const selectedRequest = state.imageRequests.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Moderacao visual"
        title="Midias"
        description="Valide artes de acessos, jogadores e contas UT com historico de decisao e rastreabilidade interna."
      />

      <AdminTableCard
        title="Fila de revisao"
        description="Controle visual de aprovacoes, rejeicoes e justificativas usadas no circuito."
        filters={
          <>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por solicitante ou tipo"
              className={`${inputClassName} min-w-[240px] flex-1`}
            />
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as "all" | "user" | "player" | "team")
              }
              className={inputClassName}
            >
              <option value="all">Todos os tipos</option>
              <option value="user">Acessos</option>
              <option value="player">Jogadores</option>
              <option value="team">Contas UT</option>
            </select>
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
              <TableHead>Solicitante</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enviado em</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((item) => (
              <TableRow key={item.id} className="border-white/8 hover:bg-white/5">
                <TableCell className="font-semibold text-white">{item.requesterName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {requesterTypeLabel[item.requesterType] ?? item.requesterType}
                </TableCell>
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
                <TableCell className="text-muted-foreground">{formatDateTime(item.submittedAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setSelectedId(item.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableCard>

      <Dialog
        open={Boolean(selectedRequest)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent className="border-white/10 bg-background text-white sm:max-w-2xl">
          {selectedRequest ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedRequest.requesterName}</DialogTitle>
                <DialogDescription>
                  {requesterTypeLabel[selectedRequest.requesterType] ?? selectedRequest.requesterType}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
                  <img
                    src={selectedRequest.previewUrl}
                    alt={selectedRequest.requesterName}
                    className="h-[240px] w-full rounded-2xl border border-white/8 object-cover"
                  />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <AdminStatusBadge
                      label={selectedRequest.status}
                      tone={
                        selectedRequest.status === "approved"
                          ? "success"
                          : selectedRequest.status === "pending"
                          ? "warning"
                          : "danger"
                      }
                    />
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {formatDateTime(selectedRequest.submittedAt)}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Motivo de rejeicao</p>
                    <textarea
                      value={rejectionReason}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      placeholder="Explique por que esta imagem deve ser rejeitada"
                      className="mt-3 min-h-[130px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Historico de moderacao</p>
                    <div className="mt-3 space-y-3">
                      {selectedRequest.moderationHistory.length > 0 ? (
                        selectedRequest.moderationHistory.map((entry) => (
                          <article key={entry.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <p className="font-semibold text-white">{entry.action}</p>
                            {entry.reason ? (
                              <p className="mt-2 text-sm text-muted-foreground">{entry.reason}</p>
                            ) : null}
                            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              {entry.actor} • {formatDateTime(entry.at)}
                            </p>
                          </article>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma decisao tomada ainda.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    moderateImageRequest(selectedRequest.id, "approved");
                    setSelectedId(null);
                    setRejectionReason("");
                  }}
                >
                  <Check className="h-4 w-4" />
                  Aprovar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    moderateImageRequest(selectedRequest.id, "rejected", rejectionReason);
                    setSelectedId(null);
                    setRejectionReason("");
                  }}
                >
                  <X className="h-4 w-4" />
                  Rejeitar
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
