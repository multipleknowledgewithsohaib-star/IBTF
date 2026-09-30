import assert from "node:assert/strict";
import test from "node:test";
import { buildUatScenarioResults, calculateOverallResult, maskAccount, uatResultsToCsv, type UatEvidenceSnapshot } from "../lib/uat-report.ts";

const complete: UatEvidenceSnapshot = {
  validManifestUploads: 1, rejectedDateUploads: 1, duplicateOrRepeatCases: 1, decisionsRecorded: 1,
  zeroFeeCases: 1, zeroFeeCasesInBatches: 0, approvedBatches: 1, selfApprovedBatches: 0,
  batchesWithEarlierBookingDates: 1, spainVacCount: 2, approvedEffectiveBeneficiaries: 1, approvedEffectiveOracleMappings: 1,
  italyConsulateBeneficiaries: 1, italyCorrectlyRoutedBeneficiaries: 1, italyInvalidConsulateBeneficiaries: 0, italyAccountSuffixes: ["********6801"],
  reconciliationOutcomes: ["Duplicate Bank Reference", "Amount Mismatch", "Beneficiary Mismatch", "Ambiguous Match"],
  lockedConfirmations: 1, oracleSnapshotBatches: 1, batchesMissingOracleSnapshot: 0,
  accessHistoryEvents: 1, auditEvents: 1, processedCases: 1,
};

test("a complete observed snapshot is PASS and contains the mandatory register", () => {
  const results = buildUatScenarioResults(complete);
  assert.equal(results.length, 14);
  assert.equal(calculateOverallResult(results), "PASS");
  assert.deepEqual(results.map((row) => row.code), Array.from({ length: 14 }, (_, index) => `UAT-${String(index + 1).padStart(2, "0")}`));
});

test("unexercised scenarios cannot produce a green report", () => {
  const empty: UatEvidenceSnapshot = { ...complete, validManifestUploads: 0, rejectedDateUploads: 0, duplicateOrRepeatCases: 0, decisionsRecorded: 0, zeroFeeCases: 0, approvedBatches: 0, batchesWithEarlierBookingDates: 0, spainVacCount: 0, approvedEffectiveBeneficiaries: 0, approvedEffectiveOracleMappings: 0, italyConsulateBeneficiaries: 0, italyCorrectlyRoutedBeneficiaries: 0, italyInvalidConsulateBeneficiaries: 0, italyAccountSuffixes: [], reconciliationOutcomes: [], lockedConfirmations: 0, oracleSnapshotBatches: 0, accessHistoryEvents: 0, auditEvents: 0, processedCases: 0 };
  assert.equal(calculateOverallResult(buildUatScenarioResults(empty)), "NOT_EXECUTED");
});

test("both effective master types are required", () => {
  const results = buildUatScenarioResults({ ...complete, approvedEffectiveOracleMappings: 0 });
  assert.equal(results.find((row) => row.code === "UAT-08")?.result, "FAIL");
});

test("Italy routing rejects a wrong account or unsupported VAC", () => {
  const results = buildUatScenarioResults({ ...complete, italyCorrectlyRoutedBeneficiaries: 0, italyInvalidConsulateBeneficiaries: 1, italyAccountSuffixes: ["********9999"] });
  assert.equal(results.find((row) => row.code === "UAT-09")?.result, "FAIL");
});

test("an unrelated unmatched bank record does not satisfy beneficiary mismatch coverage", () => {
  const outcomes = complete.reconciliationOutcomes.map((value) => value === "Beneficiary Mismatch" ? "Unmatched Bank Record" : value);
  const results = buildUatScenarioResults({ ...complete, reconciliationOutcomes: outcomes });
  assert.equal(results.find((row) => row.code === "UAT-10")?.result, "FAIL");
});

test("control contradictions fail the report", () => {
  const results = buildUatScenarioResults({ ...complete, selfApprovedBatches: 1 });
  assert.equal(results.find((row) => row.code === "UAT-05")?.result, "FAIL");
  assert.equal(calculateOverallResult(results), "FAIL");
});

test("exports escape spreadsheet content and account evidence stays masked", () => {
  assert.equal(maskAccount("PK18 HABB 0025 2570 0160 6801").endsWith("6801"), true);
  assert.equal(maskAccount("PK18 HABB 0025 2570 0160 6801").includes("HABB"), false);
  const csv = uatResultsToCsv([{ code: "UAT-X", category: "Test", title: "Quoted \"value\"", expected: "a,b", actual: "ok", result: "PASS", evidence: { count: 1 } }]);
  assert.match(csv, /"Quoted ""value"""/);
  assert.match(csv, /"a,b"/);
});
