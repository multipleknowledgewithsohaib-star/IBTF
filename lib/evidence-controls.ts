export type EvidenceFileType = "VISA_MANIFEST" | "FEE_CUM_APPLICANT" | "EMBASSY_SUBMISSION" | "SCB_CONFIRMATION";

export function assertControlledEvidenceLink(evidenceType: EvidenceFileType, authoritativeType: EvidenceFileType, reason: string): void {
  if (authoritativeType !== "VISA_MANIFEST") throw new Error("AUTHORITATIVE_MANIFEST_REQUIRED");
  if (evidenceType !== "FEE_CUM_APPLICANT" && evidenceType !== "EMBASSY_SUBMISSION") throw new Error("SUPPORTING_EVIDENCE_TYPE_REQUIRED");
  if (!reason.trim()) throw new Error("EVIDENCE_LINK_REASON_REQUIRED");
}

export function createsPayableCases(fileType: EvidenceFileType): boolean {
  return fileType === "VISA_MANIFEST";
}
