import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AtSign, LockKeyhole, ShieldPlus, UserRound } from "lucide-react";
import logoGC from "@/assets/logo-gc-fc26.png";
import { DecorativeParticles } from "@/components/DecorativeParticles";
import { PageShell } from "@/components/PageShell";
import { usePlayerAuth } from "@/contexts/PlayerAuthContext";
import { toast } from "@/hooks/use-toast";

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function CriarConta() {
  const [searchParams] = useSearchParams();
  const { authConfigurationMessage, isAuthConfigured, register } = usePlayerAuth();
  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTo = searchParams.get("redirect") || "/";

  const updateField =
    (field: keyof RegisterForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (form.password.trim().length < 6) {
      toast({
        title: "Senha muito curta",
        description: "Use pelo menos 6 caracteres para criar sua conta.",
      });
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast({
        title: "Senhas diferentes",
        description: "Confirme a senha com o mesmo valor informado no primeiro campo.",
      });
      return;
    }

    setIsSubmitting(true);

    const result = await register({
      name: form.name,
      email: form.email,
      password: form.password,
    });

    setIsSubmitting(false);

    if (!result.success) {
      toast({
        title: "Nao foi possivel criar a conta",
        description: result.message,
      });
      return;
    }

    toast({
      title: result.requiresEmailConfirmation ? "Conta criada" : "Cadastro liberado",
      description:
        result.message ??
        "Sua conta foi criada com sucesso e ja esta pronta para entrar no portal.",
    });

    setForm({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  };

  return (
    <PageShell className="bg-background">
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(51_100%_50%_/_0.12),transparent_32%),radial-gradient(circle_at_80%_20%,hsl(195_100%_50%_/_0.16),transparent_24%),linear-gradient(180deg,hsl(0_0%_6%),hsl(0_0%_4%))]" />
        <DecorativeParticles
          count={20}
          className="opacity-25"
          particleClassName="bg-electric/35"
          durationRange={[2.5, 5.5]}
        />

        <div className="relative z-10 w-full max-w-lg">
          <div className="mb-6 flex items-center gap-3">
            <img
              src={logoGC}
              alt="Grupo de Campeoes FC26"
              className="h-12 w-12 rounded-full border border-primary/20 bg-card/80 object-cover p-1"
            />
            <div>
              <p className="font-heading text-xs uppercase tracking-[0.35em] text-primary">
                Novo cadastro
              </p>
              <p className="text-xs text-muted-foreground">
                Crie seu acesso com a identidade do portal
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-primary/20 bg-metallic-card p-7 shadow-[0_20px_80px_hsl(0_0%_0%_/_0.45)] border-glow-gold backdrop-blur-sm">
            <div className="mb-8">
              <h1 className="font-heading text-4xl font-normal tracking-[0.16em] text-primary text-glow-gold">
                CRIAR CONTA
              </h1>
              <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                <ShieldPlus className="h-4 w-4 text-electric" />
                Cadastro oficial do Grupo de Campeoes
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {!isAuthConfigured && (
                <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  {authConfigurationMessage}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="sr-only">Nome de jogador</span>
                  <div className="group flex items-center rounded-xl border border-border bg-background/75 px-4 transition-colors focus-within:border-primary/60">
                    <UserRound className="mr-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input
                      type="text"
                      aria-label="Nome de jogador"
                      value={form.name}
                      onChange={updateField("name")}
                      placeholder="Nome de jogador"
                      autoComplete="nickname"
                      className="w-full bg-transparent py-3.5 text-lg text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </label>

                <label className="block sm:col-span-2">
                  <span className="sr-only">E-mail</span>
                  <div className="group flex items-center rounded-xl border border-border bg-background/75 px-4 transition-colors focus-within:border-electric/60">
                    <AtSign className="mr-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-electric" />
                    <input
                      type="email"
                      aria-label="E-mail"
                      value={form.email}
                      onChange={updateField("email")}
                      placeholder="E-mail"
                      autoComplete="email"
                      className="w-full bg-transparent py-3.5 text-lg text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="sr-only">Senha</span>
                  <div className="group flex items-center rounded-xl border border-border bg-background/75 px-4 transition-colors focus-within:border-electric/60">
                    <LockKeyhole className="mr-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-electric" />
                    <input
                      type="password"
                      aria-label="Senha"
                      value={form.password}
                      onChange={updateField("password")}
                      placeholder="Senha"
                      autoComplete="new-password"
                      className="w-full bg-transparent py-3.5 text-lg text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="sr-only">Confirmar senha</span>
                  <div className="group flex items-center rounded-xl border border-border bg-background/75 px-4 transition-colors focus-within:border-electric/60">
                    <LockKeyhole className="mr-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-electric" />
                    <input
                      type="password"
                      aria-label="Confirmar senha"
                      value={form.confirmPassword}
                      onChange={updateField("confirmPassword")}
                      placeholder="Confirmar senha"
                      autoComplete="new-password"
                      className="w-full bg-transparent py-3.5 text-lg text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isAuthConfigured}
                className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-center font-heading text-2xl font-normal tracking-[0.08em] text-primary-foreground transition hover:brightness-110"
              >
                {isSubmitting ? "Criando..." : "Criar conta"}
              </button>

              <div className="mt-5 rounded-xl border border-border bg-black/50 px-6 py-5 text-left shadow-[0_12px_30px_hsl(0_0%_0%_/_0.35)]">
                <h2 className="text-base font-medium text-foreground">
                  Cadastro conectado ao Supabase Auth
                </h2>
                <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                  O nome do jogador e salvo junto da conta e o acesso passa a usar o mesmo fluxo real do portal.
                </p>
                <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                  Depois do cadastro, voce pode entrar com o e-mail ou com o nome do jogador.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Ja tem acesso?</p>
                <Link
                  to={`/entrar${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
                  className="rounded-md border border-electric px-3 py-1.5 text-sm text-electric transition hover:bg-electric/10"
                >
                  Voltar para entrar
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
