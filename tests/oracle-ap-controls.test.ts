import assert from "node:assert/strict";
import test from "node:test";
import { oracleApMappingEffective, validateOracleApMapping, type OracleApMapping } from "../lib/oracle-ap.ts";

const mapping = (overrides: Partial<OracleApMapping> = {}): OracleApMapping => ({
  isActive: true,
  approvalStatus: "APPROVED",
  effectiveFrom: new Date("2026-01-01T00:00:00Z"),
  effectiveTo: null,
  vendorName: "EMBASSY OF SPAIN-GASTOS",
  vendorNumber: "100245",
  vendorSiteCode: "ISB",
  operatingUnit: "PAKISTAN OU",
  orgId: "204",
  termsName: "IMMEDIATE",
  invoiceSource: "IBFT",
  lineType: "ITEM",
  interfaceStatus: "NEW",
  accountSegmentsJson: JSON.stringify({ company: "01", costCentre: "ISB", naturalAccount: "600100" }),
  concatenatedAccount: "01.ISB.600100",
  ...overrides,
});

test("Oracle AP mapping must be approved, active and effective", () => {
  const on = new Date("2026-09-21T00:00:00Z");
  assert.equal(oracleApMappingEffective(mapping(), on), true);
  assert.equal(oracleApMappingEffective(mapping({ isActive: false }), on), false);
  assert.equal(oracleApMappingEffective(mapping({ approvalStatus: "PENDING" }), on), false);
  assert.equal(oracleApMappingEffective(mapping({ effectiveFrom: new Date("2026-10-01T00:00:00Z") }), on), false);
  assert.equal(oracleApMappingEffective(mapping({ effectiveTo: new Date("2026-09-20T00:00:00Z") }), on), false);
});

test("Oracle AP mapping validates named account-flexfield segments", () => {
  assert.deepEqual(validateOracleApMapping(mapping()), { company: "01", costCentre: "ISB", naturalAccount: "600100" });
  assert.throws(() => validateOracleApMapping(mapping({ accountSegmentsJson: "[]" })), /JSON object/);
  assert.throws(() => validateOracleApMapping(mapping({ accountSegmentsJson: JSON.stringify({ company: "" }) })), /non-empty/);
  assert.throws(() => validateOracleApMapping(mapping({ vendorNumber: " " })), /vendorNumber/);
  assert.throws(() => validateOracleApMapping(mapping({ orgId: " " })), /orgId/);
  assert.throws(() => validateOracleApMapping(mapping({ termsName: " " })), /termsName/);
  assert.throws(() => validateOracleApMapping(mapping({ interfaceStatus: " " })), /interfaceStatus/);
  assert.throws(() => validateOracleApMapping(mapping({ vendorSiteCode: " " })), /vendorSiteCode/);
});
