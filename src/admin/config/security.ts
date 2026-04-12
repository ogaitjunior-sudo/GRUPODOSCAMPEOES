export const adminPermissions = [
  "dashboard:view",
  "users:view",
  "users:manage",
  "players:view",
  "players:manage",
  "teams:view",
  "teams:manage",
  "championships:view",
  "championships:manage",
  "images:view",
  "images:moderate",
  "languages:view",
  "languages:manage",
  "support:view",
  "support:manage",
  "logs:view",
  "settings:view",
  "settings:manage",
] as const;

export type AdminPermission = (typeof adminPermissions)[number];

export type AdminRole = "super_admin" | "operations_manager" | "moderator" | "support_manager";

export const adminRoleLabels: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  operations_manager: "Operações",
  moderator: "Moderação",
  support_manager: "Suporte",
};

export const allAdminPermissions = [...adminPermissions] as AdminPermission[];

export const rolePermissionMap: Record<AdminRole, AdminPermission[]> = {
  super_admin: allAdminPermissions,
  operations_manager: [
    "dashboard:view",
    "users:view",
    "users:manage",
    "players:view",
    "players:manage",
    "teams:view",
    "teams:manage",
    "championships:view",
    "championships:manage",
    "images:view",
    "images:moderate",
    "languages:view",
    "support:view",
    "support:manage",
    "logs:view",
    "settings:view",
  ],
  moderator: [
    "dashboard:view",
    "players:view",
    "players:manage",
    "teams:view",
    "teams:manage",
    "championships:view",
    "images:view",
    "images:moderate",
    "support:view",
    "logs:view",
  ],
  support_manager: [
    "dashboard:view",
    "support:view",
    "support:manage",
    "logs:view",
    "users:view",
    "players:view",
  ],
};

export function getPermissionsForRole(role: AdminRole) {
  return rolePermissionMap[role];
}

export function hasAdminPermission(
  permissions: AdminPermission[],
  permission: AdminPermission,
) {
  return permissions.includes(permission);
}
