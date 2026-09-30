import assert from "node:assert/strict";
import test from "node:test";
import { amountsMatch } from "../lib/money.ts";

test("reconciliation respects the configured tolerance in paisa", () => {
  assert.equal(amountsMatch(10_000_00, 9_999_99, 1), true);
  assert.equal(amountsMatch(10_000_00, 9_999_98, 1), false);
});

test("reconciliation rejects unsafe or negative tolerance values", () => {
  assert.equal(amountsMatch(Number.MAX_VALUE, 1, 0), false);
  assert.equal(amountsMatch(100, 100, -1), false);
});
