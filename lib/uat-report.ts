export const uatResultCodes = ["PASS", "FAIL", "BLOCKED", "NOT_EXECUTED"] as const;
export type UatResultCode = (typeof uatResultCodes)[number];

export type UatEvidenceSnapshot = {
  validManifestUploads: number;
  rejectedDateUploads: number;
  duplicateOrRepeatCases: number;
  decisionsRecorded: number;
  zeroFeeCases: number;
  zeroFeeCasesInBatches: number;
  approvedBatches: number;
  selfApprovedBatches: number;
  batchesWithEarlierBookingDates: number;
  spainVacCount: number;
  approvedEffectiveBeneficiaries: number;
  approvedEffectiveOracleMappings: number;
  italyConsulateBeneficiaries: number;
  italyCorrectlyRoutedBeneficiaries: number;
  italyInvalidConsulateBeneficiaries: number;
  italyAccountSuffixes: string[];
  reconciliationOutcomes: string[];
  lockedConfirmations: number;
  oracleSnapshotBatches: number;
  batchesMissingOracleSnapshot: number;
  accessHistoryEvents: number;
  auditEvents: number;
  processedCases: number;
};

export type UatScenarioResult = {
  code: string;
  category: string;
  title: string;
  expected: string;
  actual: string;
  result: UatResultCode;
  evidence: Record<string, unknown>;
};

function observed(condition: boolean, actual: string, otherwise: string): string {
  return condition ? actual : otherwise;
}

export function maskAccount(value: string): string {
  const normalized = value.replace(/\s/g, "");
  return normalized.length <= 4 ? "****" : `${"*".repeat(Math.min(8, normalized.length - 4))}${normalized.slice(-4)}`;
}

export function buildUatScenarioResults(s: UatEvidenceSnapshot): UatScenarioResult[] {
  const exceptionSet = new Set(s.reconciliationOutcomes);
  const exceptionCoverage = [
    exceptionSet.has("Duplicate Bank Reference"),
    exceptionSet.has("Amount Mismatch"),
    exceptionSet.has("Beneficiary Mismatch"),
    exceptionSet.has("Ambiguous Match"),
  ];
  const result = (pass: boolean, executed: boolean): UatResultCode => executed ? (pass ? "PASS" : "FAIL") : "NOT_EXECUTED";

  return [
    { code: "UAT-01", category: "Intake", title: "Valid manifest intake", expected: "A valid manifest is retained with hash, row count, accepted count and a validated result.", actual: observed(s.validManifestUploads > 0, `${s.validManifestUploads} validated manifest upload(s) found.`, "No validated manifest has been exercised on this server."), result: result(s.validManifestUploads > 0, s.validManifestUploads > 0), evidence: { validatedManifestUploads: s.validManifestUploads } },
    { code: "UAT-02", category: "Intake", title: "Invalid-date rejection", expected: "A manifest containing an invalid date is rejected as a whole with traceable validation evidence.", actual: observed(s.rejectedDateUploads > 0, `${s.rejectedDateUploads} rejected upload(s) contain invalid-date evidence.`, "No whole-file invalid-date rejection evidence was found."), result: result(s.rejectedDateUploads > 0, s.rejectedDateUploads > 0), evidence: { rejectedDateUploads: s.rejectedDateUploads } },
    { code: "UAT-03", category: "Eligibility", title: "Duplicate and repeat hold", expected: "Duplicate or repeat submissions stay outside payable totals until a reasoned business decision is recorded.", actual: observed(s.duplicateOrRepeatCases + s.decisionsRecorded > 0, `${s.duplicateOrRepeatCases} held case(s); ${s.decisionsRecorded} decision(s).`, "No duplicate/repeat scenario has been exercised."), result: result(s.duplicateOrRepeatCases + s.decisionsRecorded > 0, s.duplicateOrRepeatCases + s.decisionsRecorded > 0), evidence: { heldCases: s.duplicateOrRepeatCases, decisions: s.decisionsRecorded } },
    { code: "UAT-04", category: "Eligibility", title: "Zero-fee exclusion", expected: "Zero-fee cases remain visible as exceptions and never enter a payment batch.", actual: s.zeroFeeCasesInBatches > 0 ? `${s.zeroFeeCasesInBatches} zero-fee case(s) were found in batches.` : observed(s.zeroFeeCases > 0, `${s.zeroFeeCases} zero-fee case(s) retained; none batched.`, "No zero-fee scenario has been exercised."), result: s.zeroFeeCasesInBatches > 0 ? "FAIL" : result(s.zeroFeeCases > 0, s.zeroFeeCases > 0), evidence: { zeroFeeCases: s.zeroFeeCases, zeroFeeCasesInBatches: s.zeroFeeCasesInBatches } },
    { code: "UAT-05", category: "Approval", title: "Maker-checker segregation", expected: "An approved batch has a checker different from its maker; self-approval remains blocked.", actual: s.selfApprovedBatches > 0 ? `${s.selfApprovedBatches} self-approved batch(es) found.` : observed(s.approvedBatches > 0, `${s.approvedBatches} approved batch(es); no self-approval found.`, "No approved batch has been exercised."), result: s.selfApprovedBatches > 0 ? "FAIL" : result(s.approvedBatches > 0, s.approvedBatches > 0), evidence: { approvedBatches: s.approvedBatches, selfApprovedBatches: s.selfApprovedBatches } },
    { code: "UAT-06", category: "Payment", title: "Payment date and booking-date breakup", expected: "One payment date can settle earlier booking dates while preserving count and amount breakup.", actual: observed(s.batchesWithEarlierBookingDates > 0, `${s.batchesWithEarlierBookingDates} batch(es) include earlier booking-date evidence.`, "No multi-date payment scenario has been exercised."), result: result(s.batchesWithEarlierBookingDates > 0, s.batchesWithEarlierBookingDates > 0), evidence: { batchesWithEarlierBookingDates: s.batchesWithEarlierBookingDates } },
    { code: "UAT-07", category: "Payment", title: "Spain multi-VAC coverage", expected: "Spain evidence is independently traceable across at least two VAC locations.", actual: `${s.spainVacCount} distinct Spain VAC location(s) found.`, result: result(s.spainVacCount >= 2, s.spainVacCount > 0), evidence: { distinctSpainVacs: s.spainVacCount } },
    { code: "UAT-08", category: "Master data", title: "Approved effective-dated masters", expected: "Both beneficiary and Oracle AP masters are approved, active, effective-dated and historically preserved.", actual: `${s.approvedEffectiveBeneficiaries} beneficiary row(s); ${s.approvedEffectiveOracleMappings} Oracle AP mapping(s).`, result: result(s.approvedEffectiveBeneficiaries > 0 && s.approvedEffectiveOracleMappings > 0, s.approvedEffectiveBeneficiaries + s.approvedEffectiveOracleMappings > 0), evidence: { approvedEffectiveBeneficiaries: s.approvedEffectiveBeneficiaries, approvedEffectiveOracleMappings: s.approvedEffectiveOracleMappings } },
    { code: "UAT-09", category: "Routing", title: "Italy beneficiary routing", expected: "Consulate of Italy uses approved IBAN PK18HABB0025257001606801 only for Karachi or Quetta/UET; evidence exposes only masked suffixes.", actual: s.italyInvalidConsulateBeneficiaries > 0 ? `${s.italyInvalidConsulateBeneficiaries} approved Consulate beneficiary row(s) have an incorrect account or VAC route.` : observed(s.italyCorrectlyRoutedBeneficiaries > 0, `${s.italyCorrectlyRoutedBeneficiaries} correctly routed Consulate beneficiary row(s): ${s.italyAccountSuffixes.join(", ")}.`, "No approved Consulate of Italy beneficiary evidence was found."), result: s.italyInvalidConsulateBeneficiaries > 0 ? "FAIL" : result(s.italyCorrectlyRoutedBeneficiaries > 0, s.italyConsulateBeneficiaries > 0), evidence: { approvedConsulateBeneficiaries: s.italyConsulateBeneficiaries, correctlyRoutedBeneficiaries: s.italyCorrectlyRoutedBeneficiaries, invalidBeneficiaries: s.italyInvalidConsulateBeneficiaries, maskedAccountSuffixes: s.italyAccountSuffixes } },
    { code: "UAT-10", category: "Reconciliation", title: "SCB exception coverage", expected: "Duplicate reference, wrong amount, unknown beneficiary and ambiguous-match scenarios remain visible and blocked.", actual: `${exceptionCoverage.filter(Boolean).length} of 4 required exception classes exercised.`, result: result(exceptionCoverage.every(Boolean), s.reconciliationOutcomes.length > 0), evidence: { observedOutcomes: [...exceptionSet].sort() } },
    { code: "UAT-11", category: "Confirmation", title: "Reconciled confirmation lock", expected: "Confirmation is generated only from reconciled data and retained as versioned evidence.", actual: observed(s.lockedConfirmations > 0, `${s.lockedConfirmations} versioned confirmation(s) found.`, "No confirmation generation has been exercised."), result: result(s.lockedConfirmations > 0, s.lockedConfirmations > 0), evidence: { confirmations: s.lockedConfirmations } },
    { code: "UAT-12", category: "Oracle AP", title: "Oracle AP snapshot completeness", expected: "Every exercised payment batch retains the approved vendor, site, ORG_ID and account-flexfield snapshot.", actual: s.batchesMissingOracleSnapshot > 0 ? `${s.batchesMissingOracleSnapshot} batch(es) lack a complete Oracle snapshot.` : observed(s.oracleSnapshotBatches > 0, `${s.oracleSnapshotBatches} batch(es) retain Oracle snapshots.`, "No Oracle AP-backed batch has been exercised."), result: s.batchesMissingOracleSnapshot > 0 ? "FAIL" : result(s.oracleSnapshotBatches > 0, s.oracleSnapshotBatches > 0), evidence: { completeOracleSnapshots: s.oracleSnapshotBatches, incompleteSnapshots: s.batchesMissingOracleSnapshot } },
    { code: "UAT-13", category: "Governance", title: "Access and audit evidence", expected: "Access changes and operational activity produce immutable, correlated evidence.", actual: `${s.accessHistoryEvents} access-history event(s); ${s.auditEvents} audit event(s).`, result: result(s.accessHistoryEvents > 0 && s.auditEvents > 0, s.accessHistoryEvents + s.auditEvents > 0), evidence: { accessHistoryEvents: s.accessHistoryEvents, auditEvents: s.auditEvents } },
    { code: "UAT-14", category: "Locking", title: "Processed-record preservation", expected: "Processed records remain present and protected from destructive change.", actual: observed(s.processedCases > 0, `${s.processedCases} processed case(s) retained.`, "No processed case has been exercised."), result: result(s.processedCases > 0, s.processedCases > 0), evidence: { processedCases: s.processedCases } },
  ];
}

export function calculateOverallResult(results: readonly UatScenarioResult[]): UatResultCode {
  if (results.some((row) => row.result === "FAIL")) return "FAIL";
  if (results.some((row) => row.result === "BLOCKED")) return "BLOCKED";
  if (results.some((row) => row.result === "NOT_EXECUTED")) return "NOT_EXECUTED";
  return results.length > 0 ? "PASS" : "NOT_EXECUTED";
}

function csvCell(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function uatResultsToCsv(results: readonly UatScenarioResult[]): string {
  const header = ["TEST_ID", "CATEGORY", "DESCRIPTION", "EXPECTED", "ACTUAL", "STATUS", "EVIDENCE"];
  return [header.map(csvCell).join(","), ...results.map((row) => [row.code, row.category, row.title, row.expected, row.actual, row.result, row.evidence].map(csvCell).join(","))].join("\n");
}
