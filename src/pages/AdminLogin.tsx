import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound, ShieldCheck, UserRound } from "lucide-react";
import logoGC from "@/assets/logo-gc-fc26.png";
import { DecorativeParticles } from "@/components/DecorativeParticles";
import { PageShell } from "@/components/PageShell";
import { ADMIN_DASHBOARD_ROUTE, useAdminAuth } from "@/contexts/AdminAuthContext";

interface AdminLoginForm {
  username: string;
  password: string;
}

export default function AdminLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isPrimaryAdmin, login } = useAdminAuth();
  const [form, setForm] = useState<AdminLoginForm>({ username: "", password: "" });
  const [errorMessage, setErrorMessage] = useState(searchParams.get("error") ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = (() => {
    const requestedPath = searchParams.get("redirect")?.trim();

    if (requestedPath && requestedPath.startsWith("/admin")) {
      return requestedPath;
    }

    return ADMIN_DASHBOARD_ROUTE;
  })();

  useEffect(() => {
    if (isPrimaryAdmin) {
      navigate(redirectTo, { replace: true });
    }
  }, [isPrimaryAdmin, navigate, redirectTo]);

  const updateField =
    (field: keyof AdminLoginForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setErrorMessage("");
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await login(form.username, form.password);

    if (!result.success) {
      setErrorMessage(result.message ?? "Usu\u00e1rio ou senha inv\u00e1lidos");
      setIsSubmitting(false);
      return;
    }

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
              alt="Grupo de Campeoes FC26"
              className="h-12 w-12 rounded-full border border-primary/20 bg-card/80 object-cover p-1"
            />
            <div>
              <p className="font-heading text-xs uppercase tracking-[0.35em] text-primary">
                Acesso interno
              </p>
              <p className="text-xs text-muted-foreground">
                Entrada oculta para operacao do circuito X1 UT
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-primary/20 bg-metallic-card p-7 shadow-[0_20px_80px_hsl(0_0%_0%_/_0.45)] border-glow-gold backdrop-blur-sm">
            <div className="mb-8">
              <h1 className="font-heading text-4xl font-normal tracking-[0.14em] text-primary text-glow-gold">
                GC X1 OPS
              </h1>
              <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-electric" />
                Painel oculto protegido por credenciais
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <label className="block">
                  <span className="sr-only">Usuario administrativo</span>
                  <div className="group flex items-center rounded-xl border border-border bg-background/75 px-4 transition-colors focus-within:border-primary/60">
                    <UserRound className="mr-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input
                      type="text"
                      aria-label="Usuario administrativo"
                      value={form.username}
                      onChange={updateField("username")}
                      placeholder="Usuario administrativo"
                      className="w-full bg-transparent py-3.5 text-lg text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="sr-only">Senha administrativa</span>
                  <div className="group flex items-center rounded-xl border border-border bg-background/75 px-4 transition-colors focus-within:border-electric/60">
                    <KeyRound className="mr-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-electric" />
                    <input
                      type="password"
                      aria-label="Senha administrativa"
                      value={form.password}
                      onChange={updateField("password")}
                      placeholder="Senha administrativa"
                      className="w-full bg-transparent py-3.5 text-lg text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-center font-heading text-2xl font-normal tracking-[0.08em] text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Validando..." : "Entrar no painel"}
              </button>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Rota interna sem exposicao na navegacao publica.
                </p>
                <Link
                  to="/"
                  className="rounded-md border border-electric px-3 py-1.5 text-sm text-electric transition hover:bg-electric/10"
                >
                  Voltar ao site
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
