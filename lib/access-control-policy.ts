import { roleCodes, type RoleCode } from "./authorization.ts";

export class AccessControlError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const incompatiblePairs: ReadonlyArray<readonly [RoleCode, RoleCode]> = [
  ["FINANCE_MAKER", "FINANCE_CHECKER"],
];

export function assertReason(reason: string): string {
  const value = reason.trim();
  if (value.length < 10) throw new AccessControlError("REASON_REQUIRED", "A specific access-change reason of at least 10 characters is required.");
  return value;
}

export function normalizeRoleCodes(input: readonly string[]): RoleCode[] {
  const values = input.map((value) => value.trim()).filter(Boolean);
  const unique = [...new Set(values)];
  if (!unique.length) throw new AccessControlError("ROLE_REQUIRED", "At least one approved role is required.");
  if (unique.length !== values.length) throw new AccessControlError("DUPLICATE_ROLE", "A role was selected more than once.");
  const unknown = unique.filter((value) => !roleCodes.includes(value as RoleCode));
  if (unknown.length) throw new AccessControlError("UNKNOWN_ROLE", `Unknown role: ${unknown.join(", ")}`);
  const selected = unique as RoleCode[];
  for (const [left, right] of incompatiblePairs) {
    if (selected.includes(left) && selected.includes(right)) {
      throw new AccessControlError("SEGREGATION_OF_DUTIES", "Finance Maker and Finance Checker cannot be assigned to the same user.");
    }
  }
  if (selected.includes("SYSTEM_ADMIN") && selected.length > 1) {
    throw new AccessControlError("ADMIN_OPERATIONAL_CONFLICT", "System Administrator cannot also hold an operational role.");
  }
  return selected;
}

export function validateProvisioningIdentity(input: { authSubject: string; email: string; displayName: string }) {
  const authSubject = input.authSubject.trim(), email = input.email.trim().toLowerCase(), displayName = input.displayName.trim();
  if (!/^[A-Za-z0-9:_@.\-]{3,200}$/.test(authSubject)) throw new AccessControlError("INVALID_AUTH_SUBJECT", "The identity subject must be the exact approved provider identifier.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccessControlError("INVALID_EMAIL", "A valid corporate email address is required.");
  if (displayName.length < 2 || displayName.length > 120) throw new AccessControlError("INVALID_DISPLAY_NAME", "Display name must contain 2 to 120 characters.");
  return { authSubject, email, displayName };
}
