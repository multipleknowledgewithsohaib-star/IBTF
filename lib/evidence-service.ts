import { and, eq } from "drizzle-orm";
import type { AuthorizedUser } from "@/app/access";
import { getDb } from "@/db";
import { auditEvents, cases, fileUploads, operationalEvidenceLinks } from "@/db/schema";
import { assertPermission } from "@/lib/authorization";
import { assertControlledEvidenceLink, type EvidenceFileType } from "@/lib/evidence-controls";

export class EvidenceControlError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

export async function linkOperationalEvidence(input: { evidenceUploadId: string; manifestUploadId: string; caseId?: string; reason: string; user: AuthorizedUser }) {
  assertPermission(input.user.roles, "upload:create");
  const db = getDb();
  const [evidence, manifest] = await Promise.all([
    db.select().from(fileUploads).where(eq(fileUploads.id, input.evidenceUploadId)).limit(1),
    db.select().from(fileUploads).where(eq(fileUploads.id, input.manifestUploadId)).limit(1),
  ]);
  if (!evidence[0] || !manifest[0]) throw new EvidenceControlError("EVIDENCE_UPLOAD_NOT_FOUND", "Both preserved uploads must exist.", 404);
  try { assertControlledEvidenceLink(evidence[0].fileType as EvidenceFileType, manifest[0].fileType as EvidenceFileType, input.reason); }
  catch (error) { throw new EvidenceControlError((error as Error).message, (error as Error).message); }
  if (input.caseId && !(await db.select({ id: cases.id }).from(cases).where(and(eq(cases.id, input.caseId), eq(cases.sourceUploadId, manifest[0].id))).limit(1))[0]) throw new EvidenceControlError("EVIDENCE_CASE_MANIFEST_MISMATCH", "The case must belong to the selected authoritative manifest.");
  const id = crypto.randomUUID(), correlationId = crypto.randomUUID(), now = new Date();
  await db.batch([
    db.insert(operationalEvidenceLinks).values({ id, evidenceUploadId: evidence[0].id, manifestUploadId: manifest[0].id, caseId: input.caseId ?? null, reason: input.reason.trim(), linkedBy: input.user.id, linkedAt: now }),
    db.insert(auditEvents).values({ id: crypto.randomUUID(), actorId: input.user.id, action: "SUPPORTING_EVIDENCE_LINKED", entityType: "operational_evidence_link", entityId: id, beforeJson: null, afterJson: JSON.stringify({ evidenceUploadId: evidence[0].id, manifestUploadId: manifest[0].id, caseId: input.caseId ?? null }), reason: input.reason.trim(), correlationId, ipAddress: null, occurredAt: now }),
  ]);
  return { id, correlationId };
}
