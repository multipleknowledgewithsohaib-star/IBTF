export function formatPkr(paisa: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 2,
  }).format(paisa / 100);
}

export function amountsMatch(approvedPaisa: number, confirmedPaisa: number, tolerancePaisa: number): boolean {
  if (![approvedPaisa, confirmedPaisa, tolerancePaisa].every(Number.isSafeInteger)) return false;
  if (tolerancePaisa < 0) return false;
  return Math.abs(approvedPaisa - confirmedPaisa) <= tolerancePaisa;
}
