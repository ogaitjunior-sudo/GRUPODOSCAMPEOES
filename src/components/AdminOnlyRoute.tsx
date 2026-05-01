import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useLocation } from "react-router-dom";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { PageShell } from "@/components/PageShell";
import { ADMIN_LOGIN_ROUTE, useAdminAuth } from "@/contexts/AdminAuthContext";

export function AdminOnlyRoute({ children }: { children: ReactNode }) {
  const { isAdmin } = useAdminAuth();
  const location = useLocation();

  if (isAdmin) {
    return <>{children}</>;
  }

  const redirectPath = `${location.pathname}${location.search}`;

  return (
    <PageShell>
      <section className="py-16">
        <div className="container mx-auto px-4">
          <EmptyStateCard
            icon={ShieldAlert}
            title="Acesso negado"
            description="Esta area interna fica fora da experiencia publica. Faca login com um acesso administrativo para continuar."
            actionLabel="Entrar no painel"
            actionTo={`${ADMIN_LOGIN_ROUTE}?redirect=${encodeURIComponent(redirectPath)}`}
            className="mx-auto max-w-3xl"
          />
        </div>
      </section>
    </PageShell>
  );
}
