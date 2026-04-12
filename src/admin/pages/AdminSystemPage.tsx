import { Globe2, Logs, Settings, ShieldAlert } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminMetricCard } from "@/admin/components/AdminMetricCard";
import { AdminPageHeader } from "@/admin/components/AdminPageHeader";
import { AdminSectionCard } from "@/admin/components/AdminSectionCard";
import { AdminStatusBadge } from "@/admin/components/AdminStatusBadge";
import { useAdminPanel } from "@/admin/context/AdminPanelContext";
import { formatDateTime } from "@/admin/utils/format";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

type SystemTab = "config" | "logs" | "idiomas";

const systemTabLabels: Record<SystemTab, string> = {
  config: "Configuracoes",
  logs: "Logs",
  idiomas: "Idiomas",
};

export default function AdminSystemPage() {
  const { state, toggleLanguageStatus, updateSettings } = useAdminPanel();
  const { hasPermission } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const availableTabs = (
    [
      { value: "config", visible: hasPermission("settings:view") },
      { value: "logs", visible: hasPermission("logs:view") },
      { value: "idiomas", visible: hasPermission("languages:view") },
    ] as { value: SystemTab; visible: boolean }[]
  ).filter((item) => item.visible);
  const defaultTab = availableTabs[0]?.value ?? "config";
  const currentTab = (searchParams.get("tab") as SystemTab) || defaultTab;
  const tab = availableTabs.some((item) => item.value === currentTab) ? currentTab : defaultTab;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Camada de sistema"
        title="Sistema"
        description="Tudo que nao precisa disputar espaco na sidebar principal fica agrupado aqui: configuracoes, logs e idiomas."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          icon={Settings}
          label="Status da plataforma"
          value={state.settings.platformStatus}
          helper="Sinal operacional do produto e do ambiente interno."
        />
        <AdminMetricCard
          icon={ShieldAlert}
          label="Erros abertos"
          value={state.errorLogs.filter((item) => item.status !== "resolved").length}
          helper="Ocorrencias tecnicas ainda sem encerramento."
          accent="danger"
        />
        <AdminMetricCard
          icon={Globe2}
          label="Idiomas ativos"
          value={state.languages.filter((item) => item.status === "active").length}
          helper="Idiomas disponiveis para exibicao no site."
          accent="electric"
        />
      </div>

      {availableTabs.length > 0 ? (
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
                {systemTabLabels[item.value]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="config" className="mt-0">
            <AdminSectionCard
              title="Configuracoes essenciais"
              description="Resumo das regras e flags do produto sem ocupar um item exclusivo na sidebar."
            >
              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoRow label="Site" value={state.settings.siteName} />
                    <InfoRow label="Cadastro" value={state.settings.registrationMode} />
                    <InfoRow label="Modo manutencao" value={state.settings.maintenanceMode ? "Ativo" : "Desativado"} />
                    <InfoRow label="Uploads de imagem" value={state.settings.allowImageUploads ? "Liberados" : "Bloqueados"} />
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Texto institucional</p>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{state.settings.institutionalText}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">SEO</p>
                    <p className="mt-3 font-semibold text-white">{state.settings.seoTitle}</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{state.settings.seoDescription}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Saude da plataforma</p>
                        <p className="mt-2 font-semibold text-white">{state.settings.platformStatus}</p>
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
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Banners ativos</p>
                    <p className="mt-2 font-heading text-3xl text-primary">
                      {state.settings.banners.filter((item) => item.isActive).length}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">Paginas publicas publicadas: {state.settings.staticPages.filter((item) => item.published).length}</p>
                  </div>

                  {hasPermission("settings:manage") ? (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        onClick={() => updateSettings({ maintenanceMode: !state.settings.maintenanceMode })}
                      >
                        {state.settings.maintenanceMode ? "Desligar manutencao" : "Ativar manutencao"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => updateSettings({ allowImageUploads: !state.settings.allowImageUploads })}
                      >
                        {state.settings.allowImageUploads ? "Bloquear uploads" : "Liberar uploads"}
                      </Button>
                    </div>
                  ) : null}

                  {hasPermission("settings:view") ? (
                    <Button asChild>
                      <Link to="/admin/configuracoes">Abrir editor completo</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </AdminSectionCard>
          </TabsContent>

          <TabsContent value="logs" className="mt-0">
            <div className="grid gap-6 xl:grid-cols-2">
              <AdminSectionCard
                title="Erros recentes"
                description="Visao rapida das ocorrencias mais importantes."
              >
                <div className="space-y-3">
                  {state.errorLogs.slice(0, 5).map((item) => (
                    <article key={item.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-white">{item.module}</p>
                        <AdminStatusBadge
                          label={item.status}
                          tone={item.status === "resolved" ? "success" : item.severity === "critical" ? "danger" : "warning"}
                        />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.message}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </p>
                    </article>
                  ))}
                </div>
              </AdminSectionCard>

              <AdminSectionCard
                title="Auditoria recente"
                description="Ultimas acoes executadas no backoffice."
              >
                <div className="space-y-3">
                  {state.auditLogs.slice(0, 5).map((item) => (
                    <article key={item.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-white">{item.action}</p>
                        <AdminStatusBadge
                          label={item.severity}
                          tone={item.severity === "success" ? "success" : item.severity === "warning" ? "warning" : "info"}
                        />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{item.target}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {item.actor} • {formatDateTime(item.createdAt)}
                      </p>
                    </article>
                  ))}
                </div>
                {hasPermission("logs:view") ? (
                  <div className="mt-4">
                    <Button asChild>
                      <Link to="/admin/logs">Abrir painel completo de logs</Link>
                    </Button>
                  </div>
                ) : null}
              </AdminSectionCard>
            </div>
          </TabsContent>

          <TabsContent value="idiomas" className="mt-0">
            <AdminSectionCard
              title="Idiomas ativos e cobertura"
              description="i18n segue disponivel, mas sem ocupar menu principal sozinho."
            >
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  {state.languages.map((language) => (
                    <article key={language.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{language.label}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {language.code} • {language.completion}% de cobertura
                          </p>
                        </div>
                        <AdminStatusBadge
                          label={language.status}
                          tone={language.status === "active" ? "success" : "warning"}
                        />
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Dashboard: {language.sampleTranslations.dashboard ?? "-"}
                      </p>
                      {hasPermission("languages:manage") ? (
                        <div className="mt-4">
                          <Button variant="outline" onClick={() => toggleLanguageStatus(language.id)}>
                            {language.status === "active" ? "Desativar idioma" : "Ativar idioma"}
                          </Button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Idiomas ativos</p>
                    <p className="mt-2 font-heading text-3xl text-primary">
                      {state.languages.filter((item) => item.status === "active").length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cobertura media</p>
                    <p className="mt-2 font-heading text-3xl text-electric">
                      {Math.round(
                        state.languages.reduce((sum, item) => sum + item.completion, 0) /
                          Math.max(state.languages.length, 1),
                      )}
                      %
                    </p>
                  </div>

                  {hasPermission("languages:view") ? (
                    <Button asChild>
                      <Link to="/admin/idiomas">Abrir gerenciador completo</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </AdminSectionCard>
          </TabsContent>
        </Tabs>
      ) : (
        <AdminSectionCard>
          <p className="text-sm text-muted-foreground">Seu acesso nao possui modulos de sistema disponiveis.</p>
        </AdminSectionCard>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold text-white">{value}</p>
    </div>
  );
}
