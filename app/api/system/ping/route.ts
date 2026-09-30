import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/app/access";
import { hasPermission } from "@/lib/authorization";
import { writeAuditEvent } from "@/lib/audit";

export async function POST() {
  const user = await getAuthorizedUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (!hasPermission(user.roles, "master:manage")) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  await writeAuditEvent({
    actorId: user.id,
    action: "SYSTEM_CONTROL_CHECK",
    entityType: "system",
    entityId: "stage-1",
    after: { result: "ok" },
  });
  return NextResponse.json({ ok: true, stage: 1 });
}
