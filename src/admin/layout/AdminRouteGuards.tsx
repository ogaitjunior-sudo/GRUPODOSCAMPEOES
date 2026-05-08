import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { AdminPermission } from "@/admin/config/security";
import {
  ADMIN_DASHBOARD_ROUTE,
  ADMIN_LOGIN_ROUTE,
  useAdminAuth,
} from "@/contexts/AdminAuthContext";

export function RequireAdminAccess({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isPrimaryAdmin, isReady } = useAdminAuth();

  if (!isReady) {
    return null;
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
    return null;
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
