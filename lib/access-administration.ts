import { and, eq, inArray, or } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { AuthorizedUser } from "@/app/access";
import { getDb } from "@/db";
import { auditEvents, roles, userAccessHistory, userRoles, users } from "@/db/schema";
import { assertPermission, type RoleCode } from "@/lib/authorization";
import { AccessControlError, assertReason, normalizeRoleCodes, validateProvisioningIdentity } from "@/lib/access-control-policy";
export { AccessControlError } from "@/lib/access-control-policy";

const uid = () => crypto.randomUUID();

const auditEvent = (actorId: string, action: string, entityId: string, before: unknown, after: unknown, reason: string, correlationId: string, now: Date) =>
  getDb().insert(auditEvents).values({ id: uid(), actorId, action, entityType: "user_access", entityId, beforeJson: JSON.stringify(before), afterJson: JSON.stringify(after), reason, correlationId, ipAddress: null, occurredAt: now });

const historyEvent = (userId: string, roleId: string | null, action: string, reason: string, actorId: string, correlationId: string, now: Date) =>
  getDb().insert(userAccessHistory).values({ id: uid(), userId, roleId, action, reason, changedBy: actorId, correlationId, changedAt: now });

async function activeAdminIds(): Promise<string[]> {
  const db = getDb();
  const rows = await db.select({ userId: users.id }).from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(users.isActive, true), eq(roles.code, "SYSTEM_ADMIN")));
  return [...new Set(rows.map((row) => row.userId))];
}

async function resolvedRoles(codes: RoleCode[]) {
  const rows = await getDb().select({ id: roles.id, code: roles.code }).from(roles).where(inArray(roles.code, codes));
  if (rows.length !== codes.length) throw new AccessControlError("ROLE_CONFIGURATION_ERROR", "One or more approved roles are missing from the database.", 500);
  return rows;
}

export async function createPendingUser(input: { authSubject: string; email: string; displayName: string; roleCodes: string[]; reason: string; actor: AuthorizedUser }) {
  assertPermission(input.actor.roles, "access:manage");
  const identity = validateProvisioningIdentity(input), selected = normalizeRoleCodes(input.roleCodes), reason = assertReason(input.reason), db = getDb();
  const duplicate = (await db.select({ id: users.id }).from(users).where(or(eq(users.authSubject, identity.authSubject), eq(users.email, identity.email))).limit(1))[0];
  if (duplicate) throw new AccessControlError("USER_EXISTS", "A user already exists for this identity subject or email.", 409);
  const roleRows = await resolvedRoles(selected), userId = uid(), correlationId = uid(), now = new Date();
  const queries: BatchItem<"sqlite">[] = [
    db.insert(users).values({ id: userId, ...identity, isActive: false, createdAt: now, updatedAt: now }),
    historyEvent(userId, null, "USER_CREATED_INACTIVE", reason, input.actor.id, correlationId, now),
  ];
  for (const role of roleRows) {
    queries.push(
      db.insert(userRoles).values({ userId, roleId: role.id, assignedAt: now, assignedBy: input.actor.id }),
      historyEvent(userId, role.id, "ROLE_ASSIGNED", reason, input.actor.id, correlationId, now),
    );
  }
  queries.push(auditEvent(input.actor.id, "USER_PROVISIONED_INACTIVE", userId, null, { ...identity, isActive: false, roles: selected }, reason, correlationId, now));
  await db.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  return { id: userId, isActive: false, roles: selected };
}

export async function replaceUserRoles(input: { userId: string; roleCodes: string[]; reason: string; actor: AuthorizedUser }) {
  assertPermission(input.actor.roles, "access:manage");
  if (input.userId === input.actor.id) throw new AccessControlError("SELF_ROLE_CHANGE_BLOCKED", "An administrator cannot change their own roles.", 409);
  const selected = normalizeRoleCodes(input.roleCodes), reason = assertReason(input.reason), db = getDb();
  const target = (await db.select({ id: users.id, active: users.isActive }).from(users).where(eq(users.id, input.userId)).limit(1))[0];
  if (!target) throw new AccessControlError("USER_NOT_FOUND", "User not found.", 404);
  const currentRows = await db.select({ id: roles.id, code: roles.code }).from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId)).where(eq(userRoles.userId, input.userId));
  const current = currentRows.map((row) => row.code as RoleCode);
  if (current.includes("SYSTEM_ADMIN") && !selected.includes("SYSTEM_ADMIN") && (await activeAdminIds()).length <= 1) {
    throw new AccessControlError("LAST_ADMIN_PROTECTED", "The last active System Administrator cannot lose administrator access.", 409);
  }
  if (JSON.stringify([...current].sort()) === JSON.stringify([...selected].sort())) throw new AccessControlError("NO_ACCESS_CHANGE", "The selected roles are already assigned.", 409);
  const roleRows = await resolvedRoles(selected), now = new Date(), correlationId = uid();
  const currentByCode = new Map(currentRows.map((row) => [row.code, row.id])), nextByCode = new Map(roleRows.map((row) => [row.code, row.id]));
  const queries: BatchItem<"sqlite">[] = [db.delete(userRoles).where(eq(userRoles.userId, input.userId))];
  for (const [code, roleId] of currentByCode) if (!nextByCode.has(code)) queries.push(historyEvent(input.userId, roleId, "ROLE_REVOKED", reason, input.actor.id, correlationId, now));
  for (const role of roleRows) {
    queries.push(db.insert(userRoles).values({ userId: input.userId, roleId: role.id, assignedAt: now, assignedBy: input.actor.id }));
    if (!currentByCode.has(role.code)) queries.push(historyEvent(input.userId, role.id, "ROLE_ASSIGNED", reason, input.actor.id, correlationId, now));
  }
  queries.push(auditEvent(input.actor.id, "USER_ROLES_REPLACED", input.userId, { roles: current }, { roles: selected }, reason, correlationId, now));
  await db.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  return { roles: selected };
}

export async function setUserActive(input: { userId: string; active: boolean; reason: string; actor: AuthorizedUser }) {
  assertPermission(input.actor.roles, "access:manage");
  if (!input.active && input.userId === input.actor.id) throw new AccessControlError("SELF_DEACTIVATION_BLOCKED", "An administrator cannot deactivate their own account.", 409);
  const reason = assertReason(input.reason), db = getDb();
  const target = (await db.select({ id: users.id, active: users.isActive }).from(users).where(eq(users.id, input.userId)).limit(1))[0];
  if (!target) throw new AccessControlError("USER_NOT_FOUND", "User not found.", 404);
  if (target.active === input.active) throw new AccessControlError("NO_STATUS_CHANGE", `User is already ${input.active ? "active" : "inactive"}.`, 409);
  if (!input.active && (await activeAdminIds()).includes(input.userId) && (await activeAdminIds()).length <= 1) {
    throw new AccessControlError("LAST_ADMIN_PROTECTED", "The last active System Administrator cannot be deactivated.", 409);
  }
  const now = new Date(), correlationId = uid(), action = input.active ? "USER_ACTIVATED" : "USER_DEACTIVATED";
  const queries: BatchItem<"sqlite">[] = [
    db.update(users).set({ isActive: input.active, updatedAt: now }).where(and(eq(users.id, input.userId), eq(users.isActive, target.active))),
    historyEvent(input.userId, null, action, reason, input.actor.id, correlationId, now),
    auditEvent(input.actor.id, action, input.userId, { isActive: target.active }, { isActive: input.active }, reason, correlationId, now),
  ];
  await db.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  return { isActive: input.active };
}
