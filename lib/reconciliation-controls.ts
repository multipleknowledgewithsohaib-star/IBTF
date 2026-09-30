export const reconciliationOutcomes = ["Matched", "Unmatched Bank Record", "Missing Bank Confirmation", "Amount Mismatch", "Beneficiary Mismatch", "Account Mismatch", "Date Mismatch", "Ambiguous Match", "Duplicate Bank Reference", "Parsing Exception", "Reversed or Superseded"] as const;
export type ReconciliationOutcome = typeof reconciliationOutcomes[number];
export type ConfirmationRecord = { bankReference: string; paymentDate: string; beneficiaryName: string; beneficiaryAccount: string; paidAmountPaisa: number; embassyReference?: string; vacReference?: string; narrative?: string };
export type CandidateBatch = { id: string; status: string; batchReference: string; embassyReference: string; vacReference: string; beneficiaryName: string; beneficiaryAccount: string; payableAmountPaisa: number; paymentProcessingDate: string };
const norm = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
export function parsePaisa(value: string): number { if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) throw new Error("INVALID_AMOUNT"); const [whole, fraction = ""] = value.trim().split("."); const paisa = Number(whole) * 100 + Number(fraction.padEnd(2, "0")); if (!Number.isSafeInteger(paisa)) throw new Error("INVALID_AMOUNT"); return paisa; }
export function validateConfirmationRecord(record: Partial<ConfirmationRecord>): string[] { const errors: string[] = []; if (!record.bankReference?.trim()) errors.push("SCB_BANK_REFERENCE_REQUIRED"); if (!/^\d{4}-\d{2}-\d{2}$/.test(record.paymentDate ?? "") || Number.isNaN(Date.parse(`${record.paymentDate}T00:00:00Z`))) errors.push("SCB_PAYMENT_DATE_INVALID"); if (!record.beneficiaryName?.trim()) errors.push("SCB_BENEFICIARY_REQUIRED"); if (!record.beneficiaryAccount?.trim()) errors.push("SCB_ACCOUNT_REQUIRED"); if (!Number.isSafeInteger(record.paidAmountPaisa) || (record.paidAmountPaisa ?? -1) < 0) errors.push("SCB_AMOUNT_INVALID"); return errors; }
export type MatchResult = { outcome: ReconciliationOutcome; batchId?: string; candidates?: string[]; expectedAmountPaisa?: number; variancePaisa?: number };
const withCandidate = (outcome: ReconciliationOutcome, record: ConfirmationRecord, rows: CandidateBatch[]): MatchResult => rows.length === 1
  ? { outcome, batchId: rows[0].id, expectedAmountPaisa: rows[0].payableAmountPaisa, variancePaisa: record.paidAmountPaisa - rows[0].payableAmountPaisa }
  : { outcome, ...(rows.length > 1 ? { candidates: rows.map((row) => row.id) } : {}) };
export function matchConfirmation(record: ConfirmationRecord, candidates: CandidateBatch[]): MatchResult {
  const eligible = candidates.filter((b) => b.status === "Sent to Bank");
  const identity = eligible.filter((b) => (!record.embassyReference || norm(b.embassyReference) === norm(record.embassyReference)) && (!record.vacReference || norm(b.vacReference) === norm(record.vacReference)));
  const account = identity.filter((b) => norm(b.beneficiaryAccount) === norm(record.beneficiaryAccount)); if (!account.length && identity.length) return withCandidate("Account Mismatch", record, identity);
  const beneficiary = account.filter((b) => norm(b.beneficiaryName) === norm(record.beneficiaryName)); if (!beneficiary.length && account.length) return withCandidate("Beneficiary Mismatch", record, account);
  const amount = beneficiary.filter((b) => b.payableAmountPaisa === record.paidAmountPaisa); if (!amount.length && beneficiary.length) return withCandidate("Amount Mismatch", record, beneficiary);
  const date = amount.filter((b) => b.paymentProcessingDate === record.paymentDate); if (!date.length && amount.length) return withCandidate("Date Mismatch", record, amount);
  if (date.length > 1) return { outcome: "Ambiguous Match", candidates: date.map((b) => b.id) };
  return date.length === 1 ? withCandidate("Matched", record, date) : { outcome: "Unmatched Bank Record" };
}
export function assertProcessedCaseTransition(from: string, to: string, approvedReconciliation: boolean): void {
  if (from !== "Processed Successfully") return;
  if (to !== "Reconciliation Exception" || !approvedReconciliation) throw new Error("PROCESSED_CASE_LOCKED");
}
export function assertConfirmationEligible(outcome: ReconciliationOutcome, status: string): void { if (outcome !== "Matched" || status !== "Reconciled") throw new Error("CONFIRMATION_NOT_RECONCILED"); }
export function buildBookingBreakup<T extends { bookingDate: string; amountPaisa: number }>(cases: T[]) { const map = new Map<string, { bookingDate: string; caseCount: number; amountPaisa: number }>(); for (const row of cases) { if (row.amountPaisa === 0) continue; const value = map.get(row.bookingDate) ?? { bookingDate: row.bookingDate, caseCount: 0, amountPaisa: 0 }; value.caseCount++; value.amountPaisa += row.amountPaisa; map.set(row.bookingDate, value); } return [...map.values()].sort((a,b) => a.bookingDate.localeCompare(b.bookingDate)); }
