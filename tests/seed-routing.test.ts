import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const seed = readFileSync(new URL("../db/seed.sql", import.meta.url), "utf8");

test("Italy Consulate demonstration records consistently route through Karachi", () => {
  const expectedKarachiRecords = [
    "('beneficiary-demo-001', 'embassy-italy', 'vac-khi'",
    "('case-demo-001', 'DEMOCASE001', 'DEMOBOOK001', 'DEMO-CASE-001', 'DEMO-BOOK-001', 'embassy-italy', 'vac-khi'",
    "('case-demo-002', 'DEMOCASE002', 'DEMOBOOK002', 'DEMO-CASE-002', 'DEMO-BOOK-002', 'embassy-italy', 'vac-khi'",
    "('batch-demo-001', 'DEMO-IBFT-SEP26-00001', 'embassy-italy', 'vac-khi'",
  ];

  for (const record of expectedKarachiRecords) {
    assert.ok(seed.includes(record), `missing Karachi routing in seed record: ${record}`);
  }

  assert.ok(seed.includes("('vac-khi', 'KHI', 'Karachi', 'South'"), "Karachi VAC must exist before routed records");
  assert.ok(seed.includes("('vac-uet', 'UET', 'Quetta', 'South'"), "UET Quetta VAC must remain available for approved Italy Consulate routing");
  assert.doesNotMatch(
    seed,
    /\('(beneficiary|case|batch)-demo-00[12]'[^\n]*'embassy-italy', 'vac-isb'/,
    "Italy Consulate demonstration records must not route through Islamabad",
  );
});

test("seed warns that live routing requires Finance approval", () => {
  assert.match(
    seed,
    /Finance must approve live beneficiary\/VAC routing before activation\./,
  );
});
