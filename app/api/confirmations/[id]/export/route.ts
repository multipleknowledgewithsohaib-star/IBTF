import { asc, desc, eq } from "drizzle-orm";
import { getAuthorizedUser } from "@/app/access";
import { getDb } from "@/db";
import { auditEvents, confirmationDocuments, embassies, paymentBatchBookingBreakups, paymentBatches, reconciliationCaseLinks, reconciliationResults, scbConfirmationRecords, vacs } from "@/db/schema";
import { hasPermission } from "@/lib/authorization";
import { assertConfirmationEligible } from "@/lib/reconciliation-controls";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthorizedUser();
  if (!user || !hasPermission(user.roles, "confirmation:generate")) return new Response("Forbidden", { status: 403 });
  const id = (await params).id, db = getDb();
  const row = (await db.select({ outcome: reconciliationResults.outcome, status: reconciliationResults.status, bank: scbConfirmationRecords.bankReference, date: scbConfirmationRecords.paymentDate, batch: paymentBatches.batchReference, beneficiary: paymentBatches.beneficiaryNameSnapshot, account: paymentBatches.beneficiaryAccountSnapshot, embassy: embassies.name, vac: vacs.name }).from(reconciliationResults).innerJoin(scbConfirmationRecords, eq(scbConfirmationRecords.id, reconciliationResults.recordId)).innerJoin(paymentBatches, eq(paymentBatches.id, reconciliationResults.batchId)).innerJoin(embassies, eq(embassies.id, paymentBatches.embassyId)).innerJoin(vacs, eq(vacs.id, paymentBatches.vacId)).where(eq(reconciliationResults.id, id)).limit(1))[0];
  if (!row) return new Response("Not found", { status: 404 });
  try { assertConfirmationEligible(row.outcome as "Matched", row.status); }
  catch { return new Response("Unresolved evidence cannot produce confirmation output", { status: 409 }); }
  const lines = await db.selectDistinct({ date: paymentBatchBookingBreakups.bookingDate, count: paymentBatchBookingBreakups.caseCount, amount: paymentBatchBookingBreakups.amountPaisa }).from(reconciliationCaseLinks).innerJoin(paymentBatchBookingBreakups, eq(paymentBatchBookingBreakups.id, reconciliationCaseLinks.bookingBreakupId)).where(eq(reconciliationCaseLinks.reconciliationId, id)).orderBy(asc(paymentBatchBookingBreakups.bookingDate));
  const latest = (await db.select({ version: confirmationDocuments.version }).from(confirmationDocuments).where(eq(confirmationDocuments.reconciliationId, id)).orderBy(desc(confirmationDocuments.version)).limit(1))[0];
  const correlation = crypto.randomUUID(), now = new Date(), documentId = crypto.randomUUID(), version = (latest?.version ?? 0) + 1;
  const content = { reconciliationId: id, embassy: row.embassy, vac: row.vac, beneficiary: row.beneficiary, account: row.account, batchReference: row.batch, bankReference: row.bank, paymentDate: row.date.toISOString(), bookingBreakup: lines.map((line) => ({ bookingDate: line.date.toISOString(), caseCount: line.count, amountPaisa: line.amount })) };
  await db.batch([
    db.insert(confirmationDocuments).values({ id: documentId, reconciliationId: id, version, status: "Generated", contentJson: JSON.stringify(content), generatedBy: user.id, generatedAt: now, correlationId: correlation }),
    db.insert(auditEvents).values({ id: crypto.randomUUID(), actorId: user.id, action: "CONFIRMATION_EXPORTED", entityType: "confirmation_document", entityId: documentId, beforeJson: null, afterJson: JSON.stringify({ reconciliationId: id, format: "CSV", rows: lines.length, version }), reason: "Versioned confirmation generated from locked reconciled evidence.", correlationId: correlation, ipAddress: null, occurredAt: now }),
  ]);
  const esc = (value: unknown) => `"${String(value).replaceAll('"', '""')}"`;
  const header = ["embassy", "vac", "beneficiary", "account", "batch_reference", "booking_date", "case_count", "amount_paisa", "bank_reference", "actual_payment_date"];
  const body = lines.map((line) => [row.embassy, row.vac, row.beneficiary, row.account, row.batch, line.date.toISOString().slice(0, 10), line.count, line.amount, row.bank, row.date.toISOString().slice(0, 10)].map(esc).join(","));
  return new Response([header.join(","), ...body].join("\n"), { headers: { "content-type": "text/csv", "content-disposition": `attachment; filename="${row.batch}-confirmation-v${version}.csv"`, "cache-control": "no-store" } });
}
