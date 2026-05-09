import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import type { AdminPermission } from "@/admin/config/security";
import {
  ADMIN_DASHBOARD_ROUTE,
  ADMIN_LOGIN_ROUTE,
  useAdminAuth,
} from "@/contexts/AdminAuthContext";

function AdminRouteLoadingState() {
  return (
    <div className="min-h-screen bg-background text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg rounded-[28px] border border-white/8 bg-card/80 p-6 shadow-[0_20px_70px_-40px_rgba(0,0,0,0.85)] backdrop-blur">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-primary">area administrativa</p>
              <h2 className="mt-2 font-heading text-2xl font-bold text-white">
                Validando acesso
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Conferindo a sessao do admin para abrir o painel com seguranca.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RequireAdminAccess({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isPrimaryAdmin, isReady } = useAdminAuth();

  if (!isReady) {
    return <AdminRouteLoadingState />;
  }

  if (!isPrimaryAdmin) {
    const redirectPath = `${location.pathname}${location.search}`;
    return <Navigate replace to={`${ADMIN_LOGIN_ROUTE}?redirect=${encodeURIComponent(redirectPath)}`} />;
  }

  return <>{children}</>;
}

export function RequireAdminPermission({
  permission,
  children,
}: {
  permission: AdminPermission;
  children: ReactNode;
}) {
  const location = useLocation();
  const { hasPermission, isPrimaryAdmin, isReady } = useAdminAuth();

  if (!isReady) {
    return <AdminRouteLoadingState />;
  }

  if (!isPrimaryAdmin) {
    const redirectPath = `${location.pathname}${location.search}`;
    return <Navigate replace to={`${ADMIN_LOGIN_ROUTE}?redirect=${encodeURIComponent(redirectPath)}`} />;
  }

  if (!hasPermission(permission)) {
    return <Navigate replace to={ADMIN_DASHBOARD_ROUTE} />;
  }

  return <>{children}</>;
}
