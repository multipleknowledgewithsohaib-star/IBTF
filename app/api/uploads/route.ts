import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/app/access";
import { hasPermission } from "@/lib/authorization";
import { ingestFile, IntakeControlError } from "@/lib/intake-service";
export async function POST(request: Request) {
  const user = await getAuthorizedUser(); if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const form = await request.formData(); const file = form.get("file"); const selectedType = String(form.get("fileType") ?? "");
  const permission = selectedType === "SCB_CONFIRMATION" ? "confirmation:upload" : "upload:create";
  if (!hasPermission(user.roles, permission)) return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  if (!(file instanceof File)) return NextResponse.json({ error: "A file is required" }, { status: 400 });
  try { return NextResponse.json(await ingestFile({ file, selectedType, submissionDate: String(form.get("submissionDate") ?? "") || undefined, user }), { status: 201 }); }
  catch (error) { if (error instanceof IntakeControlError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status }); throw error; }
}
