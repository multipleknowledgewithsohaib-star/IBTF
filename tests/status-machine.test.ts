import assert from "node:assert/strict";
import test from "node:test";
import { canTransition } from "../lib/status-machine.ts";

test("validated case may enter business decision queue", () => {
  assert.equal(canTransition("Validated", "Business Decision Required"), true);
});

test("unresolved repeat cannot enter a payment batch", () => {
  assert.equal(canTransition("Business Decision Required", "Draft Batch"), false);
});

test("successful processing cannot bypass bank confirmation", () => {
  assert.equal(canTransition("Approved", "Processed Successfully"), false);
});
