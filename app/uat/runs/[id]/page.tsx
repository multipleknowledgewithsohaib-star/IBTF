import Link from "next/link";
import { requirePermission } from "@/app/access";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PrintButton } from "@/components/print-button";
import { getUatRun } from "@/lib/uat-report-service";

export const dynamic = "force-dynamic";
export default async function UatRunPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("audit:view");
  const { id } = await params;
  const { run, results } = await getUatRun(id);
  return <WorkspaceShell user={user} title={`UAT ${run.runReference}`}>
    <div className="workspace-body space-y-5 print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Immutable evidence record</p><h1 className="text-2xl font-semibold text-slate-900">{run.runReference}</h1><p className="mt-2 text-sm text-slate-600">{run.serverName} · commit {run.sourceCommit} · generated {run.generatedAt.toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</p></div><div className="flex gap-2 print:hidden"><Link className="rounded-md border px-4 py-2 text-sm" href={`/api/uat-runs/${run.id}/export?format=csv`}>CSV</Link><Link className="rounded-md border px-4 py-2 text-sm" href={`/api/uat-runs/${run.id}/export?format=json`}>JSON</Link><PrintButton /></div></div>
      <div className="grid gap-3 sm:grid-cols-5">{[["Overall",run.overallResult],["Pass",run.passCount],["Fail",run.failCount],["Blocked",run.blockedCount],["Not executed",run.notExecutedCount]].map(([label,value]) => <div key={label} className="rounded-xl border bg-white p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><strong className="mt-2 block text-xl text-slate-900">{value}</strong></div>)}</div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">A PASS report demonstrates only the exercised application scenarios captured here. IT must separately approve identity, infrastructure, secrets, backup/restore, monitoring, security review and deployment. No payment initiation or Oracle posting is performed by this report.</div>
      <div className="data-panel"><table><thead><tr><th>Test</th><th>Category</th><th>Description</th><th>Expected</th><th>Actual</th><th>Status</th></tr></thead><tbody>{results.map((row) => <tr key={row.id}><td>{row.scenarioCode}</td><td>{row.category}</td><td className="whitespace-normal min-w-48">{row.title}</td><td className="whitespace-normal min-w-72">{row.expectedOutcome}</td><td className="whitespace-normal min-w-72">{row.actualOutcome}</td><td>{row.result}</td></tr>)}</tbody></table></div>
    </div>
  </WorkspaceShell>;
}
