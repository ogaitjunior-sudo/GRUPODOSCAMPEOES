import { useEffect, useMemo, useState } from "react";
import { LifeBuoy, MessageSquareText, ShieldAlert, TimerReset } from "lucide-react";
import { AdminMetricCard } from "@/admin/components/AdminMetricCard";
import { AdminPageHeader } from "@/admin/components/AdminPageHeader";
import { AdminStatusBadge } from "@/admin/components/AdminStatusBadge";
import { AdminTableCard } from "@/admin/components/AdminTableCard";
import { useAdminPanel } from "@/admin/context/AdminPanelContext";
import { formatDateTime, normalizeSearch } from "@/admin/utils/format";
import type { SupportTicket, TicketPriority, TicketStatus } from "@/admin/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const inputClassName =
  "h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-muted-foreground";

const emptyMeta: Pick<SupportTicket, "status" | "priority" | "assignedTo"> = {
  status: "open",
  priority: "medium",
  assignedTo: "",
};

const categoryLabels: Record<string, string> = {
  imagem: "Imagem",
  conta_ut: "Conta UT",
  campeonatos: "Campeonatos",
  conta: "Conta",
};

function getPriorityTone(priority: TicketPriority) {
  if (priority === "critical") return "danger";
  if (priority === "high") return "warning";
  if (priority === "medium") return "info";
  return "neutral";
}

function getStatusTone(status: TicketStatus) {
  if (status === "resolved") return "success";
  if (status === "waiting_user") return "info";
  if (status === "in_progress") return "warning";
  return "neutral";
}

export default function AdminSupportPage() {
  const { state, replyTicket, updateTicketMeta } = useAdminPanel();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TicketPriority>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ticketMeta, setTicketMeta] = useState(emptyMeta);
  const [replyMessage, setReplyMessage] = useState("");

  const filteredTickets = useMemo(() => {
    const search = normalizeSearch(query);
    return state.tickets.filter((item) => {
      const matchesQuery =
        !search ||
        [item.subject, item.requester, item.requesterEmail, item.category, item.assignedTo]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(search);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
      return matchesQuery && matchesStatus && matchesPriority;
    });
  }, [priorityFilter, query, state.tickets, statusFilter]);

  const selectedTicket = state.tickets.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedTicket) {
      setTicketMeta(emptyMeta);
      setReplyMessage("");
      return;
    }

    setTicketMeta({
      status: selectedTicket.status,
      priority: selectedTicket.priority,
      assignedTo: selectedTicket.assignedTo,
    });
  }, [selectedTicket]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Atendimento interno"
        title="Suporte"
        description="Central de tickets para acesso, contas UT, midias e campeonatos, sempre fora da experiencia publica."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          icon={LifeBuoy}
          label="Tickets abertos"
          value={state.tickets.filter((item) => item.status === "open").length}
          helper="Demandas novas aguardando o primeiro atendimento."
        />
        <AdminMetricCard
          icon={TimerReset}
          label="Em andamento"
          value={state.tickets.filter((item) => item.status === "in_progress").length}
          helper="Tickets com tratativa ativa por um operador."
          accent="electric"
        />
        <AdminMetricCard
          icon={ShieldAlert}
          label="Alta prioridade"
          value={state.tickets.filter((item) => item.priority === "high" || item.priority === "critical").length}
          helper="Itens com impacto mais sensivel em validacao ou andamento de torneio."
          accent="danger"
        />
      </div>

      <AdminTableCard
        title="Fila de atendimento"
        description="Busque por assunto, usuario, categoria ou responsavel e acompanhe a saude da operacao de suporte."
        filters={
          <>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por assunto, usuario ou categoria"
              className={`${inputClassName} min-w-[240px] flex-1`}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | TicketStatus)}
              className={`${inputClassName} min-w-[180px]`}
            >
              <option value="all">Todos os status</option>
              <option value="open">Aberto</option>
              <option value="in_progress">Em andamento</option>
              <option value="waiting_user">Aguardando usuario</option>
              <option value="resolved">Resolvido</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as "all" | TicketPriority)}
              className={`${inputClassName} min-w-[180px]`}
            >
              <option value="all">Todas as prioridades</option>
              <option value="low">Baixa</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Critica</option>
            </select>
          </>
        }
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/8 text-left text-sm text-muted-foreground">
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Prioridade</th>
              <th className="px-4 py-3">Responsavel</th>
              <th className="px-4 py-3">Atualizado</th>
              <th className="px-4 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((item) => (
              <tr key={item.id} className="border-b border-white/8 text-sm last:border-b-0 hover:bg-white/5">
                <td className="px-4 py-4">
                  <p className="font-semibold text-white">{item.subject}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.requester} • {categoryLabels[item.category] ?? item.category}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <AdminStatusBadge label={item.status} tone={getStatusTone(item.status)} />
                </td>
                <td className="px-4 py-4">
                  <AdminStatusBadge label={item.priority} tone={getPriorityTone(item.priority)} />
                </td>
                <td className="px-4 py-4 text-muted-foreground">{item.assignedTo || "Nao atribuido"}</td>
                <td className="px-4 py-4 text-muted-foreground">{formatDateTime(item.updatedAt)}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedId(item.id)}>
                      <MessageSquareText className="h-4 w-4" />
                      Abrir
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableCard>

      <Dialog open={Boolean(selectedTicket)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="border-white/10 bg-background text-white sm:max-w-4xl">
          {selectedTicket ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTicket.subject}</DialogTitle>
                <DialogDescription>
                  {selectedTicket.requester} • {selectedTicket.requesterEmail}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                    <div className="mt-3">
                      <AdminStatusBadge label={selectedTicket.status} tone={getStatusTone(selectedTicket.status)} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                    <select
                      value={ticketMeta.status}
                      onChange={(event) =>
                        setTicketMeta((current) => ({
                          ...current,
                          status: event.target.value as TicketStatus,
                        }))
                      }
                      className={inputClassName}
                    >
                      <option value="open">Aberto</option>
                      <option value="in_progress">Em andamento</option>
                      <option value="waiting_user">Aguardando usuario</option>
                      <option value="resolved">Resolvido</option>
                    </select>

                    <select
                      value={ticketMeta.priority}
                      onChange={(event) =>
                        setTicketMeta((current) => ({
                          ...current,
                          priority: event.target.value as TicketPriority,
                        }))
                      }
                      className={inputClassName}
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                      <option value="critical">Critica</option>
                    </select>
                  </div>

                  <input
                    value={ticketMeta.assignedTo}
                    onChange={(event) =>
                      setTicketMeta((current) => ({
                        ...current,
                        assignedTo: event.target.value,
                      }))
                    }
                    placeholder="Responsavel"
                    className={inputClassName}
                  />

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => updateTicketMeta(selectedTicket.id, ticketMeta)}
                  >
                    Salvar metadados
                  </Button>

                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-muted-foreground">
                    <p>Categoria: {categoryLabels[selectedTicket.category] ?? selectedTicket.category}</p>
                    <p className="mt-2">Criado em {formatDateTime(selectedTicket.createdAt)}</p>
                    <p className="mt-2">Ultima atualizacao em {formatDateTime(selectedTicket.updatedAt)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Historico de mensagens</p>
                    <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-2">
                      {selectedTicket.messages
                        .slice()
                        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
                        .map((message) => (
                          <article
                            key={message.id}
                            className="rounded-2xl border border-white/8 bg-white/5 p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-white">{message.author}</p>
                              <AdminStatusBadge
                                label={message.role === "admin" ? "admin" : "usuario"}
                                tone={message.role === "admin" ? "info" : "neutral"}
                              />
                            </div>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">{message.message}</p>
                            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              {formatDateTime(message.createdAt)}
                            </p>
                          </article>
                        ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Responder ticket</p>
                    <Textarea
                      value={replyMessage}
                      onChange={(event) => setReplyMessage(event.target.value)}
                      placeholder="Digite a resposta operacional para o usuario..."
                      className="mt-4 min-h-[140px] border-white/10 bg-white/5 text-white"
                    />
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={() => {
                          replyTicket(selectedTicket.id, replyMessage);
                          setReplyMessage("");
                        }}
                      >
                        Enviar resposta
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedId(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
