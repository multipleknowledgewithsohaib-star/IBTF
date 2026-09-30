import { desc, eq } from "drizzle-orm";
import { requirePermission } from "@/app/access";
import { AccessAdministration } from "@/components/access-administration";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db";
import { roles, userAccessHistory, userRoles, users } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function UserAdministrationPage() {
  const actor = await requirePermission("access:manage"), db = getDb();
  const [rows, roleRows, history] = await Promise.all([
    db.select({ id: users.id, authSubject: users.authSubject, email: users.email, displayName: users.displayName, isActive: users.isActive, role: roles.code })
      .from(users).leftJoin(userRoles, eq(userRoles.userId, users.id)).leftJoin(roles, eq(roles.id, userRoles.roleId)),
    db.select({ code: roles.code, name: roles.name, description: roles.description }).from(roles),
    db.select({ action: userAccessHistory.action, userId: userAccessHistory.userId, roleId: userAccessHistory.roleId, reason: userAccessHistory.reason, changedBy: userAccessHistory.changedBy, changedAt: userAccessHistory.changedAt })
      .from(userAccessHistory).orderBy(desc(userAccessHistory.changedAt)).limit(100),
  ]);
  const grouped = new Map<string, { id: string; authSubject: string; email: string; displayName: string; isActive: boolean; roles: string[] }>();
  for (const row of rows) {
    const current = grouped.get(row.id) ?? { id: row.id, authSubject: row.authSubject, email: row.email, displayName: row.displayName, isActive: row.isActive, roles: [] };
    if (row.role) current.roles.push(row.role);
    grouped.set(row.id, current);
  }
  return <WorkspaceShell user={actor} title="User access administration"><div className="workspace-body space-y-6">
    <Card><CardHeader><CardTitle>Controlled provisioning and role administration</CardTitle></CardHeader><CardContent>
      <AccessAdministration users={[...grouped.values()]} roles={roleRows} />
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Immutable access-change history</CardTitle></CardHeader><CardContent>
      <div className="table-wrap"><table><thead><tr><th>Time</th><th>Action</th><th>User / role</th><th>Changed by</th><th>Reason</th></tr></thead><tbody>
        {history.length ? history.map((row, index) => <tr key={`${row.userId}-${row.changedAt.valueOf()}-${index}`}><td>{row.changedAt.toISOString()}</td><td>{row.action}</td><td>{row.userId}<small>{row.roleId ?? "account"}</small></td><td>{row.changedBy}</td><td>{row.reason}</td></tr>) : <tr><td colSpan={5}>No access changes have been recorded.</td></tr>}
      </tbody></table></div>
    </CardContent></Card>
  </div></WorkspaceShell>;
}
