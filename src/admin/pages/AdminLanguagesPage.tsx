import { useMemo, useState } from "react";
import { Globe2, Languages, PencilLine, Plus } from "lucide-react";
import { AdminMetricCard } from "@/admin/components/AdminMetricCard";
import { AdminPageHeader } from "@/admin/components/AdminPageHeader";
import { AdminStatusBadge } from "@/admin/components/AdminStatusBadge";
import { AdminTableCard } from "@/admin/components/AdminTableCard";
import { useAdminPanel } from "@/admin/context/AdminPanelContext";
import { formatDateTime, normalizeSearch } from "@/admin/utils/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inputClassName =
  "h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-muted-foreground";

const translationKeys = ["dashboard", "support", "championships"] as const;

interface LanguageFormState {
  code: string;
  label: string;
  status: "active" | "inactive";
  completion: number;
  dashboard: string;
  support: string;
  championships: string;
}

const initialForm: LanguageFormState = {
  code: "",
  label: "",
  status: "inactive",
  completion: 0,
  dashboard: "",
  support: "",
  championships: "",
};

export default function AdminLanguagesPage() {
  const { state, toggleLanguageStatus, upsertLanguage } = useAdminPanel();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<LanguageFormState>(initialForm);

  const filteredLanguages = useMemo(() => {
    const search = normalizeSearch(query);
    return state.languages.filter((item) => {
      const matchesQuery =
        !search ||
        [item.code, item.label, Object.values(item.sampleTranslations).join(" ")]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(search);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, state.languages, statusFilter]);

  const completionAverage = Math.round(
    state.languages.reduce((total, item) => total + item.completion, 0) /
      Math.max(state.languages.length, 1),
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(initialForm);
    setIsDialogOpen(true);
  };

  const openEdit = (id: string) => {
    const target = state.languages.find((item) => item.id === id);
    if (!target) return;
    setEditingId(id);
    setForm({
      code: target.code,
      label: target.label,
      status: target.status,
      completion: target.completion,
      dashboard: target.sampleTranslations.dashboard ?? "",
      support: target.sampleTranslations.support ?? "",
      championships: target.sampleTranslations.championships ?? "",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Internacionalizacao"
        title="Idiomas"
        description="Mantenha a base de traducoes organizada, com status visivel, progresso por idioma e estrutura pronta para i18n real."
        actions={
          <Button onClick={openCreate} className="font-heading font-bold">
            <Plus className="h-4 w-4" />
            Novo idioma
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          icon={Languages}
          label="Idiomas ativos"
          value={state.languages.filter((item) => item.status === "active").length}
          helper="Idiomas ja disponiveis para exibicao no portal."
        />
        <AdminMetricCard
          icon={Globe2}
          label="Cobertura media"
          value={`${completionAverage}%`}
          helper="Media do preenchimento das traducoes cadastradas."
          accent="electric"
        />
        <AdminMetricCard
          icon={PencilLine}
          label="Em traducao"
          value={state.languages.filter((item) => item.completion < 100).length}
          helper="Idiomas que ainda precisam de complemento editorial."
        />
      </div>

      <AdminTableCard
        title="Catalogo de idiomas"
        description="Controle codigos, labels, amostras de traducao e ativacao sem precisar alterar arquivos de front-end."
        filters={
          <>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por idioma, codigo ou traducao"
              className={`${inputClassName} min-w-[240px] flex-1`}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
              className={`${inputClassName} min-w-[180px]`}
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </>
        }
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/8 text-left text-sm text-muted-foreground">
              <th className="px-4 py-3">Idioma</th>
              <th className="px-4 py-3">Codigo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Cobertura</th>
              <th className="px-4 py-3">Atualizado</th>
              <th className="px-4 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {filteredLanguages.map((item) => (
              <tr key={item.id} className="border-b border-white/8 text-sm last:border-b-0 hover:bg-white/5">
                <td className="px-4 py-4">
                  <p className="font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Dashboard: {item.sampleTranslations.dashboard ?? "-"}
                  </p>
                </td>
                <td className="px-4 py-4 text-muted-foreground">{item.code}</td>
                <td className="px-4 py-4">
                  <AdminStatusBadge
                    label={item.status}
                    tone={item.status === "active" ? "success" : "warning"}
                  />
                </td>
                <td className="px-4 py-4 text-white">{item.completion}%</td>
                <td className="px-4 py-4 text-muted-foreground">{formatDateTime(item.updatedAt)}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(item.id)}>
                      <PencilLine className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleLanguageStatus(item.id)}>
                      {item.status === "active" ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableCard>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-white/10 bg-background text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar idioma" : "Novo idioma"}</DialogTitle>
            <DialogDescription>
              Estrutura base para internacionalizacao, cobrindo status, progresso e chaves principais.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                placeholder="Nome do idioma"
                className={inputClassName}
              />
              <input
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                placeholder="Codigo"
                className={inputClassName}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as "active" | "inactive",
                  }))
                }
                className={inputClassName}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
              <input
                type="number"
                min={0}
                max={100}
                value={form.completion}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    completion: Number(event.target.value),
                  }))
                }
                placeholder="Cobertura (%)"
                className={inputClassName}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {translationKeys.map((key) => (
                <input
                  key={key}
                  value={form[key]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  placeholder={`Traducao de ${key}`}
                  className={inputClassName}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!form.label.trim() || !form.code.trim()) {
                  return;
                }

                upsertLanguage({
                  id: editingId ?? undefined,
                  code: form.code,
                  label: form.label,
                  status: form.status,
                  completion: Math.max(0, Math.min(100, form.completion)),
                  sampleTranslations: {
                    dashboard: form.dashboard,
                    support: form.support,
                    championships: form.championships,
                  },
                });
                setIsDialogOpen(false);
              }}
            >
              Salvar idioma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

