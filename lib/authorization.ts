export const roleCodes = [
  "OPERATIONS_UPLOADER",
  "FINANCE_MAKER",
  "FINANCE_CHECKER",
  "BUSINESS_DECISION_APPROVER",
  "TREASURY_UPLOADER",
  "MANAGEMENT_AUDIT",
  "SYSTEM_ADMIN",
] as const;

export type RoleCode = (typeof roleCodes)[number];

export const permissionCodes = [
  "dashboard:view",
  "upload:create",
  "case:view",
  "decision:record",
  "batch:create",
  "batch:approve",
  "batch:dispatch",
  "confirmation:upload",
  "reconciliation:view",
  "reconciliation:resolve",
  "reconciliation:approve",
  "confirmation:generate",
  "audit:view",
  "master:manage",
  "access:manage",
  "uat:execute",
] as const;

export type PermissionCode = (typeof permissionCodes)[number];

const rolePermissions: Record<RoleCode, readonly PermissionCode[]> = {
  OPERATIONS_UPLOADER: ["dashboard:view", "upload:create", "case:view"],
  FINANCE_MAKER: ["dashboard:view", "case:view", "batch:create", "reconciliation:view", "reconciliation:resolve"],
  FINANCE_CHECKER: ["dashboard:view", "case:view", "batch:approve", "reconciliation:view", "reconciliation:approve", "confirmation:generate"],
  BUSINESS_DECISION_APPROVER: ["dashboard:view", "case:view", "decision:record"],
  TREASURY_UPLOADER: ["dashboard:view", "batch:dispatch", "confirmation:upload", "reconciliation:view"],
  MANAGEMENT_AUDIT: ["dashboard:view", "case:view", "reconciliation:view", "audit:view"],
  SYSTEM_ADMIN: permissionCodes,
};

export function hasPermission(roles: readonly string[], permission: PermissionCode): boolean {
  return roles.some((role) =>
    roleCodes.includes(role as RoleCode) && rolePermissions[role as RoleCode].includes(permission),
  );
}

export function assertPermission(roles: readonly string[], permission: PermissionCode): void {
  if (!hasPermission(roles, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

export function canApproveBatch(makerId: string, approverId: string, roles: readonly string[]): boolean {
  return makerId !== approverId && hasPermission(roles, "batch:approve");
}
