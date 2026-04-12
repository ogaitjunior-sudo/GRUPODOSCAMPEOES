import { useMemo, useState } from "react";
import { Download, Logs, ShieldAlert, ShieldCheck } from "lucide-react";
import { AdminMetricCard } from "@/admin/components/AdminMetricCard";
import { AdminPageHeader } from "@/admin/components/AdminPageHeader";
import { AdminStatusBadge } from "@/admin/components/AdminStatusBadge";
import { AdminTableCard } from "@/admin/components/AdminTableCard";
import { useAdminPanel } from "@/admin/context/AdminPanelContext";
import { downloadJson, formatDateTime, normalizeSearch } from "@/admin/utils/format";
import type { ActivityTone, ErrorLog } from "@/admin/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const inputClassName =
  "h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-muted-foreground";

function getSeverityTone(severity: ErrorLog["severity"] | ActivityTone) {
  if (severity === "critical") return "danger";
  if (severity === "error" || severity === "warning") return "warning";
  if (severity === "success") return "success";
  if (severity === "info") return "info";
  return "neutral";
}

export default function AdminLogsPage() {
  const { state, updateErrorStatus } = useAdminPanel();
  const [errorQuery, setErrorQuery] = useState("");
  const [auditQuery, setAuditQuery] = useState("");
  const [errorStatusFilter, setErrorStatusFilter] = useState<"all" | ErrorLog["status"]>("all");

  const filteredErrors = useMemo(() => {
    const search = normalizeSearch(errorQuery);
    return state.errorLogs.filter((item) => {
      const matchesQuery =
        !search ||
        [item.module, item.message, item.stackSummary]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(search);
      const matchesStatus = errorStatusFilter === "all" || item.status === errorStatusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [errorQuery, errorStatusFilter, state.errorLogs]);

  const filteredAuditLogs = useMemo(() => {
    const search = normalizeSearch(auditQuery);
    return state.auditLogs.filter((item) => {
      if (!search) return true;
      return [item.actor, item.module, item.action, item.target]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(search);
    });
  }, [auditQuery, state.auditLogs]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Observabilidade"
        title="Logs e monitoramento"
        description="Acompanhe erros recentes, auditoria administrativa e exportacoes para analise operacional e governanca."
        actions={
          <>
            <Button variant="outline" onClick={() => downloadJson("admin-audit-logs.json", state.auditLogs)}>
              <Download className="h-4 w-4" />
              Exportar auditoria
            </Button>
            <Button onClick={() => downloadJson("admin-error-logs.json", state.errorLogs)}>
              <Download className="h-4 w-4" />
              Exportar erros
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          icon={Logs}
          label="Eventos auditados"
          value={state.auditLogs.length}
          helper="Acoes administrativas rastreadas no painel."
        />
        <AdminMetricCard
          icon={ShieldAlert}
          label="Erros abertos"
          value={state.errorLogs.filter((item) => item.status !== "resolved").length}
          helper="Falhas que ainda exigem acompanhamento tecnico."
          accent="danger"
        />
        <AdminMetricCard
          icon={ShieldCheck}
          label="Erros resolvidos"
          value={state.errorLogs.filter((item) => item.status === "resolved").length}
          helper="Ocorrencias fechadas com rastreabilidade mantida."
          accent="electric"
        />
      </div>

      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList className="bg-white/5 p-1 text-muted-foreground">
          <TabsTrigger value="errors">Erros do sistema</TabsTrigger>
          <TabsTrigger value="audit">Auditoria administrativa</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="mt-0">
          <AdminTableCard
            title="Fila de erros"
            description="Registro de falhas tecnicas, status de tratamento e contexto minimo para investigacao."
            filters={
              <>
                <input
                  value={errorQuery}
                  onChange={(event) => setErrorQuery(event.target.value)}
                  placeholder="Buscar por modulo ou mensagem"
                  className={`${inputClassName} min-w-[240px] flex-1`}
                />
                <select
                  value={errorStatusFilter}
                  onChange={(event) =>
                    setErrorStatusFilter(event.target.value as "all" | ErrorLog["status"])
                  }
                  className={`${inputClassName} min-w-[180px]`}
                >
                  <option value="all">Todos os status</option>
                  <option value="new">Novo</option>
                  <option value="investigating">Investigando</option>
                  <option value="resolved">Resolvido</option>
                </select>
              </>
            }
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/8 text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3">Modulo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Severidade</th>
                  <th className="px-4 py-3">Resumo</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredErrors.map((item) => (
                  <tr key={item.id} className="border-b border-white/8 text-sm last:border-b-0 hover:bg-white/5">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white">{item.module}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.stackSummary}</p>
                    </td>
                    <td className="px-4 py-4">
                      <AdminStatusBadge
                        label={item.status}
                        tone={item.status === "resolved" ? "success" : "warning"}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <AdminStatusBadge label={item.severity} tone={getSeverityTone(item.severity)} />
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{item.message}</td>
                    <td className="px-4 py-4 text-muted-foreground">{formatDateTime(item.createdAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => updateErrorStatus(item.id, "investigating")}>
                          Investigar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => updateErrorStatus(item.id, "resolved")}>
                          Resolver
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableCard>
        </TabsContent>

        <TabsContent value="audit" className="mt-0">
          <AdminTableCard
            title="Auditoria de administradores"
            description="Trilha de acoes realizadas dentro do painel para seguranca, revisao e governanca."
            filters={
              <input
                value={auditQuery}
                onChange={(event) => setAuditQuery(event.target.value)}
                placeholder="Buscar por ator, modulo, acao ou alvo"
                className={`${inputClassName} min-w-[240px] flex-1`}
              />
            }
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/8 text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3">Administrador</th>
                  <th className="px-4 py-3">Modulo</th>
                  <th className="px-4 py-3">Acao</th>
                  <th className="px-4 py-3">Alvo</th>
                  <th className="px-4 py-3">Severidade</th>
                  <th className="px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditLogs.map((item) => (
                  <tr key={item.id} className="border-b border-white/8 text-sm last:border-b-0 hover:bg-white/5">
                    <td className="px-4 py-4 font-semibold text-white">{item.actor}</td>
                    <td className="px-4 py-4 text-muted-foreground">{item.module}</td>
                    <td className="px-4 py-4 text-muted-foreground">{item.action}</td>
                    <td className="px-4 py-4 text-muted-foreground">{item.target}</td>
                    <td className="px-4 py-4">
                      <AdminStatusBadge label={item.severity} tone={getSeverityTone(item.severity)} />
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{formatDateTime(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

