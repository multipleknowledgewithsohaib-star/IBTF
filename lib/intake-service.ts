import { and, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getDb } from "@/db";
import { auditEvents, cases, columnMappings, embassies, fileUploads, systemRules, uploadRows, vacs, validationErrors } from "@/db/schema";
import { activeMappings, defaultMappings, fileTypes, isSupportedManifestUpload, parseCsv, repeatWithinWindow, validateManifestCsv, validateManifestTable, type IntakeError, type IntakeFileType } from "@/lib/intake";
import { normalizeSpreadsheetDate, parseSpreadsheet, SpreadsheetError } from "@/lib/spreadsheet";
import type { AuthorizedUser } from "@/app/access";

export class IntakeControlError extends Error { constructor(public code: string, message: string, public status = 400) { super(message); } }
const allowedMedia = new Set(["text/csv", "application/csv", "application/vnd.ms-excel", "application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
const MAX_BYTES = 10 * 1024 * 1024;
const id = () => crypto.randomUUID();
async function sha256(bytes: Uint8Array) { return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer))].map((b) => b.toString(16).padStart(2, "0")).join(""); }
function audit(actorId: string, action: string, entityType: string, entityId: string, after: unknown, correlationId: string, reason?: string) { return getDb().insert(auditEvents).values({ id: id(), actorId, action, entityType, entityId, beforeJson: null, afterJson: JSON.stringify(after), reason: reason ?? null, correlationId, ipAddress: null, occurredAt: new Date() }); }

export async function ingestFile(input: { file: File; selectedType: string; submissionDate?: string; user: AuthorizedUser }) {
  if (!fileTypes.includes(input.selectedType as IntakeFileType)) throw new IntakeControlError("INVALID_FILE_TYPE", "Select a supported operational file type.");
  if (!input.file.name || input.file.size === 0 || input.file.size > MAX_BYTES) throw new IntakeControlError("INVALID_FILE", "File must be non-empty and no larger than 10 MB.");
  const mediaType = input.file.type || "application/octet-stream";
  if (!allowedMedia.has(mediaType) && !input.file.name.toLowerCase().endsWith(".csv")) throw new IntakeControlError("UNSUPPORTED_MEDIA_TYPE", "Only CSV, XLSX, XLS, and PDF evidence is accepted.");
  const bytes = new Uint8Array(await input.file.arrayBuffer()); const hash = await sha256(bytes); const db = getDb();
  if ((await db.select({ id: fileUploads.id }).from(fileUploads).where(eq(fileUploads.fileHash, hash)).limit(1))[0]) throw new IntakeControlError("DUPLICATE_FILE_HASH", "This exact file has already been preserved and cannot be reprocessed.", 409);
  const fileType = input.selectedType as IntakeFileType; const lowerName = input.file.name.toLowerCase();
  if (fileType === "VISA_MANIFEST" && !isSupportedManifestUpload(input.file.name, mediaType)) throw new IntakeControlError("UNSUPPORTED_MANIFEST_FORMAT", "Visa manifests must be CSV, XLS, or XLSX files with a matching media type.");
  const detectedType = lowerName.includes("scb") ? "SCB_CONFIRMATION" : lowerName.includes("embassy") ? "EMBASSY_SUBMISSION" : lowerName.includes("fee") || lowerName.includes("applicant") ? "FEE_CUM_APPLICANT" : lowerName.includes("manifest") ? "VISA_MANIFEST" : "UNKNOWN";
  const uploadId = id(); const correlationId = id(); const createdAt = new Date(); let errors: IntakeError[] = []; let staged: { rowNumber: number; raw: unknown; normalized?: Record<string, unknown>; errors: IntakeError[] }[] = []; let caseValues: (typeof cases.$inferInsert)[] = [];
  if (fileType === "VISA_MANIFEST") {
    const configured = await db.select().from(columnMappings).where(and(eq(columnMappings.fileType, fileType), eq(columnMappings.isActive, true)));
    const mappings = configured.length ? activeMappings(configured.map((mapping) => ({ canonicalField: mapping.canonicalField as (typeof defaultMappings)[number]["canonicalField"], headerVariation: mapping.headerVariation, required: mapping.isRequired, isActive: mapping.isActive }))) : defaultMappings;
    let result: ReturnType<typeof validateManifestCsv>;
    if (lowerName.endsWith(".xls") || lowerName.endsWith(".xlsx")) {
      try {
        const workbook = parseSpreadsheet(bytes, input.file.name, ["Manifest", "Visa Manifest", "Sheet1"]);
        const header = workbook.rows[0]?.map((cell) => cell?.value.trim().toLowerCase() ?? "") ?? [];
        const dateHeaders = new Set(mappings.filter((mapping) => mapping.canonicalField === "bookingDate" || mapping.canonicalField === "submissionDate").map((mapping) => mapping.headerVariation.trim().toLowerCase()));
        const table = workbook.rows.map((row, rowIndex) => row.map((cell, columnIndex) => {
          if (!cell) return "";
          if (rowIndex > 0 && dateHeaders.has(header[columnIndex] ?? "")) return normalizeSpreadsheetDate(cell, workbook.date1904);
          return cell.value;
        }));
        result = validateManifestTable(table, mappings);
      } catch (error) {
        const controlled = error instanceof SpreadsheetError ? error : new SpreadsheetError("SPREADSHEET_PARSING_FAILED", "Workbook could not be parsed safely.");
        result = { rows: [], errors: [{ rowNumber: 1, code: controlled.code, explanation: controlled.message }], valid: false };
      }
    } else result = validateManifestCsv(new TextDecoder("utf-8", { fatal: true }).decode(bytes), mappings);
    staged = result.rows; errors = result.errors;
    const validRows = staged.flatMap((r) => r.normalized ? [r.normalized as unknown as ReturnType<typeof validateManifestCsv>["rows"][number]["normalized"] & {}] : []);
    const normalizedCases = validRows.map((r) => r!.normalizedCaseNumber); const normalizedBookings = validRows.map((r) => r!.normalizedBookingNumber);
    const prior = normalizedCases.length ? await db.select().from(cases).where(inArray(cases.normalizedCaseNumber, normalizedCases)) : [];
    const bookingPrior = normalizedBookings.length ? await db.select().from(cases).where(inArray(cases.normalizedBookingNumber, normalizedBookings)) : [];
    for (const row of staged) if (row.normalized) {
      const n = row.normalized as unknown as NonNullable<(typeof result.rows)[number]["normalized"]>;
      if (bookingPrior.some((p) => p.normalizedBookingNumber === n.normalizedBookingNumber)) { const e = { rowNumber: row.rowNumber, code: "NORMALIZED_BOOKING_ALREADY_EXISTS", field: "bookingNumber", explanation: "The normalized booking identifier already exists." }; row.errors.push(e); errors.push(e); }
    }
    if (!errors.length) {
      const embassyRows = await db.select().from(embassies); const vacRows = await db.select().from(vacs);
      const repeatDays = Number((await db.select().from(systemRules).where(eq(systemRules.code, "REPEAT_WINDOW_DAYS")))[0]?.value ?? "14");
      for (const row of staged) { const n = row.normalized as unknown as NonNullable<(typeof result.rows)[number]["normalized"]>; const embassy = embassyRows.find((e) => e.code === n.embassy && e.isActive); const vac = vacRows.find((v) => v.code === n.vac && v.isActive);
        if (!embassy) { const e = { rowNumber: row.rowNumber, code: "INVALID_EMBASSY", field: "embassy", explanation: "Embassy is not an active master value." }; errors.push(e); row.errors.push(e); }
        if (!vac) { const e = { rowNumber: row.rowNumber, code: "INVALID_VAC", field: "vac", explanation: "VAC is not an active master value." }; errors.push(e); row.errors.push(e); }
        if (embassy && vac) { const repeated = prior.some((p) => p.normalizedCaseNumber === n.normalizedCaseNumber && repeatWithinWindow(p.submissionDate, new Date(`${n.submissionDate}T00:00:00Z`), repeatDays)); caseValues.push({ id: id(), normalizedCaseNumber: n.normalizedCaseNumber, normalizedBookingNumber: n.normalizedBookingNumber, originalCaseNumber: n.caseNumber, originalBookingNumber: n.bookingNumber, embassyId: embassy.id, vacId: vac.id, sourceUploadId: uploadId, bookingDate: new Date(`${n.bookingDate}T00:00:00Z`), submissionDate: new Date(`${n.submissionDate}T00:00:00Z`), visaFeePaisa: n.visaFeePaisa, status: repeated ? "Business Decision Required" : "Eligible for Payment", createdAt, updatedAt: createdAt }); }
      }
    }
  } else {
    // FEE_CUM_APPLICANT and embassy submissions are immutable supporting evidence.
    // They are staged for controlled later linking and never create or overwrite cases.
    const csvRows = lowerName.endsWith(".csv") ? parseCsv(new TextDecoder().decode(bytes)) : [];
    staged = csvRows.slice(1).map((row, index) => ({ rowNumber: index + 2, raw: row, errors: [] }));
  }
  const valid = errors.length === 0; if (!valid) caseValues = [];
  const queries: BatchItem<"sqlite">[] = [db.insert(fileUploads).values({ id: uploadId, originalFileName: input.file.name.replace(/[\\/]/g, "_"), fileHash: hash, fileType, detectedType, mediaType, originalContentBase64: Buffer.from(bytes).toString("base64"), submissionDate: input.submissionDate ? new Date(`${input.submissionDate}T00:00:00Z`) : null, uploaderId: input.user.id, rowCount: staged.length, acceptedCount: valid ? staged.length : 0, rejectedCount: valid ? 0 : staged.length, status: valid ? "Validated" : "Validation Failed", createdAt }), audit(input.user.id, "FILE_UPLOADED", "file_upload", uploadId, { hash, fileType, detectedType, rowCount: staged.length }, correlationId)];
  for (const row of staged) { const rowId = id(); queries.push(db.insert(uploadRows).values({ id: rowId, uploadId, rowNumber: row.rowNumber, rawJson: JSON.stringify(row.raw), normalizedJson: row.normalized ? JSON.stringify(row.normalized) : null, isValid: valid && row.errors.length === 0, createdAt })); for (const error of row.errors) queries.push(db.insert(validationErrors).values({ id: id(), uploadRowId: rowId, errorCode: error.code, fieldName: error.field ?? null, explanation: error.explanation, createdAt })); }
  if (!valid && errors.some((e) => e.rowNumber === 1)) { const rowId = id(); queries.push(db.insert(uploadRows).values({ id: rowId, uploadId, rowNumber: 1, rawJson: "{}", normalizedJson: null, isValid: false, createdAt })); for (const error of errors.filter((e) => e.rowNumber === 1)) queries.push(db.insert(validationErrors).values({ id: id(), uploadRowId: rowId, errorCode: error.code, fieldName: error.field ?? null, explanation: error.explanation, createdAt })); }
  if (valid) { for (const value of caseValues) queries.push(db.insert(cases).values(value)); queries.push(audit(input.user.id, "FILE_VALIDATED", "file_upload", uploadId, { accepted: staged.length }, correlationId), audit(input.user.id, "OPERATIONAL_DATA_POSTED", "file_upload", uploadId, { cases: caseValues.length }, correlationId)); for (const c of caseValues.filter((c) => c.status === "Business Decision Required")) queries.push(audit(input.user.id, "REPEAT_SUBMISSION_DETECTED", "case", c.id, { status: c.status }, correlationId)); } else queries.push(audit(input.user.id, "FILE_VALIDATION_FAILED", "file_upload", uploadId, { errorCount: errors.length, postedCases: 0 }, correlationId));
  await db.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]); return { uploadId, status: valid ? "Validated" : "Validation Failed", rowCount: staged.length, acceptedCount: valid ? staged.length : 0, rejectedCount: valid ? 0 : staged.length, errors: errors.length };
}
