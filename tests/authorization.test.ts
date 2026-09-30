import assert from "node:assert/strict";
import test from "node:test";
import { canApproveBatch, hasPermission } from "../lib/authorization.ts";

test("operations uploader cannot approve a payment batch", () => {
  assert.equal(hasPermission(["OPERATIONS_UPLOADER"], "batch:approve"), false);
});

test("finance checker can approve another maker's batch", () => {
  assert.equal(canApproveBatch("maker-1", "checker-1", ["FINANCE_CHECKER"]), true);
});

test("maker-checker segregation blocks self approval", () => {
  assert.equal(canApproveBatch("user-1", "user-1", ["FINANCE_CHECKER"]), false);
});

test("system administrator receives declared permissions", () => {
  assert.equal(hasPermission(["SYSTEM_ADMIN"], "master:manage"), true);
});
