import { desc } from "drizzle-orm";
import { requirePermission } from "@/app/access";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getDb } from "@/db";
import { auditEvents } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const user = await requirePermission("audit:view");
  const events = await getDb().select().from(auditEvents).orderBy(desc(auditEvents.occurredAt)).limit(50);
  return <WorkspaceShell user={user} title="Audit trail"><div className="workspace-body"><div className="data-panel"><table><thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Correlation</th><th>Reason</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{event.occurredAt.toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</td><td>{event.action}</td><td>{event.entityType} / {event.entityId}</td><td>{event.correlationId}</td><td>{event.reason ?? "—"}</td></tr>)}</tbody></table></div></div></WorkspaceShell>;
}
