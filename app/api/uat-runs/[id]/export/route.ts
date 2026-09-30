import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/app/access";
import { hasPermission } from "@/lib/authorization";
import { getUatRun, UatReportError } from "@/lib/uat-report-service";
import { uatResultsToCsv } from "@/lib/uat-report";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthorizedUser();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!hasPermission(actor.roles, "audit:view")) return NextResponse.json({ error: "Permission denied." }, { status: 403 });
  try {
    const { id } = await params;
    const report = await getUatRun(id);
    const format = new URL(request.url).searchParams.get("format");
    const filename = report.run.runReference.replace(/[^A-Z0-9_-]/gi, "_");
    if (format === "csv") {
      const rows = report.results.map((row) => ({ code: row.scenarioCode, category: row.category, title: row.title, expected: row.expectedOutcome, actual: row.actualOutcome, result: row.result as "PASS" | "FAIL" | "BLOCKED" | "NOT_EXECUTED", evidence: JSON.parse(row.evidenceJson) as Record<string, unknown> }));
      return new Response(uatResultsToCsv(rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${filename}.csv"`, "cache-control": "no-store" } });
    }
    if (format === "json") return new Response(JSON.stringify(report, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="${filename}.json"`, "cache-control": "no-store" } });
    return NextResponse.json({ error: "Format must be csv or json." }, { status: 400 });
  } catch (error) {
    if (error instanceof UatReportError) return NextResponse.json({ code: error.code, error: error.message }, { status: error.status });
    return NextResponse.json({ error: "UAT export failed safely." }, { status: 500 });
  }
}
