import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { AdminPermission } from "@/admin/config/security";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

export function RequireAdminAccess({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isPrimaryAdmin } = useAdminAuth();

  if (!isPrimaryAdmin) {
    const redirectPath = `${location.pathname}${location.search}`;
    return <Navigate replace to={`/admin/login?redirect=${encodeURIComponent(redirectPath)}`} />;
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
  const { hasPermission, isPrimaryAdmin } = useAdminAuth();

  if (!isPrimaryAdmin) {
    const redirectPath = `${location.pathname}${location.search}`;
    return <Navigate replace to={`/admin/login?redirect=${encodeURIComponent(redirectPath)}`} />;
  }

  if (!hasPermission(permission)) {
    return <Navigate replace to="/admin" />;
  }

  return <>{children}</>;
}
