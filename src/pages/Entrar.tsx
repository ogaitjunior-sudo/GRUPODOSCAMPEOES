import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import logoGC from "@/assets/logo-gc-fc26.png";
import { DecorativeParticles } from "@/components/DecorativeParticles";
import { PageShell } from "@/components/PageShell";
import { usePlayerAuth } from "@/contexts/PlayerAuthContext";
import { toast } from "@/hooks/use-toast";

interface LoginForm {
  identifier: string;
  password: string;
}

const DEFAULT_LOGIN_REDIRECT = "/perfil";

function normalizeRedirectTarget(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_LOGIN_REDIRECT;
  }

  return value;
}

function preloadRedirectTarget(target: string) {
  const pathname = target.split("?")[0];

  if (pathname === "/" || pathname === "") {
    return import("./Index.tsx");
  }

  if (pathname.startsWith("/perfil")) {
    return import("./PerfilJogador.tsx");
  }

  if (pathname.startsWith("/explorar") || pathname.startsWith("/pesquisar")) {
    return import("./Pesquisar.tsx");
  }

  if (pathname.startsWith("/ranking")) {
    return import("./Ranking.tsx");
  }

  if (pathname.startsWith("/campeonatos/")) {
    return import("./ChampionshipDetails.tsx");
  }

  if (pathname.startsWith("/campeonatos")) {
    return import("./Campeonatos.tsx");
  }

  if (pathname.startsWith("/relampago")) {
    return import("./Relampago.tsx");
  }

  if (pathname.startsWith("/campeoes")) {
    return import("./Champions.tsx");
  }

  if (pathname.startsWith("/ligas")) {
    return import("./Ligas.tsx");
  }

  if (pathname.startsWith("/ajuda")) {
    return import("./Ajuda.tsx");
  }

  return Promise.resolve();
}

export default function Entrar() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<LoginForm>({ identifier: "", password: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { authConfigurationMessage, isAuthConfigured, isAuthenticated, login, loginName } =
    usePlayerAuth();
  const redirectTo = normalizeRedirectTarget(searchParams.get("redirect"));

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  useEffect(() => {
    void preloadRedirectTarget(redirectTo);
  }, [redirectTo]);

  const updateField = (field: keyof LoginForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrorMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    void preloadRedirectTarget(redirectTo);

    const result = await login(form.identifier, form.password);

    if (!result.success) {
      setErrorMessage(result.message ?? "Não foi possível entrar.");
      setIsSubmitting(false);
      return;
    }

    toast({
      title: "Login liberado",
      description: `Bem-vindo ao portal, ${result.playerName ?? loginName ?? form.identifier.trim()}.`,
    });

    navigate(redirectTo, { replace: true });
  };

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
                Área do jogador
              </p>
              <p className="text-xs text-muted-foreground">
                Acesse seu painel com o visual do portal
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-primary/20 bg-metallic-card p-7 shadow-[0_20px_80px_hsl(0_0%_0%_/_0.45)] border-glow-gold backdrop-blur-sm">
            <div className="mb-8">
              <h1 className="font-heading text-4xl font-normal tracking-[0.18em] text-electric text-glow-blue">
                BEM-VINDO
              </h1>
              <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Entrada oficial do Grupo de Campeões
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {!isAuthConfigured && (
                <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  {authConfigurationMessage}
                </div>
              )}

              <div className="space-y-4">
                <label className="block">
                  <span className="sr-only">E-mail ou nome do jogador</span>
                  <div className="group flex items-center rounded-xl border border-border bg-background/75 px-4 transition-colors focus-within:border-electric/60">
                    <UserRound className="mr-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-electric" />
                    <input
                      type="text"
                      aria-label="E-mail ou nome do jogador"
                      value={form.identifier}
                      onChange={updateField("identifier")}
                      placeholder="E-mail ou nome do jogador"
                      autoComplete="username"
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
                      autoComplete="current-password"
                      className="w-full bg-transparent py-3.5 text-lg text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isAuthConfigured}
                className="mt-5 w-full rounded-xl bg-electric px-4 py-3 text-center font-heading text-2xl font-normal tracking-[0.08em] text-background transition hover:brightness-110 hover:border-glow-blue disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Validando..." : "Entrar"}
              </button>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  to={`/criar-conta${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground transition hover:brightness-110"
                >
                  Criar conta
                </Link>

                <Link
                  to="/recuperar-senha"
                  className="rounded-md bg-muted px-3 py-1.5 text-sm text-foreground transition hover:bg-muted/80"
                >
                  Esqueci a senha
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
