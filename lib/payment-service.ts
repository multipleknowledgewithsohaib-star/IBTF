import { and, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { AuthorizedUser } from "@/app/access";
import { getDb } from "@/db";
import { auditEvents, batchReferenceSequence, beneficiaryBankAccounts, cases, oracleApAccountMappings, paymentBatchBookingBreakups, paymentBatchCases, paymentBatches, statusHistory } from "@/db/schema";
import { assertPermission } from "@/lib/authorization";
import { assertBatchAction, assertEligibleComposition, beneficiaryEffective, calculateComposition, type BatchStatus } from "@/lib/payment-controls";
import { oracleApMappingEffective, validateOracleApMapping } from "@/lib/oracle-ap";

export class PaymentControlError extends Error { constructor(public code: string, message: string, public status = 400) { super(message); } }
const uid = () => crypto.randomUUID();
const event = (actorId: string, action: string, entityId: string, before: unknown, after: unknown, reason: string | null, correlationId: string, occurredAt: Date) => getDb().insert(auditEvents).values({ id: uid(), actorId, action, entityType: "payment_batch", entityId, beforeJson: before === null ? null : JSON.stringify(before), afterJson: after === null ? null : JSON.stringify(after), reason, correlationId, ipAddress: null, occurredAt });

export async function createPaymentBatch(input: { embassyId: string; vacId: string; beneficiaryId: string; paymentDate: string; caseIds: string[]; user: AuthorizedUser }) {
  assertPermission(input.user.roles, "batch:create");
  const db = getDb(), now = new Date(), paymentDate = new Date(`${input.paymentDate}T00:00:00Z`), correlationId = uid();
  if (Number.isNaN(paymentDate.valueOf())) throw new PaymentControlError("INVALID_PAYMENT_DATE", "A valid intended payment date is required.");
  const uniqueIds = [...new Set(input.caseIds)]; if (uniqueIds.length !== input.caseIds.length) throw new PaymentControlError("DUPLICATE_SELECTION", "A case was selected more than once.");
  const selected = uniqueIds.length ? await db.select({ id: cases.id, status: cases.status, embassyId: cases.embassyId, vacId: cases.vacId, bookingDate: cases.bookingDate, visaFeePaisa: cases.visaFeePaisa, assignedBatch: paymentBatchCases.batchId }).from(cases).leftJoin(paymentBatchCases, eq(paymentBatchCases.caseId, cases.id)).where(inArray(cases.id, uniqueIds)) : [];
  if (selected.length !== uniqueIds.length) throw new PaymentControlError("CASE_NOT_FOUND", "One or more selected cases no longer exist.", 409);
  try { assertEligibleComposition(selected.map((row) => ({ ...row, alreadyBatched: Boolean(row.assignedBatch) })), input.embassyId, input.vacId); } catch (error) { throw new PaymentControlError("INELIGIBLE_COMPOSITION", (error as Error).message, 409); }
  const beneficiary = (await db.select().from(beneficiaryBankAccounts).where(and(eq(beneficiaryBankAccounts.id, input.beneficiaryId), eq(beneficiaryBankAccounts.embassyId, input.embassyId), eq(beneficiaryBankAccounts.vacId, input.vacId))).limit(1))[0];
  if (!beneficiary || !beneficiaryEffective(beneficiary, paymentDate)) throw new PaymentControlError("NO_ACTIVE_BENEFICIARY", "No approved, active and effective beneficiary exists for this Embassy/Consulate, VAC and payment date.", 409);
  const applicableOracleMappings = (await db.select().from(oracleApAccountMappings).where(and(eq(oracleApAccountMappings.embassyId, input.embassyId), eq(oracleApAccountMappings.vacId, input.vacId))))
    .filter((mapping) => oracleApMappingEffective(mapping, paymentDate));
  if (applicableOracleMappings.length !== 1) throw new PaymentControlError("ORACLE_AP_MAPPING_REQUIRED", applicableOracleMappings.length ? "More than one approved Oracle AP account mapping is effective for this Embassy/Consulate, VAC and payment date." : "No approved Oracle AP account mapping is effective for this Embassy/Consulate, VAC and payment date.", 409);
  const oracleMapping = applicableOracleMappings[0];
  try { validateOracleApMapping(oracleMapping); } catch (error) { throw new PaymentControlError("INVALID_ORACLE_AP_MAPPING", (error as Error).message, 409); }
  const totals = calculateComposition(selected), dateKey = now.toISOString().slice(0, 10).replaceAll("-", "");
  const sequence = (await db.select().from(batchReferenceSequence).where(eq(batchReferenceSequence.sequenceDate, dateKey)).limit(1))[0]?.lastValue ?? 0;
  const next = sequence + 1, batchReference = `IBFT-${dateKey}-${String(next).padStart(5, "0")}`, batchId = uid();
  const queries: BatchItem<"sqlite">[] = [db.insert(batchReferenceSequence).values({ sequenceDate: dateKey, lastValue: next }).onConflictDoUpdate({ target: batchReferenceSequence.sequenceDate, set: { lastValue: next } }), db.insert(paymentBatches).values({ id: batchId, batchReference, embassyId: input.embassyId, vacId: input.vacId, beneficiaryId: beneficiary.id, beneficiaryNameSnapshot: beneficiary.beneficiaryName, beneficiaryAccountSnapshot: beneficiary.iban, bankNameSnapshot: beneficiary.bankName, oracleApMappingId: oracleMapping.id, oracleVendorNameSnapshot: oracleMapping.vendorName, oracleVendorNumberSnapshot: oracleMapping.vendorNumber, oracleVendorSiteSnapshot: oracleMapping.vendorSiteCode, oracleOperatingUnitSnapshot: oracleMapping.operatingUnit, oracleOrgIdSnapshot: oracleMapping.orgId, oracleTermsNameSnapshot: oracleMapping.termsName, oracleInvoiceSourceSnapshot: oracleMapping.invoiceSource, oracleLineTypeSnapshot: oracleMapping.lineType, oracleInterfaceStatusSnapshot: oracleMapping.interfaceStatus, oracleAccountFlexfieldSnapshot: oracleMapping.concatenatedAccount, oracleCodeCombinationIdSnapshot: oracleMapping.codeCombinationId, paymentProcessingDate: paymentDate, payableAmountPaisa: totals.amountPaisa, caseCount: totals.caseCount, status: "Draft", makerId: input.user.id, createdAt: now, updatedAt: now })];
  for (const row of selected) queries.push(db.insert(paymentBatchCases).values({ batchId, caseId: row.id, addedAt: now }), db.update(cases).set({ status: "Draft Batch", updatedAt: now }).where(and(eq(cases.id, row.id), eq(cases.status, "Eligible for Payment"))), event(input.user.id, "CASE_ASSIGNED_TO_BATCH", batchId, null, { caseId: row.id, amountPaisa: row.visaFeePaisa }, null, correlationId, now));
  for (const row of totals.breakups) queries.push(db.insert(paymentBatchBookingBreakups).values({ id: uid(), batchId, bookingDate: new Date(`${row.bookingDate}T00:00:00Z`), caseCount: row.caseCount, amountPaisa: row.amountPaisa, createdAt: now }));
  queries.push(db.insert(statusHistory).values({ id: uid(), entityType: "payment_batch", entityId: batchId, fromStatus: null, toStatus: "Draft", changedBy: input.user.id, reason: "Payment batch created", correlationId, changedAt: now }), event(input.user.id, "PAYMENT_BATCH_CREATED", batchId, null, { batchReference, ...totals, beneficiaryId: beneficiary.id }, null, correlationId, now));
  try { await db.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]); } catch { throw new PaymentControlError("BATCH_CREATE_CONFLICT", "Batch creation conflicted with another assignment. Refresh and retry.", 409); }
  return { batchId, batchReference, ...totals };
}

const nextStatus = { submit: "Submitted for Approval", approve: "Approved", return: "Returned for Amendment", reject: "Rejected", cancel: "Cancelled", dispatch: "Sent to Bank" } as const;
export async function transitionPaymentBatch(input: { batchId: string; action: keyof typeof nextStatus; remarks?: string; user: AuthorizedUser }) {
  assertPermission(input.user.roles, ["approve", "return", "reject"].includes(input.action) ? "batch:approve" : input.action === "dispatch" ? "batch:dispatch" : "batch:create");
  const db = getDb(), row = (await db.select().from(paymentBatches).where(eq(paymentBatches.id, input.batchId)).limit(1))[0]; if (!row) throw new PaymentControlError("BATCH_NOT_FOUND", "Payment batch not found.", 404);
  try { assertBatchAction(row.status as BatchStatus, input.action, row.makerId, input.user.id, input.remarks); } catch (error) { throw new PaymentControlError("INVALID_BATCH_ACTION", (error as Error).message, 409); }
  const to = nextStatus[input.action], now = new Date(), correlationId = uid(), actionName = input.action === "dispatch" ? "BANK_DISPATCHED" : `PAYMENT_BATCH_${input.action.toUpperCase()}`;
  const update = { status: to, updatedAt: now, ...(input.action === "submit" ? { submittedAt: now } : {}), ...(input.action === "approve" ? { checkerId: input.user.id, approvedAt: now } : {}) };
  const queries: BatchItem<"sqlite">[] = [db.update(paymentBatches).set(update).where(and(eq(paymentBatches.id, row.id), eq(paymentBatches.status, row.status))), db.insert(statusHistory).values({ id: uid(), entityType: "payment_batch", entityId: row.id, fromStatus: row.status, toStatus: to, changedBy: input.user.id, reason: input.remarks?.trim() || null, correlationId, changedAt: now }), event(input.user.id, actionName, row.id, { status: row.status }, { status: to }, input.remarks?.trim() || null, correlationId, now)];
  await db.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]); return { status: to };
}
