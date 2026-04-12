import { Link } from "react-router-dom";
import { LockKeyhole, ShieldAlert } from "lucide-react";
import logoGC from "@/assets/logo-gc-fc26.png";
import { DecorativeParticles } from "@/components/DecorativeParticles";
import { PageShell } from "@/components/PageShell";

export default function AcessoImplantacao() {
  return (
    <PageShell className="bg-background">
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(51_100%_50%_/_0.12),transparent_32%),radial-gradient(circle_at_80%_20%,hsl(195_100%_50%_/_0.16),transparent_24%),linear-gradient(180deg,hsl(0_0%_6%),hsl(0_0%_4%))]" />
        <DecorativeParticles
          count={18}
          className="opacity-25"
          particleClassName="bg-primary/45"
          durationRange={[2.5, 5.5]}
        />

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-6 flex items-center gap-3">
            <img
              src={logoGC}
              alt="Grupo de Campeões FC26"
              className="h-12 w-12 rounded-full border border-primary/20 bg-card/80 object-cover p-1"
            />
            <div>
              <p className="font-heading text-xs uppercase tracking-[0.35em] text-primary">
                Fluxo de acesso
              </p>
              <p className="text-xs text-muted-foreground">
                Estado atual da autenticação do portal
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-primary/20 bg-metallic-card p-7 shadow-[0_20px_80px_hsl(0_0%_0%_/_0.45)] border-glow-gold backdrop-blur-sm">
            <div className="mb-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                <ShieldAlert className="h-7 w-7 text-primary" />
              </div>

              <h1 className="font-heading text-3xl font-normal tracking-[0.12em] text-primary text-glow-gold md:text-4xl">
                ACESSO EM IMPLANTAÇÃO
              </h1>

              <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                <LockKeyhole className="h-4 w-4 text-electric" />
                Autenticação oficial em preparação
              </div>
            </div>

            <div className="space-y-4 text-sm leading-7 text-muted-foreground">
              <p>
                A autenticação real ainda será integrada. Por enquanto, esta tela já
                está pronta visualmente para o fluxo de entrada.
              </p>
              <p>
                Assim que o backend do projeto estiver conectado, o login passará a
                validar e liberar o acesso normalmente.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/entrar"
                className="rounded-md bg-primary px-4 py-2 font-heading text-sm text-primary-foreground transition hover:brightness-110"
              >
                Voltar para entrar
              </Link>
              <Link
                to="/criar-conta"
                className="rounded-md border border-electric px-4 py-2 font-heading text-sm text-electric transition hover:bg-electric/10"
              >
                Criar conta
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
