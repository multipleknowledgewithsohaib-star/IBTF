export type ResolutionAction = "resolve" | "supersede" | "reverse" | "approve" | "return" | "reopen";
export function assertResolutionInput(reason: string, evidenceReference: string) {
  if (!reason.trim()) throw new Error("RESOLUTION_REASON_REQUIRED");
  if (!evidenceReference.trim()) throw new Error("RESOLUTION_EVIDENCE_REQUIRED");
}
export function assertResolutionAction(input: { action: ResolutionAction; status: string; actorId: string; requesterId?: string; uploaderId: string; matcherId?: string | null; roles: readonly string[] }) {
  const canRequest = input.roles.includes("FINANCE_MAKER") || input.roles.includes("SYSTEM_ADMIN");
  const canApprove = input.roles.includes("FINANCE_CHECKER") || input.roles.includes("SYSTEM_ADMIN");
  if (["resolve", "supersede", "reverse", "reopen"].includes(input.action) && !canRequest) throw new Error("RESOLUTION_PERMISSION_DENIED");
  if (["approve", "return"].includes(input.action) && !canApprove) throw new Error("RESOLUTION_APPROVAL_PERMISSION_DENIED");
  if (input.action === "approve" && (input.actorId === input.requesterId || input.actorId === input.uploaderId || input.actorId === input.matcherId)) throw new Error("RESOLUTION_SEGREGATION_REQUIRED");
  if (["resolve", "supersede"].includes(input.action) && !["Open", "Returned", "Reopened"].includes(input.status)) throw new Error("RESOLUTION_INVALID_STATE");
  if (input.action === "reverse" && input.status !== "Reconciled") throw new Error("RESOLUTION_INVALID_STATE");
  if (["approve", "return"].includes(input.action) && input.status !== "Pending Approval") throw new Error("RESOLUTION_INVALID_STATE");
  if (input.action === "reopen" && !["Resolved", "Superseded", "Reversed", "Reconciled"].includes(input.status)) throw new Error("RESOLUTION_INVALID_STATE");
}
