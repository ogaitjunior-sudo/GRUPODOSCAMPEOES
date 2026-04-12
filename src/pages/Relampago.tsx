import { Clock3, Trophy, Zap } from "lucide-react";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { lightningCups } from "@/data/siteContent";

export default function Relampago() {
  const hasLightningCups = lightningCups.length > 0;

  return (
    <PageShell>
      <section className="py-16">
        <div className="container mx-auto px-4">
          <PageHeader
            icon={Zap}
            title="RELÂMPAGO"
            description="Eventos curtos para quem quer jogar rápido, fechar chave no mesmo dia e manter o ritmo."
            eyebrow="Modo turbo"
          />

          {hasLightningCups ? (
            <div className="mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-3">
              {lightningCups.map((cup, index) => (
                <article
                  key={cup.name}
                  className="rounded-2xl border border-primary/20 bg-metallic-card p-6 opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-heading font-bold uppercase tracking-[0.2em] text-primary">
                        {cup.format}
                      </p>
                      <h2 className="mt-2 font-heading text-lg font-bold text-foreground">
                        {cup.name}
                      </h2>
                    </div>
                    <StatusBadge status={cup.status} />
                  </div>

                  <p className="text-sm text-muted-foreground">{cup.summary}</p>

                  <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-primary" />
                      <span>{cup.startTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span>Duração estimada: {cup.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span>{cup.reward}</span>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-border/70 bg-background/40 px-4 py-3">
                    <p className="text-xs font-heading uppercase tracking-[0.2em] text-primary">Vagas</p>
                    <p className="mt-1 text-sm font-bold text-foreground">{cup.slots}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyStateCard
              icon={Zap}
              title="Nenhum torneio relâmpago aberto"
              description="Os eventos rápidos ainda não foram publicados neste novo início. Assim que uma janela relâmpago for aberta, ela aparecerá aqui com horário, formato e vagas."
              className="mx-auto mt-10 max-w-3xl"
            />
          )}
        </div>
      </section>
    </PageShell>
  );
}
