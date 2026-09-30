import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/app/access";
import { createPendingUser, AccessControlError } from "@/lib/access-administration";
import { hasPermission } from "@/lib/authorization";

export async function POST(request: Request) {
  const actor = await getAuthorizedUser();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!hasPermission(actor.roles, "access:manage")) return NextResponse.json({ error: "Permission denied." }, { status: 403 });
  try {
    const body = await request.json() as { authSubject?: string; email?: string; displayName?: string; roleCodes?: string[]; reason?: string };
    if (!Array.isArray(body.roleCodes)) throw new AccessControlError("INVALID_REQUEST", "Approved roles are required.");
    return NextResponse.json(await createPendingUser({
      authSubject: body.authSubject ?? "", email: body.email ?? "", displayName: body.displayName ?? "",
      roleCodes: body.roleCodes, reason: body.reason ?? "", actor,
    }), { status: 201 });
  } catch (error) {
    if (error instanceof AccessControlError) return NextResponse.json({ code: error.code, error: error.message }, { status: error.status });
    return NextResponse.json({ error: "User provisioning failed safely." }, { status: 500 });
  }
}
