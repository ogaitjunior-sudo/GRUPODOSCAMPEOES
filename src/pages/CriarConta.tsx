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
        title: "Não foi possível criar a conta",
        description: result.message,
      });
      return;
    }

    toast({
      title: result.requiresEmailConfirmation ? "Conta criada" : "Cadastro liberado",
      description:
        result.message ?? "Sua conta foi criada com sucesso e já está pronta para entrar no portal.",
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(51_100%_50%_/_0.12),transparent_32%),radial-gradient(circle_at_80%_20%,hsl(195_100%_50%_/_0.14),transparent_24%),linear-gradient(180deg,hsl(0_0%_6%),hsl(0_0%_4%))]" />
        <DecorativeParticles
          count={20}
          className="opacity-18"
          particleClassName="bg-electric/30"
          durationRange={[2.5, 5.5]}
        />

        <div className="relative z-10 w-full max-w-xl">
          <div className="mb-6 flex items-center gap-3">
            <img
              src={logoGC}
              alt="Grupo de Campeões FC26"
              className="h-12 w-12 rounded-full site-card-soft object-cover p-1"
            />
            <div>
              <p className="font-heading text-xs uppercase tracking-[0.32em] text-primary">
                Novo cadastro
              </p>
              <p className="text-sm text-muted-foreground">
                Crie seu acesso com o visual limpo do portal.
              </p>
            </div>
          </div>

          <div className="rounded-[32px] site-card p-7 md:p-8">
            <div className="mb-8">
              <div className="site-kicker">
                <ShieldPlus className="h-4 w-4 text-electric" />
                Cadastro oficial
              </div>
              <h1 className="mt-5 font-heading text-3xl font-semibold tracking-[0.08em] text-foreground md:text-4xl">
                Criar conta
              </h1>
              <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                Seu nome de jogador fica vinculado ao acesso para facilitar inscrições e próximos
                passos.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isAuthConfigured && (
                <div className="rounded-2xl site-card-subtle px-4 py-3 text-sm text-muted-foreground">
                  {authConfigurationMessage}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="sr-only">Nome de jogador</span>
                  <div className="group flex items-center rounded-2xl border border-border bg-background/60 px-4 transition-colors focus-within:border-primary/40">
                    <UserRound className="mr-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input
                      type="text"
                      aria-label="Nome de jogador"
                      value={form.name}
                      onChange={updateField("name")}
                      placeholder="Nome de jogador"
                      autoComplete="nickname"
                      className="w-full bg-transparent py-3.5 text-base text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </label>

                <label className="block sm:col-span-2">
                  <span className="sr-only">E-mail</span>
                  <div className="group flex items-center rounded-2xl border border-border bg-background/60 px-4 transition-colors focus-within:border-primary/40">
                    <AtSign className="mr-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input
                      type="email"
                      aria-label="E-mail"
                      value={form.email}
                      onChange={updateField("email")}
                      placeholder="E-mail"
                      autoComplete="email"
                      className="w-full bg-transparent py-3.5 text-base text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="sr-only">Senha</span>
                  <div className="group flex items-center rounded-2xl border border-border bg-background/60 px-4 transition-colors focus-within:border-primary/40">
                    <LockKeyhole className="mr-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input
                      type="password"
                      aria-label="Senha"
                      value={form.password}
                      onChange={updateField("password")}
                      placeholder="Senha"
                      autoComplete="new-password"
                      className="w-full bg-transparent py-3.5 text-base text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="sr-only">Confirmar senha</span>
                  <div className="group flex items-center rounded-2xl border border-border bg-background/60 px-4 transition-colors focus-within:border-primary/40">
                    <LockKeyhole className="mr-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input
                      type="password"
                      aria-label="Confirmar senha"
                      value={form.confirmPassword}
                      onChange={updateField("confirmPassword")}
                      placeholder="Confirmar senha"
                      autoComplete="new-password"
                      className="w-full bg-transparent py-3.5 text-base text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isAuthConfigured}
                className="cta-primary w-full rounded-2xl px-4 py-3.5 text-base disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Criando conta..." : "Criar conta"}
              </button>

              <div className="rounded-[24px] site-card-soft px-5 py-5">
                <h2 className="text-base font-semibold text-foreground">Acesso simples e direto</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Depois do cadastro, você pode entrar com o e-mail ou com o nome do jogador.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-2">
                <p className="text-sm text-muted-foreground">Já tem acesso?</p>
                <Link
                  to={`/entrar${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
                  className="cta-ghost px-1 py-2 text-sm"
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
