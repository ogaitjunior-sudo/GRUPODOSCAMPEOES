import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AtSign, LifeBuoy, ShieldQuestion } from "lucide-react";
import logoGC from "@/assets/logo-gc-fc26.png";
import { DecorativeParticles } from "@/components/DecorativeParticles";
import { PageShell } from "@/components/PageShell";
import { usePlayerAuth } from "@/contexts/PlayerAuthContext";
import { toast } from "@/hooks/use-toast";

interface RecoveryForm {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RecuperarSenha() {
  const navigate = useNavigate();
  const {
    authConfigurationMessage,
    isAuthConfigured,
    requestPasswordReset,
    updatePassword,
  } = usePlayerAuth();
  const [form, setForm] = useState<RecoveryForm>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    setIsRecoveryMode(params.get("type") === "recovery");
  }, []);

  const updateField = (field: keyof RecoveryForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmitting(true);

    if (isRecoveryMode) {
      if (form.password.trim().length < 6) {
        setIsSubmitting(false);
        toast({
          title: "Senha muito curta",
          description: "Use pelo menos 6 caracteres para definir a nova senha.",
        });
        return;
      }

      if (form.password !== form.confirmPassword) {
        setIsSubmitting(false);
        toast({
          title: "Senhas diferentes",
          description: "Confirme a nova senha com o mesmo valor informado no primeiro campo.",
        });
        return;
      }

      const result = await updatePassword(form.password);
      setIsSubmitting(false);

      if (!result.success) {
        toast({
          title: "Não foi possível redefinir a senha",
          description: result.message,
        });
        return;
      }

      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/recuperar-senha");
      }

      toast({
        title: "Senha atualizada",
        description: result.message,
      });

      navigate("/entrar", { replace: true });
      return;
    }

    const result = await requestPasswordReset(form.email);
    setIsSubmitting(false);

    if (!result.success) {
      toast({
        title: "Não foi possível enviar o link",
        description: result.message,
      });
      return;
    }

    toast({
      title: "Link enviado",
      description: result.message,
    });
  };

  return (
    <PageShell className="bg-background">
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(195_100%_50%_/_0.14),transparent_30%),radial-gradient(circle_at_20%_80%,hsl(51_100%_50%_/_0.12),transparent_24%),linear-gradient(180deg,hsl(0_0%_6%),hsl(0_0%_4%))]" />
        <DecorativeParticles
          count={18}
          className="opacity-25"
          particleClassName="bg-electric/35"
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
              <p className="font-heading text-xs uppercase tracking-[0.35em] text-electric">
                Recuperação
              </p>
              <p className="text-xs text-muted-foreground">
                Retome seu acesso dentro da identidade do portal
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-primary/20 bg-metallic-card p-7 shadow-[0_20px_80px_hsl(0_0%_0%_/_0.45)] border-glow-blue backdrop-blur-sm">
            <div className="mb-8">
              <h1 className="font-heading text-4xl font-normal tracking-[0.15em] text-electric text-glow-blue">
                RECUPERAR SENHA
              </h1>
              <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                <ShieldQuestion className="h-4 w-4 text-primary" />
                Solicitação oficial do Grupo de Campeões
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {!isAuthConfigured && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    {authConfigurationMessage}
                  </div>
                )}

                <p className="text-sm leading-6 text-muted-foreground">
                  {isRecoveryMode
                    ? "Defina a nova senha da sua conta para concluir a recuperação."
                    : "Informe o e-mail usado no portal para receber o link oficial de redefinição."}
                </p>

                {isRecoveryMode ? (
                  <>
                    <label className="block">
                      <span className="sr-only">Nova senha</span>
                      <div className="group flex items-center rounded-xl border border-border bg-background/75 px-4 transition-colors focus-within:border-electric/60">
                        <ShieldQuestion className="mr-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-electric" />
                        <input
                          type="password"
                          aria-label="Nova senha"
                          value={form.password}
                          onChange={updateField("password")}
                          placeholder="Nova senha"
                          className="w-full bg-transparent py-3.5 text-lg text-foreground outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="sr-only">Confirmar nova senha</span>
                      <div className="group flex items-center rounded-xl border border-border bg-background/75 px-4 transition-colors focus-within:border-electric/60">
                        <ShieldQuestion className="mr-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-electric" />
                        <input
                          type="password"
                          aria-label="Confirmar nova senha"
                          value={form.confirmPassword}
                          onChange={updateField("confirmPassword")}
                          placeholder="Confirmar nova senha"
                          className="w-full bg-transparent py-3.5 text-lg text-foreground outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </label>
                  </>
                ) : (
                  <label className="block">
                    <span className="sr-only">E-mail de recuperação</span>
                    <div className="group flex items-center rounded-xl border border-border bg-background/75 px-4 transition-colors focus-within:border-electric/60">
                      <AtSign className="mr-3 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-electric" />
                      <input
                        type="email"
                        aria-label="E-mail de recuperação"
                        value={form.email}
                        onChange={updateField("email")}
                        placeholder="E-mail de recuperação"
                        className="w-full bg-transparent py-3.5 text-lg text-foreground outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isAuthConfigured}
                className="mt-5 w-full rounded-xl bg-electric px-4 py-3 text-center font-heading text-2xl font-normal tracking-[0.08em] text-background transition hover:brightness-110"
              >
                {isSubmitting ? "Enviando..." : isRecoveryMode ? "Salvar nova senha" : "Recuperar"}
              </button>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LifeBuoy className="h-4 w-4 text-primary" />
                  Precisa voltar?
                </div>
                <Link
                  to="/entrar"
                  className="rounded-md border border-primary px-3 py-1.5 text-sm text-primary transition hover:bg-primary/10"
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
