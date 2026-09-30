import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  auditEvents, beneficiaryBankAccounts, businessDecisions, cases, confirmationDocuments,
  embassies, fileUploads, oracleApAccountMappings, paymentBatchBookingBreakups,
  paymentBatchCases, paymentBatches, reconciliationResults, uatRuns, uatScenarioResults,
  uploadRows, userAccessHistory, validationErrors, vacs,
} from "@/db/schema";
import { buildUatScenarioResults, calculateOverallResult, maskAccount, type UatEvidenceSnapshot } from "./uat-report.ts";

export class UatReportError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) { super(message); this.code = code; this.status = status; }
}

function safeLabel(value: string, label: string, max = 120): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max || /[\r\n<>]/.test(normalized)) throw new UatReportError("INVALID_UAT_CONTEXT", `${label} is required and must contain safe printable text.`);
  return normalized;
}

async function collectSnapshot(): Promise<UatEvidenceSnapshot> {
  const db = getDb();
  const [uploads, stagedRows, errors, caseRows, decisions, batches, assignments, breakups, embassyRows, vacRows, beneficiaryRows, apRows, reconRows, documents, accessRows, audits] = await Promise.all([
    db.select({ id: fileUploads.id, fileType: fileUploads.fileType, status: fileUploads.status, rowCount: fileUploads.rowCount, acceptedCount: fileUploads.acceptedCount, rejectedCount: fileUploads.rejectedCount }).from(fileUploads),
    db.select({ id: uploadRows.id, uploadId: uploadRows.uploadId }).from(uploadRows),
    db.select({ uploadRowId: validationErrors.uploadRowId, errorCode: validationErrors.errorCode }).from(validationErrors),
    db.select({ id: cases.id, embassyId: cases.embassyId, vacId: cases.vacId, visaFeePaisa: cases.visaFeePaisa, status: cases.status }).from(cases),
    db.select({ id: businessDecisions.id }).from(businessDecisions),
    db.select({ id: paymentBatches.id, status: paymentBatches.status, makerId: paymentBatches.makerId, checkerId: paymentBatches.checkerId, paymentProcessingDate: paymentBatches.paymentProcessingDate, caseCount: paymentBatches.caseCount, oracleApMappingId: paymentBatches.oracleApMappingId, oracleVendorNumberSnapshot: paymentBatches.oracleVendorNumberSnapshot, oracleVendorSiteSnapshot: paymentBatches.oracleVendorSiteSnapshot, oracleOrgIdSnapshot: paymentBatches.oracleOrgIdSnapshot, oracleAccountFlexfieldSnapshot: paymentBatches.oracleAccountFlexfieldSnapshot }).from(paymentBatches),
    db.select({ caseId: paymentBatchCases.caseId }).from(paymentBatchCases),
    db.select({ batchId: paymentBatchBookingBreakups.batchId, bookingDate: paymentBatchBookingBreakups.bookingDate }).from(paymentBatchBookingBreakups),
    db.select({ id: embassies.id, name: embassies.name }).from(embassies),
    db.select({ id: vacs.id, code: vacs.code, name: vacs.name }).from(vacs),
    db.select({ embassyId: beneficiaryBankAccounts.embassyId, vacId: beneficiaryBankAccounts.vacId, beneficiaryName: beneficiaryBankAccounts.beneficiaryName, iban: beneficiaryBankAccounts.iban, isActive: beneficiaryBankAccounts.isActive, approvalStatus: beneficiaryBankAccounts.approvalStatus, effectiveFrom: beneficiaryBankAccounts.effectiveFrom, effectiveTo: beneficiaryBankAccounts.effectiveTo }).from(beneficiaryBankAccounts),
    db.select({ isActive: oracleApAccountMappings.isActive, approvalStatus: oracleApAccountMappings.approvalStatus, effectiveFrom: oracleApAccountMappings.effectiveFrom, effectiveTo: oracleApAccountMappings.effectiveTo }).from(oracleApAccountMappings),
    db.select({ outcome: reconciliationResults.outcome }).from(reconciliationResults),
    db.select({ id: confirmationDocuments.id }).from(confirmationDocuments),
    db.select({ id: userAccessHistory.id }).from(userAccessHistory),
    db.select({ id: auditEvents.id }).from(auditEvents),
  ]);
  const uploadByRow = new Map(stagedRows.map((row) => [row.id, row.uploadId]));
  const dateErrorUploadIds = new Set(errors.filter((row) => row.errorCode === "INVALID_DATE").map((row) => uploadByRow.get(row.uploadRowId)).filter((id): id is string => Boolean(id)));
  const rejectedDateUploads = uploads.filter((row) => dateErrorUploadIds.has(row.id) && row.rejectedCount === row.rowCount && row.acceptedCount === 0).length;
  const assignedIds = new Set(assignments.map((row) => row.caseId));
  const zeroRows = caseRows.filter((row) => row.visaFeePaisa === 0);
  const approvedBatches = batches.filter((row) => ["Approved", "Sent to Bank", "Processed Successfully"].includes(row.status) && row.checkerId);
  const breakupByBatch = new Map<string, Date[]>();
  for (const row of breakups) breakupByBatch.set(row.batchId, [...(breakupByBatch.get(row.batchId) ?? []), row.bookingDate]);
  const earlierDateBatches = batches.filter((batch) => (breakupByBatch.get(batch.id) ?? []).some((date) => date < batch.paymentProcessingDate));
  const spainEmbassyIds = new Set(embassyRows.filter((row) => row.name.toUpperCase().includes("SPAIN")).map((row) => row.id));
  const italyEmbassyIds = new Set(embassyRows.filter((row) => row.name.toUpperCase().includes("ITALY")).map((row) => row.id));
  const vacCodeById = new Map(vacRows.map((row) => [row.id, row.code.toUpperCase()]));
  const spainVacs = new Set(caseRows.filter((row) => spainEmbassyIds.has(row.embassyId)).map((row) => row.vacId));
  const now = new Date();
  const effective = (row: { isActive: boolean; approvalStatus: string; effectiveFrom: Date; effectiveTo: Date | null }) => row.isActive && row.approvalStatus === "APPROVED" && row.effectiveFrom <= now && (!row.effectiveTo || row.effectiveTo >= now);
  const approvedBeneficiaries = beneficiaryRows.filter(effective);
  const approvedAp = apRows.filter(effective);
  const italyConsulateBeneficiaries = approvedBeneficiaries.filter((row) => italyEmbassyIds.has(row.embassyId) && row.beneficiaryName.trim().toUpperCase() === "CONSULATE OF ITALY");
  const normalizedItalyIban = "PK18HABB0025257001606801";
  const allowedItalyConsulateVacs = new Set(["KHI", "UET"]);
  const correctlyRoutedItaly = italyConsulateBeneficiaries.filter((row) => row.iban.replace(/\s/g, "").toUpperCase() === normalizedItalyIban && allowedItalyConsulateVacs.has(vacCodeById.get(row.vacId) ?? ""));
  const oracleComplete = batches.filter((row) => row.oracleApMappingId && row.oracleVendorNumberSnapshot && row.oracleVendorSiteSnapshot && row.oracleOrgIdSnapshot && row.oracleAccountFlexfieldSnapshot);
  const oracleIncomplete = batches.filter((row) => row.caseCount > 0 && !oracleComplete.some((complete) => complete.id === row.id));

  return {
    validManifestUploads: uploads.filter((row) => row.fileType === "VISA_MANIFEST" && row.status === "Validated" && row.acceptedCount > 0).length,
    rejectedDateUploads,
    duplicateOrRepeatCases: caseRows.filter((row) => ["Business Decision Required", "Halted"].includes(row.status)).length,
    decisionsRecorded: decisions.length,
    zeroFeeCases: zeroRows.length,
    zeroFeeCasesInBatches: zeroRows.filter((row) => assignedIds.has(row.id)).length,
    approvedBatches: approvedBatches.length,
    selfApprovedBatches: approvedBatches.filter((row) => row.makerId === row.checkerId).length,
    batchesWithEarlierBookingDates: earlierDateBatches.length,
    spainVacCount: spainVacs.size,
    approvedEffectiveBeneficiaries: approvedBeneficiaries.length,
    approvedEffectiveOracleMappings: approvedAp.length,
    italyConsulateBeneficiaries: italyConsulateBeneficiaries.length,
    italyCorrectlyRoutedBeneficiaries: correctlyRoutedItaly.length,
    italyInvalidConsulateBeneficiaries: italyConsulateBeneficiaries.length - correctlyRoutedItaly.length,
    italyAccountSuffixes: [...new Set(italyConsulateBeneficiaries.map((row) => maskAccount(row.iban)))],
    reconciliationOutcomes: reconRows.map((row) => row.outcome),
    lockedConfirmations: documents.length,
    oracleSnapshotBatches: oracleComplete.length,
    batchesMissingOracleSnapshot: oracleIncomplete.length,
    accessHistoryEvents: accessRows.length,
    auditEvents: audits.length,
    processedCases: caseRows.filter((row) => row.status === "Processed Successfully").length,
  };
}

export async function createUatRun(input: { serverName: string; sourceCommit: string; actorId: string }) {
  const serverName = safeLabel(input.serverName, "Server name");
  const sourceCommit = safeLabel(input.sourceCommit, "Source commit", 64);
  if (!/^[a-f0-9]{7,64}$/i.test(sourceCommit)) throw new UatReportError("INVALID_SOURCE_COMMIT", "Source commit must be a 7 to 64 character hexadecimal Git commit identifier.");
  const snapshot = await collectSnapshot();
  const results = buildUatScenarioResults(snapshot);
  const overall = calculateOverallResult(results);
  const generatedAt = new Date();
  const id = crypto.randomUUID();
  const runReference = `UAT-${generatedAt.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}-${id.slice(0, 8).toUpperCase()}`;
  const db = getDb();
  await db.batch([
    db.insert(uatRuns).values({ id, runReference, environment: "STANDALONE_UAT", serverName, applicationVersion: "0.1.0", sourceCommit: sourceCommit.toLowerCase(), overallResult: overall, passCount: results.filter((row) => row.result === "PASS").length, failCount: results.filter((row) => row.result === "FAIL").length, blockedCount: results.filter((row) => row.result === "BLOCKED").length, notExecutedCount: results.filter((row) => row.result === "NOT_EXECUTED").length, generatedBy: input.actorId, generatedAt }),
    db.insert(uatScenarioResults).values(results.map((row) => ({ id: crypto.randomUUID(), runId: id, scenarioCode: row.code, category: row.category, title: row.title, expectedOutcome: row.expected, actualOutcome: row.actual, result: row.result, evidenceJson: JSON.stringify(row.evidence), evaluatedAt: generatedAt }))),
    db.insert(auditEvents).values({ id: crypto.randomUUID(), actorId: input.actorId, action: "UAT_REPORT_GENERATED", entityType: "uat_run", entityId: id, afterJson: JSON.stringify({ runReference, overallResult: overall, sourceCommit: sourceCommit.toLowerCase() }), reason: "Frozen standalone UAT evidence snapshot generated.", correlationId: runReference, occurredAt: generatedAt }),
  ]);
  return { id, runReference, overallResult: overall };
}

export async function getUatRun(id: string) {
  const db = getDb();
  const [run] = await db.select().from(uatRuns).where(eq(uatRuns.id, id));
  if (!run) throw new UatReportError("UAT_RUN_NOT_FOUND", "UAT run was not found.", 404);
  const results = await db.select().from(uatScenarioResults).where(eq(uatScenarioResults.runId, id));
  return { run, results: results.sort((a, b) => a.scenarioCode.localeCompare(b.scenarioCode)) };
}
