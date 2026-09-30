import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/app/access";
import { hasPermission } from "@/lib/authorization";
import { createUatRun, UatReportError } from "@/lib/uat-report-service";

export async function POST(request: Request) {
  const actor = await getAuthorizedUser();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!hasPermission(actor.roles, "uat:execute")) return NextResponse.json({ error: "Permission denied." }, { status: 403 });
  try {
    const body = await request.json() as { serverName?: string; sourceCommit?: string };
    return NextResponse.json(await createUatRun({ serverName: body.serverName ?? "", sourceCommit: body.sourceCommit ?? "", actorId: actor.id }), { status: 201 });
  } catch (error) {
    if (error instanceof UatReportError) return NextResponse.json({ code: error.code, error: error.message }, { status: error.status });
    return NextResponse.json({ error: "UAT evidence capture failed safely." }, { status: 500 });
  }
}
