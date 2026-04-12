import { useEffect, useMemo, useState } from "react";
import { FileText, ImagePlus, Palette, Settings, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminMetricCard } from "@/admin/components/AdminMetricCard";
import { AdminPageHeader } from "@/admin/components/AdminPageHeader";
import { AdminSectionCard } from "@/admin/components/AdminSectionCard";
import { AdminStatusBadge } from "@/admin/components/AdminStatusBadge";
import { useAdminPanel } from "@/admin/context/AdminPanelContext";
import type { BannerSetting, SiteSettings, StaticPageSetting } from "@/admin/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const inputClassName =
  "h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-muted-foreground";

type BannerFormState = Omit<BannerSetting, "id">;
type StaticPageFormState = Omit<StaticPageSetting, "id">;

const emptyBannerForm: BannerFormState = {
  title: "",
  subtitle: "",
  imageUrl: "",
  ctaLabel: "",
  ctaHref: "",
  isActive: true,
};

const emptyPageForm: StaticPageFormState = {
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  published: true,
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AdminSettingsPage() {
  const { state, updateSettings } = useAdminPanel();
  const [draft, setDraft] = useState<SiteSettings>(state.settings);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState<BannerFormState>(emptyBannerForm);
  const [pageForm, setPageForm] = useState<StaticPageFormState>(emptyPageForm);

  useEffect(() => {
    setDraft(state.settings);
  }, [state.settings]);

  const platformLabel = useMemo(() => {
    if (draft.platformStatus === "healthy") return "Saudavel";
    if (draft.platformStatus === "attention") return "Atencao";
    return "Manutencao";
  }, [draft.platformStatus]);

  const commitSettings = (nextDraft: SiteSettings) => {
    setDraft(nextDraft);
    updateSettings(nextDraft);
  };

  const saveGeneral = () => commitSettings(draft);

  const openBanner = (banner?: BannerSetting) => {
    setEditingBannerId(banner?.id ?? null);
    setBannerForm(
      banner
        ? {
            title: banner.title,
            subtitle: banner.subtitle,
            imageUrl: banner.imageUrl,
            ctaLabel: banner.ctaLabel,
            ctaHref: banner.ctaHref,
            isActive: banner.isActive,
          }
        : emptyBannerForm,
    );
    setBannerDialogOpen(true);
  };

  const saveBanner = () => {
    if (!bannerForm.title.trim()) return;
    const nextBanner: BannerSetting = { id: editingBannerId ?? createId("banner"), ...bannerForm };
    const banners = editingBannerId
      ? draft.banners.map((item) => (item.id === editingBannerId ? nextBanner : item))
      : [nextBanner, ...draft.banners];
    commitSettings({ ...draft, banners });
    setBannerDialogOpen(false);
  };

  const openPage = (page?: StaticPageSetting) => {
    setEditingPageId(page?.id ?? null);
    setPageForm(
      page
        ? {
            slug: page.slug,
            title: page.title,
            excerpt: page.excerpt,
            body: page.body,
            published: page.published,
          }
        : emptyPageForm,
    );
    setPageDialogOpen(true);
  };

  const savePage = () => {
    if (!pageForm.slug.trim() || !pageForm.title.trim()) return;
    const nextPage: StaticPageSetting = { id: editingPageId ?? createId("page"), ...pageForm };
    const staticPages = editingPageId
      ? draft.staticPages.map((item) => (item.id === editingPageId ? nextPage : item))
      : [nextPage, ...draft.staticPages];
    commitSettings({ ...draft, staticPages });
    setPageDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Controle global"
        title="Configuracoes"
        description="Gerencie identidade visual, SEO, cadastro, links oficiais, banners e paginas publicas a partir do backoffice oculto."
        actions={<Button onClick={saveGeneral}>Salvar configuracoes</Button>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard icon={Settings} label="Status da plataforma" value={platformLabel} helper="Sinal operacional exibido no topo do painel." />
        <AdminMetricCard icon={ImagePlus} label="Banners ativos" value={draft.banners.filter((item) => item.isActive).length} helper="Campanhas liberadas para a home publica." accent="electric" />
        <AdminMetricCard icon={FileText} label="Paginas publicadas" value={draft.staticPages.filter((item) => item.published).length} helper="Conteudos vivos no site publico." />
      </div>

      <AdminSectionCard
        title="Centros administrativos"
        description="Acesso rapido aos modulos avancados que ficam organizados dentro da area de configuracoes."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Perfis",
              description: "Acessos, contas e vinculacoes administrativas.",
              to: "/admin/perfis",
            },
            {
              label: "Usuarios",
              description: "Controle fino de acessos internos e papeis.",
              to: "/admin/usuarios",
            },
            {
              label: "Suporte",
              description: "Tickets, respostas e acompanhamento da fila.",
              to: "/admin/suporte",
            },
            {
              label: "Sistema",
              description: "Logs, idiomas e saude operacional da plataforma.",
              to: "/admin/sistema",
            },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-[24px] border border-white/8 bg-black/20 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:bg-white/5"
            >
              <p className="font-semibold text-white">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </Link>
          ))}
        </div>
      </AdminSectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminSectionCard title="Marca, SEO e textos" description="Base visual e institucional do circuito X1 UT.">
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <input value={draft.siteName} onChange={(event) => setDraft((current) => ({ ...current, siteName: event.target.value }))} placeholder="Nome do site" className={inputClassName} />
              <input value={draft.logoUrl} onChange={(event) => setDraft((current) => ({ ...current, logoUrl: event.target.value }))} placeholder="URL da logo" className={inputClassName} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input value={draft.faviconUrl} onChange={(event) => setDraft((current) => ({ ...current, faviconUrl: event.target.value }))} placeholder="URL do favicon" className={inputClassName} />
              <select
                value={draft.platformStatus}
                onChange={(event) => setDraft((current) => ({ ...current, platformStatus: event.target.value as SiteSettings["platformStatus"] }))}
                className={inputClassName}
              >
                <option value="healthy">Saudavel</option>
                <option value="attention">Atencao</option>
                <option value="maintenance">Manutencao</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <span className="mb-3 block text-xs uppercase tracking-[0.18em] text-muted-foreground">Cor principal</span>
                <div className="flex items-center gap-3">
                  <input type="color" value={draft.primaryColor} onChange={(event) => setDraft((current) => ({ ...current, primaryColor: event.target.value }))} className="h-11 w-16 rounded-xl border border-white/10 bg-transparent" />
                  <input value={draft.primaryColor} onChange={(event) => setDraft((current) => ({ ...current, primaryColor: event.target.value }))} className={`${inputClassName} flex-1`} />
                </div>
              </label>

              <label className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <span className="mb-3 block text-xs uppercase tracking-[0.18em] text-muted-foreground">Cor de apoio</span>
                <div className="flex items-center gap-3">
                  <input type="color" value={draft.accentColor} onChange={(event) => setDraft((current) => ({ ...current, accentColor: event.target.value }))} className="h-11 w-16 rounded-xl border border-white/10 bg-transparent" />
                  <input value={draft.accentColor} onChange={(event) => setDraft((current) => ({ ...current, accentColor: event.target.value }))} className={`${inputClassName} flex-1`} />
                </div>
              </label>
            </div>

            <Textarea value={draft.institutionalText} onChange={(event) => setDraft((current) => ({ ...current, institutionalText: event.target.value }))} placeholder="Texto institucional" className="min-h-[120px] border-white/10 bg-white/5 text-white" />
            <input value={draft.seoTitle} onChange={(event) => setDraft((current) => ({ ...current, seoTitle: event.target.value }))} placeholder="SEO title" className={inputClassName} />
            <Textarea value={draft.seoDescription} onChange={(event) => setDraft((current) => ({ ...current, seoDescription: event.target.value }))} placeholder="SEO description" className="min-h-[90px] border-white/10 bg-white/5 text-white" />
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Operacao e links globais" description="Flags de plataforma, cadastro e canais oficiais.">
          <div className="space-y-4">
            <ToggleRow
              title="Modo de manutencao"
              description="Bloqueia fluxos sensiveis ate a liberacao da operacao interna."
              checked={draft.maintenanceMode}
              onCheckedChange={(checked) => setDraft((current) => ({ ...current, maintenanceMode: checked }))}
            />
            <ToggleRow
              title="Uploads de imagem"
              description="Permite novas solicitacoes visuais no ecossistema."
              checked={draft.allowImageUploads}
              onCheckedChange={(checked) => setDraft((current) => ({ ...current, allowImageUploads: checked }))}
            />

            <select
              value={draft.registrationMode}
              onChange={(event) => setDraft((current) => ({ ...current, registrationMode: event.target.value as SiteSettings["registrationMode"] }))}
              className={inputClassName}
            >
              <option value="open">Cadastro aberto</option>
              <option value="approval_only">Cadastro com aprovacao</option>
              <option value="invite_only">Somente convite</option>
            </select>

            <input value={draft.socialLinks.discord} onChange={(event) => setDraft((current) => ({ ...current, socialLinks: { ...current.socialLinks, discord: event.target.value } }))} placeholder="Discord" className={inputClassName} />
            <input value={draft.socialLinks.instagram} onChange={(event) => setDraft((current) => ({ ...current, socialLinks: { ...current.socialLinks, instagram: event.target.value } }))} placeholder="Instagram" className={inputClassName} />
            <input value={draft.socialLinks.youtube} onChange={(event) => setDraft((current) => ({ ...current, socialLinks: { ...current.socialLinks, youtube: event.target.value } }))} placeholder="YouTube" className={inputClassName} />
            <input value={draft.socialLinks.twitch} onChange={(event) => setDraft((current) => ({ ...current, socialLinks: { ...current.socialLinks, twitch: event.target.value } }))} placeholder="Twitch" className={inputClassName} />

            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold text-white">Resumo visual</p>
                  <p className="mt-1 text-sm text-muted-foreground">Paleta central da marca e dos destaques do produto.</p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <span className="h-12 w-12 rounded-2xl border border-white/8" style={{ backgroundColor: draft.primaryColor }} />
                <span className="h-12 w-12 rounded-2xl border border-white/8" style={{ backgroundColor: draft.accentColor }} />
              </div>
            </div>
          </div>
        </AdminSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard title="Banners" description="Destaques da home publica prontos para ligacao com CMS ou API.">
          <div className="mb-4 flex justify-end">
            <Button onClick={() => openBanner()}>
              <ImagePlus className="h-4 w-4" />
              Novo banner
            </Button>
          </div>

          <div className="space-y-3">
            {draft.banners.map((item) => (
              <article key={item.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{item.title}</p>
                      <AdminStatusBadge label={item.isActive ? "ativo" : "inativo"} tone={item.isActive ? "success" : "neutral"} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.subtitle}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">CTA: {item.ctaLabel || "-"} • {item.ctaHref || "-"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openBanner(item)}>Editar</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        commitSettings({
                          ...draft,
                          banners: draft.banners.filter((banner) => banner.id !== item.id),
                        })
                      }
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Paginas estaticas" description="Conteudos publicos gerenciados pelo painel interno.">
          <div className="mb-4 flex justify-end">
            <Button onClick={() => openPage()}>
              <Sparkles className="h-4 w-4" />
              Nova pagina
            </Button>
          </div>

          <div className="space-y-3">
            {draft.staticPages.map((item) => (
              <article key={item.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{item.title}</p>
                      <AdminStatusBadge label={item.published ? "publicada" : "rascunho"} tone={item.published ? "success" : "warning"} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.excerpt}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">/{item.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openPage(item)}>Editar</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        commitSettings({
                          ...draft,
                          staticPages: draft.staticPages.filter((page) => page.id !== item.id),
                        })
                      }
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </AdminSectionCard>
      </div>

      <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
        <DialogContent className="border-white/10 bg-background text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingBannerId ? "Editar banner" : "Novo banner"}</DialogTitle>
            <DialogDescription>Configure titulo, CTA, imagem e status do banner.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <input value={bannerForm.title} onChange={(event) => setBannerForm((current) => ({ ...current, title: event.target.value }))} placeholder="Titulo" className={inputClassName} />
            <Textarea value={bannerForm.subtitle} onChange={(event) => setBannerForm((current) => ({ ...current, subtitle: event.target.value }))} placeholder="Subtitulo" className="min-h-[100px] border-white/10 bg-white/5 text-white" />
            <div className="grid gap-4 md:grid-cols-2">
              <input value={bannerForm.imageUrl} onChange={(event) => setBannerForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="URL da imagem" className={inputClassName} />
              <input value={bannerForm.ctaLabel} onChange={(event) => setBannerForm((current) => ({ ...current, ctaLabel: event.target.value }))} placeholder="Label do CTA" className={inputClassName} />
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <input value={bannerForm.ctaHref} onChange={(event) => setBannerForm((current) => ({ ...current, ctaHref: event.target.value }))} placeholder="Link do CTA" className={inputClassName} />
              <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                <Switch checked={bannerForm.isActive} onCheckedChange={(checked) => setBannerForm((current) => ({ ...current, isActive: checked }))} />
                <span className="text-sm text-white">Banner ativo</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBannerDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveBanner}>Salvar banner</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pageDialogOpen} onOpenChange={setPageDialogOpen}>
        <DialogContent className="border-white/10 bg-background text-white sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingPageId ? "Editar pagina" : "Nova pagina"}</DialogTitle>
            <DialogDescription>Cadastre ou revise paginas estaticas diretamente pelo painel.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <input value={pageForm.title} onChange={(event) => setPageForm((current) => ({ ...current, title: event.target.value }))} placeholder="Titulo" className={inputClassName} />
              <input value={pageForm.slug} onChange={(event) => setPageForm((current) => ({ ...current, slug: event.target.value }))} placeholder="Slug" className={inputClassName} />
            </div>
            <Textarea value={pageForm.excerpt} onChange={(event) => setPageForm((current) => ({ ...current, excerpt: event.target.value }))} placeholder="Resumo" className="min-h-[90px] border-white/10 bg-white/5 text-white" />
            <Textarea value={pageForm.body} onChange={(event) => setPageForm((current) => ({ ...current, body: event.target.value }))} placeholder="Conteudo da pagina" className="min-h-[180px] border-white/10 bg-white/5 text-white" />
            <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
              <Switch checked={pageForm.published} onCheckedChange={(checked) => setPageForm((current) => ({ ...current, published: checked }))} />
              <span className="text-sm text-white">Publicar pagina</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPageDialogOpen(false)}>Cancelar</Button>
            <Button onClick={savePage}>Salvar pagina</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}
