import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertReason, normalizeRoleCodes, validateProvisioningIdentity } from "../lib/access-control-policy.ts";
import { hasPermission } from "../lib/authorization.ts";

test("only System Administrator receives access-management permission", () => {
  assert.equal(hasPermission(["SYSTEM_ADMIN"], "access:manage"), true);
  assert.equal(hasPermission(["FINANCE_MAKER"], "access:manage"), false);
  assert.equal(hasPermission(["MANAGEMENT_AUDIT"], "access:manage"), false);
});

test("maker and checker cannot be assigned to one user", () => {
  assert.throws(() => normalizeRoleCodes(["FINANCE_MAKER", "FINANCE_CHECKER"]), /cannot be assigned/);
});

test("System Administrator cannot also hold an operational role", () => {
  assert.throws(() => normalizeRoleCodes(["SYSTEM_ADMIN", "TREASURY_UPLOADER"]), /cannot also hold/);
});

test("approved non-conflicting role combinations remain available", () => {
  assert.deepEqual(normalizeRoleCodes(["OPERATIONS_UPLOADER", "MANAGEMENT_AUDIT"]), ["OPERATIONS_UPLOADER", "MANAGEMENT_AUDIT"]);
});

test("identity and change reasons fail closed", () => {
  assert.deepEqual(validateProvisioningIdentity({ authSubject: "corp:amir.rahim", email: "AMIR@EXAMPLE.COM", displayName: "Amir Rahim" }), { authSubject: "corp:amir.rahim", email: "amir@example.com", displayName: "Amir Rahim" });
  assert.throws(() => validateProvisioningIdentity({ authSubject: "x", email: "invalid", displayName: "A" }), /identity subject/);
  assert.throws(() => assertReason("short"), /at least 10/);
});

test("migration makes access history immutable and user deletion impossible", () => {
  const sql = readFileSync(new URL("../drizzle/0009_access_control_administration.sql", import.meta.url), "utf8");
  assert.match(sql, /user_access_history_no_update/);
  assert.match(sql, /user_access_history_no_delete/);
  assert.match(sql, /users_no_delete/);
});
