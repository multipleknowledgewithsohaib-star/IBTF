export const fileTypes = ["VISA_MANIFEST", "FEE_CUM_APPLICANT", "EMBASSY_SUBMISSION", "SCB_CONFIRMATION"] as const;
export type IntakeFileType = (typeof fileTypes)[number];
export type CanonicalField = "caseNumber" | "bookingNumber" | "embassy" | "vac" | "bookingDate" | "submissionDate" | "visaFee";
export type Mapping = { canonicalField: CanonicalField; headerVariation: string; required: boolean };
export type IntakeError = { rowNumber: number; code: string; field?: string; explanation: string };
export type NormalizedManifestRow = { caseNumber: string; bookingNumber: string; normalizedCaseNumber: string; normalizedBookingNumber: string; embassy: string; vac: string; bookingDate: string; submissionDate: string; visaFeePaisa: number };

const manifestMediaByExtension = new Map<string, ReadonlySet<string>>([
  [".csv", new Set(["text/csv", "application/csv"])],
  [".xls", new Set(["application/vnd.ms-excel"])],
  [".xlsx", new Set(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"])],
]);

/** A manifest is authoritative, so both its extension and declared media type must agree. */
export function isSupportedManifestUpload(fileName: string, mediaType: string): boolean {
  const lowerName = fileName.toLowerCase();
  const extension = [...manifestMediaByExtension.keys()].find((candidate) => lowerName.endsWith(candidate));
  return extension !== undefined && manifestMediaByExtension.get(extension)!.has(mediaType.toLowerCase());
}

const mandatory: CanonicalField[] = ["caseNumber", "bookingNumber", "embassy", "vac", "bookingDate", "submissionDate", "visaFee"];
export const defaultMappings: Mapping[] = [
  ["caseNumber", "case number"], ["caseNumber", "case no"], ["bookingNumber", "booking number"], ["bookingNumber", "booking id"],
  ["embassy", "embassy"], ["vac", "vac"], ["vac", "location"], ["bookingDate", "booking date"],
  ["submissionDate", "submission date"], ["submissionDate", "reporting date"], ["visaFee", "visa fee"], ["visaFee", "amount"],
].map(([canonicalField, headerVariation]) => ({ canonicalField: canonicalField as CanonicalField, headerVariation, required: true }));

export function activeMappings(
  configured: readonly (Mapping & { isActive: boolean })[],
): Mapping[] {
  return configured
    .filter((mapping) => mapping.isActive)
    .map(({ canonicalField, headerVariation, required }) => ({
      canonicalField,
      headerVariation,
      required,
    }));
}

export function normalizeIdentifier(value: string): string { return value.normalize("NFKC").trim().toUpperCase().replace(/[^A-Z0-9]/g, ""); }
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) { const c = text[i]; if (c === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = !quoted; else if (c === "," && !quoted) { row.push(cell.trim()); cell = ""; } else if ((c === "\n" || c === "\r") && !quoted) { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; } else cell += c; }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); return rows;
}
export function parsePaisa(value: string): number | null { if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null; const [w, f = ""] = value.trim().split("."); const paisa = Number(w) * 100 + Number(f.padEnd(2, "0")); return Number.isSafeInteger(paisa) ? paisa : null; }
export function parsePkrPaisa(value: string): number | null {
  const normalized = value.trim().replace(/^PKR\s*/i, "").replace(/,/g, "");
  return parsePaisa(normalized);
}
export function isIsoDate(value: string): boolean { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const d = new Date(`${value}T00:00:00Z`); return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value; }
export function validateManifestCsv(text: string, mappings: readonly Mapping[] = defaultMappings) {
  return validateManifestTable(parseCsv(text), mappings);
}
export function validateManifestTable(parsed: readonly (readonly string[])[], mappings: readonly Mapping[] = defaultMappings) {
  const headers = parsed[0]?.map((h) => h.trim().toLowerCase()) ?? [];
  const index = new Map<CanonicalField, number>();
  for (const m of mappings) { const found = headers.indexOf(m.headerVariation.trim().toLowerCase()); if (found >= 0 && !index.has(m.canonicalField)) index.set(m.canonicalField, found); }
  const fileErrors: IntakeError[] = mandatory.filter((f) => !index.has(f)).map((f) => ({ rowNumber: 1, code: "MISSING_REQUIRED_HEADER", field: f, explanation: `No configured header was found for ${f}.` }));
  const rows: { rowNumber: number; raw: Record<string, string>; normalized?: NormalizedManifestRow; errors: IntakeError[] }[] = [];
  const seenBooking = new Set<string>(); const seenCase = new Set<string>(); const seenExactBooking = new Set<string>(); const seenExactCase = new Set<string>();
  parsed.slice(1).forEach((values, offset) => { const rowNumber = offset + 2; const raw = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])); const get = (f: CanonicalField) => values[index.get(f) ?? -1]?.trim() ?? ""; const errors: IntakeError[] = [];
    for (const field of mandatory) if (!get(field)) errors.push({ rowNumber, code: "MISSING_REQUIRED_VALUE", field, explanation: `${field} is mandatory.` });
    const exactBooking = get("bookingNumber"); const exactCase = get("caseNumber"); const booking = normalizeIdentifier(exactBooking); const caseNo = normalizeIdentifier(exactCase);
    if (exactBooking && seenExactBooking.has(exactBooking)) errors.push({ rowNumber, code: "EXACT_DUPLICATE_BOOKING_IN_FILE", field: "bookingNumber", explanation: "The exact booking identifier repeats in this file." });
    else if (booking && seenBooking.has(booking)) errors.push({ rowNumber, code: "NORMALIZED_DUPLICATE_BOOKING_IN_FILE", field: "bookingNumber", explanation: "A format or case-insensitive equivalent booking identifier repeats in this file." });
    if (exactCase && seenExactCase.has(exactCase)) errors.push({ rowNumber, code: "EXACT_DUPLICATE_CASE_IN_FILE", field: "caseNumber", explanation: "The exact case identifier repeats in this file." });
    else if (caseNo && seenCase.has(caseNo)) errors.push({ rowNumber, code: "NORMALIZED_DUPLICATE_CASE_IN_FILE", field: "caseNumber", explanation: "A format or case-insensitive equivalent case identifier repeats in this file." });
    seenExactBooking.add(exactBooking); seenExactCase.add(exactCase); seenBooking.add(booking); seenCase.add(caseNo); const fee = parsePkrPaisa(get("visaFee"));
    if (get("visaFee") && fee === null) errors.push({ rowNumber, code: "INVALID_AMOUNT", field: "visaFee", explanation: "Amount must be a non-negative decimal with at most two decimal places." });
    for (const field of ["bookingDate", "submissionDate"] as const) if (get(field) && !isIsoDate(get(field))) errors.push({ rowNumber, code: "INVALID_DATE", field, explanation: `${field} must be a real date in YYYY-MM-DD format.` });
    const normalized = errors.length ? undefined : { caseNumber: get("caseNumber"), bookingNumber: get("bookingNumber"), normalizedCaseNumber: caseNo, normalizedBookingNumber: booking, embassy: get("embassy").toUpperCase(), vac: get("vac").toUpperCase(), bookingDate: get("bookingDate"), submissionDate: get("submissionDate"), visaFeePaisa: fee! };
    rows.push({ rowNumber, raw, normalized, errors });
  }); return { rows, errors: [...fileErrors, ...rows.flatMap((r) => r.errors)], valid: fileErrors.length === 0 && rows.length > 0 && rows.every((r) => !r.errors.length) };
}
export function repeatWithinWindow(priorSubmission: Date, currentSubmission: Date, days = 14): boolean { const delta = currentSubmission.valueOf() - priorSubmission.valueOf(); return delta >= 0 && delta <= days * 86_400_000; }
export function payableSummary(cases: readonly { status: string; visaFeePaisa: number }[]) { const eligible = cases.filter((c) => c.status === "Eligible for Payment" && c.visaFeePaisa > 0); return { count: eligible.length, amountPaisa: eligible.reduce((sum, c) => sum + c.visaFeePaisa, 0) }; }
