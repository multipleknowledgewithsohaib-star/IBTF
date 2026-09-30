import Link from "next/link";
import { desc } from "drizzle-orm";
import { requirePermission } from "@/app/access";
import { WorkspaceShell } from "@/components/workspace-shell";
import { UatRunForm } from "@/components/uat-run-form";
import { getDb } from "@/db";
import { uatRuns } from "@/db/schema";
import { hasPermission } from "@/lib/authorization";

export const dynamic = "force-dynamic";
export default async function UatPage() {
  const user = await requirePermission("audit:view");
  const runs = await getDb().select().from(uatRuns).orderBy(desc(uatRuns.generatedAt)).limit(50);
  return <WorkspaceShell user={user} title="UAT evidence">
    <div className="workspace-body space-y-5">
      <div><p className="eyebrow">Standalone acceptance</p><h1 className="text-2xl font-semibold text-slate-900">System-generated UAT record</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Each run is an immutable point-in-time snapshot. PASS requires observed server evidence; missing scenarios remain NOT EXECUTED. This report does not activate production or prove infrastructure readiness.</p></div>
      {hasPermission(user.roles, "uat:execute") && <UatRunForm />}
      <div className="data-panel"><table><thead><tr><th>Run</th><th>Generated</th><th>Server</th><th>Commit</th><th>Overall</th><th>Results</th></tr></thead><tbody>
        {runs.map((run) => <tr key={run.id}><td><Link className="font-medium text-teal-700 underline" href={`/uat/runs/${run.id}`}>{run.runReference}</Link></td><td>{run.generatedAt.toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</td><td>{run.serverName}</td><td>{run.sourceCommit.slice(0, 12)}</td><td>{run.overallResult}</td><td>{run.passCount} pass · {run.failCount} fail · {run.notExecutedCount} not executed</td></tr>)}
        {!runs.length && <tr><td colSpan={6}>No UAT run has been captured on this server.</td></tr>}
      </tbody></table></div>
    </div>
  </WorkspaceShell>;
}
