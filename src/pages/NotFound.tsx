import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { PageShell } from "@/components/PageShell";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PageShell className="flex items-center justify-center bg-muted px-4">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 text-center">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-primary" />
        <h1 className="mb-3 font-heading text-4xl font-black gradient-gold-text">404</h1>
        <p className="mb-2 text-xl font-bold text-foreground">Página não encontrada</p>
        <p className="mb-6 text-sm text-muted-foreground">
          O endereço <span className="font-mono text-foreground">{location.pathname}</span> não existe no portal atual.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-heading font-bold text-primary-foreground transition hover:brightness-110"
          >
            Voltar ao início
          </Link>
          <Link
            to="/campeonatos"
            className="rounded-xl border border-border px-4 py-2 text-sm font-heading font-bold text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            Ver campeonatos
          </Link>
        </div>
      </div>
    </PageShell>
  );
};

export default NotFound;
