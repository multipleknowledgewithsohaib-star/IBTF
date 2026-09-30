export const batchStatuses = ["Draft", "Submitted for Approval", "Returned for Amendment", "Approved", "Rejected", "Sent to Bank", "Cancelled"] as const;
export type BatchStatus = (typeof batchStatuses)[number];

export type CandidateCase = { id: string; status: string; embassyId: string; vacId: string; bookingDate: Date; visaFeePaisa: number; alreadyBatched?: boolean };
export type Breakup = { bookingDate: string; caseCount: number; amountPaisa: number };

export function assertEligibleComposition(rows: readonly CandidateCase[], embassyId: string, vacId: string): void {
  if (!rows.length) throw new Error("At least one eligible case is required.");
  for (const row of rows) {
    if (row.status !== "Eligible for Payment") throw new Error(`Case ${row.id} is not eligible for payment.`);
    if (row.visaFeePaisa === 0) throw new Error(`Case ${row.id} has zero payable amount and is retained as an exception only.`);
    if (row.alreadyBatched) throw new Error(`Case ${row.id} is already assigned to a payment batch.`);
    if (row.embassyId !== embassyId || row.vacId !== vacId) throw new Error("A batch must contain one Embassy/Consulate and one VAC.");
    if (!Number.isSafeInteger(row.visaFeePaisa) || row.visaFeePaisa < 0) throw new Error("Case amounts must be non-negative integer paisa.");
  }
}

export function calculateComposition(rows: readonly Pick<CandidateCase, "bookingDate" | "visaFeePaisa">[]) {
  if (rows.some((row) => row.visaFeePaisa === 0)) throw new Error("Zero-amount cases cannot enter payable composition.");
  const map = new Map<string, Breakup>();
  let amountPaisa = 0;
  for (const row of rows) {
    if (!Number.isSafeInteger(row.visaFeePaisa) || row.visaFeePaisa < 0) throw new Error("Case amounts must be non-negative integer paisa.");
    amountPaisa += row.visaFeePaisa;
    if (!Number.isSafeInteger(amountPaisa)) throw new Error("Batch total exceeds safe integer precision.");
    const date = row.bookingDate.toISOString().slice(0, 10);
    const current = map.get(date) ?? { bookingDate: date, caseCount: 0, amountPaisa: 0 };
    current.caseCount += 1; current.amountPaisa += row.visaFeePaisa; map.set(date, current);
  }
  const breakups = [...map.values()].sort((a, b) => a.bookingDate.localeCompare(b.bookingDate));
  if (breakups.reduce((n, row) => n + row.caseCount, 0) !== rows.length || breakups.reduce((n, row) => n + row.amountPaisa, 0) !== amountPaisa) throw new Error("Booking-date breakup does not reconcile to batch totals.");
  return { caseCount: rows.length, amountPaisa, breakups };
}

export function beneficiaryEffective(account: { isActive: boolean; approvalStatus: string; effectiveFrom: Date; effectiveTo: Date | null }, paymentDate: Date) {
  return account.isActive && account.approvalStatus === "APPROVED" && account.effectiveFrom <= paymentDate && (!account.effectiveTo || account.effectiveTo >= paymentDate);
}

export function assertBatchAction(status: BatchStatus, action: "edit" | "submit" | "approve" | "return" | "reject" | "cancel" | "dispatch", makerId: string, actorId: string, remarks?: string) {
  const permitted: Record<typeof action, readonly BatchStatus[]> = { edit: ["Draft", "Returned for Amendment"], submit: ["Draft", "Returned for Amendment"], approve: ["Submitted for Approval"], return: ["Submitted for Approval"], reject: ["Submitted for Approval"], cancel: ["Draft", "Returned for Amendment", "Approved"], dispatch: ["Approved"] };
  if (!permitted[action].includes(status)) throw new Error(`${action} is blocked while batch is ${status}.`);
  if (action === "approve" && makerId === actorId) throw new Error("Maker cannot approve their own batch.");
  if (["approve", "return", "reject"].includes(action) && !remarks?.trim()) throw new Error("Remarks are mandatory for this checker action.");
}
