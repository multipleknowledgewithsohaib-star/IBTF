import { AlertTriangle, Banknote, CheckCircle2, Clock3, DatabaseZap, FileStack } from "lucide-react";
import { requirePermission } from "@/app/access";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadDashboardSnapshot } from "@/lib/dashboard";
import { formatPkr } from "@/lib/money";

export const dynamic = "force-dynamic";

const stages = [
  { number: 1, label: "Foundation", status: "Complete" },
  { number: 2, label: "Data intake", status: "Complete" },
  { number: 3, label: "Payments", status: "Complete" },
  { number: 4, label: "Reconciliation", status: "Implemented" },
  { number: 5, label: "Completion", status: "Planned" },
];

export default async function DashboardPage() {
  const user = await requirePermission("dashboard:view");
  const snapshot = await loadDashboardSnapshot();
  const metrics = [
    { label: "Uploaded cases", value: snapshot.uploadedCases.toLocaleString("en-PK"), icon: FileStack, tone: "navy" },
    { label: "Eligible amount", value: formatPkr(snapshot.eligibleAmountPaisa), sub: `${snapshot.eligibleCases} cases`, icon: Banknote, tone: "teal" },
    { label: "Decisions pending", value: snapshot.pendingDecisions.toLocaleString("en-PK"), icon: Clock3, tone: "amber" },
    { label: "Bank confirmations", value: snapshot.pendingBankConfirmations.toLocaleString("en-PK"), sub: "pending", icon: DatabaseZap, tone: "blue" },
    { label: "Recon exceptions", value: snapshot.reconciliationExceptions.toLocaleString("en-PK"), icon: AlertTriangle, tone: "red" },
  ];

  return (
    <WorkspaceShell user={user} title="Operational dashboard"><div className="workspace-body">
      <section className="status-ribbon"><div><span className="status-dot" /> Stage 4 bank reconciliation and confirmation controls are operational</div><p>PKR · FY July—June · Asia/Karachi</p></section>
      <section className="metric-grid" aria-label="Operational key indicators">
        {metrics.map((metric) => <Card key={metric.label} className={`metric-card metric-${metric.tone}`}><CardContent className="p-0"><div className="metric-icon"><metric.icon /></div><p>{metric.label}</p><strong>{metric.value}</strong>{metric.sub && <span>{metric.sub}</span>}</CardContent></Card>)}
      </section>
      <section className="dashboard-grid">
        <Card className="gap-0 py-0"><CardHeader className="border-b py-5"><CardTitle>Delivery controls</CardTitle><Badge variant="outline">Stage 1</Badge></CardHeader><CardContent className="p-0"><div className="stage-list">
              {stages.map((stage) => <div key={stage.number} className={stage.number === 4 ? "stage-row stage-current" : "stage-row"}><span className="stage-number">0{stage.number}</span><div><strong>{stage.label}</strong><small>{stage.status}</small></div>{stage.number <= 4 ? <CheckCircle2 /> : <span className="stage-line" />}</div>)}
        </div></CardContent></Card>
        <Card className="gap-0 py-0"><CardHeader className="border-b py-5"><CardTitle>Recent audit evidence</CardTitle></CardHeader><CardContent className="p-0">
          {snapshot.recentAuditEvents.length > 0 ? <div className="audit-list">{snapshot.recentAuditEvents.map((event) => <div key={event.id}><span className="audit-glyph"><CheckCircle2 /></span><div><strong>{event.action.replaceAll("_", " ")}</strong><small>{event.entityType} · {event.occurredAt.toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</small></div></div>)}</div> : <p className="empty-state">No audit activity has been recorded yet.</p>}
        </CardContent></Card>
      </section>
    </div></WorkspaceShell>
  );
}
