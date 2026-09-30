import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/app/access";
import { AccessControlError, replaceUserRoles, setUserActive } from "@/lib/access-administration";
import { hasPermission } from "@/lib/authorization";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getAuthorizedUser();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!hasPermission(actor.roles, "access:manage")) return NextResponse.json({ error: "Permission denied." }, { status: 403 });
  try {
    const { id } = await context.params;
    const body = await request.json() as { action?: string; roleCodes?: string[]; reason?: string };
    if (body.action === "REPLACE_ROLES") {
      if (!Array.isArray(body.roleCodes)) throw new AccessControlError("INVALID_REQUEST", "Approved roles are required.");
      return NextResponse.json(await replaceUserRoles({ userId: id, roleCodes: body.roleCodes, reason: body.reason ?? "", actor }));
    }
    if (body.action === "ACTIVATE" || body.action === "DEACTIVATE") {
      return NextResponse.json(await setUserActive({ userId: id, active: body.action === "ACTIVATE", reason: body.reason ?? "", actor }));
    }
    throw new AccessControlError("INVALID_ACTION", "Action must be ACTIVATE, DEACTIVATE or REPLACE_ROLES.");
  } catch (error) {
    if (error instanceof AccessControlError) return NextResponse.json({ code: error.code, error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Access change failed safely." }, { status: 500 });
  }
}
