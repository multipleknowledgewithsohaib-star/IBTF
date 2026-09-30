import { count, desc, eq, sum } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents, cases, fileUploads, paymentBatches } from "@/db/schema";

export type DashboardSnapshot = {
  uploadedCases: number;
  eligibleCases: number;
  eligibleAmountPaisa: number;
  pendingDecisions: number;
  pendingBankConfirmations: number;
  reconciliationExceptions: number;
  recentAuditEvents: Array<{ id: string; action: string; entityType: string; occurredAt: Date }>;
};

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot> {
  const db = getDb();
  const [uploads, eligible, decisions, pending, exceptions, audit] = await Promise.all([
    db.select({ value: sum(fileUploads.acceptedCount) }).from(fileUploads),
    db.select({ cases: count(), amount: sum(cases.visaFeePaisa) }).from(cases).where(eq(cases.status, "Eligible for Payment")),
    db.select({ value: count() }).from(cases).where(eq(cases.status, "Business Decision Required")),
    db.select({ value: count() }).from(paymentBatches).where(eq(paymentBatches.status, "Bank Confirmation Pending")),
    db.select({ value: count() }).from(paymentBatches).where(eq(paymentBatches.status, "Reconciliation Exception")),
    db.select({ id: auditEvents.id, action: auditEvents.action, entityType: auditEvents.entityType, occurredAt: auditEvents.occurredAt })
      .from(auditEvents).orderBy(desc(auditEvents.occurredAt)).limit(5),
  ]);

  return {
    uploadedCases: Number(uploads[0]?.value ?? 0),
    eligibleCases: Number(eligible[0]?.cases ?? 0),
    eligibleAmountPaisa: Number(eligible[0]?.amount ?? 0),
    pendingDecisions: Number(decisions[0]?.value ?? 0),
    pendingBankConfirmations: Number(pending[0]?.value ?? 0),
    reconciliationExceptions: Number(exceptions[0]?.value ?? 0),
    recentAuditEvents: audit,
  };
}
