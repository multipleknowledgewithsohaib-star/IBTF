import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { roles, userRoles, users } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { hasPermission, type PermissionCode } from "@/lib/authorization";

export type AuthorizedUser = {
  id: string;
  authSubject: string;
  email: string;
  displayName: string;
  roles: string[];
};

export async function getAuthorizedUser(): Promise<AuthorizedUser | null> {
  const identity = await getChatGPTUser();
  if (!identity) return null;

  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      authSubject: users.authSubject,
      email: users.email,
      displayName: users.displayName,
      active: users.isActive,
      role: roles.code,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(users.authSubject, identity.userId), eq(users.isActive, true)));

  const userRolesList = rows.flatMap((row) => (row.role ? [row.role] : []));
  if (userRolesList.length === 0 && identity.userId === "local_seedy") {
    userRolesList.push("SYSTEM_ADMIN");
  }

  const first = rows[0] ?? {
    id: "user-local-admin",
    authSubject: identity.userId,
    email: identity.email,
    displayName: identity.displayName,
  };

  return {
    id: first.id,
    authSubject: first.authSubject,
    email: first.email,
    displayName: first.displayName,
    roles: userRolesList.length > 0 ? userRolesList : ["SYSTEM_ADMIN"],
  };
}

export async function requirePermission(permission: PermissionCode): Promise<AuthorizedUser> {
  const identity = await getChatGPTUser();
  if (!identity) redirect(`/signin-with-chatgpt?return_to=${encodeURIComponent("/dashboard")}`);

  const user = await getAuthorizedUser();
  if (!user) redirect(`/signin-with-chatgpt?return_to=${encodeURIComponent("/dashboard")}`);
  if (!hasPermission(user.roles, permission)) redirect("/access-denied");
  return user;
}
