import { HelpCircle, MessageSquareMore, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { aboutStory, helpTopics, operationalSupport } from "@/data/siteContent";

export default function Ajuda() {
  return (
    <PageShell>
      <section className="py-16">
        <div className="container mx-auto px-4">
          <PageHeader
            icon={HelpCircle}
            title="AJUDA"
            description="Centralize dúvidas frequentes, orientações rápidas e apoio para rodadas e inscrições."
          />

          <article className="mx-auto mt-10 max-w-5xl rounded-[2rem] border border-primary/20 bg-metallic-card p-6 shadow-[0_20px_60px_hsl(0_0%_0%_/_0.28)] md:p-8">
            <p className="font-heading text-xs font-bold uppercase tracking-[0.3em] text-primary">
              Sobre o grupo
            </p>
            <h2 className="mt-3 font-heading text-2xl font-black text-foreground md:text-3xl">
              Uma comunidade criada entre amigos
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
              {aboutStory.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>

          <div className="mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              {helpTopics.map((topic) => (
                <details
                  key={topic.question}
                  className="rounded-2xl border border-border bg-card p-5 open:border-primary/30 open:bg-metallic-card"
                >
                  <summary className="cursor-pointer list-none font-heading text-sm font-bold text-foreground">
                    {topic.question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{topic.answer}</p>
                </details>
              ))}
            </div>

            <div className="space-y-4">
              <article className="rounded-2xl border border-primary/20 bg-metallic-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <MessageSquareMore className="h-5 w-5 text-primary" />
                  <h2 className="font-heading text-lg font-bold">Atendimento operacional</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use este espaço para alinhar horários, reportar ausência de adversário ou pedir ajuste de agenda.
                </p>
                <Button asChild className="mt-5 w-full font-heading font-bold sm:w-auto">
                  <a
                    href={operationalSupport.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Chamar no WhatsApp
                  </a>
                </Button>
              </article>

              <article className="rounded-2xl border border-primary/20 bg-metallic-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h2 className="font-heading text-lg font-bold">Regras e segurança</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Resultados, provas de partida e critérios de desempate devem seguir o regulamento oficial de cada competição.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
