import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { sanitizeLogFields } from "../lib/operational-logger.ts";
import { validateRuntimeConfig } from "../lib/runtime-config.ts";

test("runtime configuration accepts only the controlled financial context", () => {
  assert.deepEqual(validateRuntimeConfig({ IBFT_ENVIRONMENT: "production" }), {
    environment: "production", businessTimezone: "Asia/Karachi", currency: "PKR",
    fiscalYearStartMonth: 7, logLevel: "info", readinessTimeoutMs: 2000,
  });
  assert.throws(() => validateRuntimeConfig({ IBFT_CURRENCY: "USD" }), /must be PKR/);
  assert.throws(() => validateRuntimeConfig({ IBFT_READINESS_TIMEOUT_MS: "0" }), /250 to 10000/);
  assert.throws(() => validateRuntimeConfig({ IBFT_UNREVIEWED_SWITCH: "on" }), /Unsupported IBFT configuration/);
  assert.throws(() => validateRuntimeConfig({ NODE_ENV: "production" }), /must be production when NODE_ENV/);
});

test("operational logging redacts sensitive fields and defeats log injection", () => {
  assert.deepEqual(sanitizeLogFields({ correlation_id: "one\nforged", accountNumber: "123", nested: { token: "abc" } }), {
    correlation_id: "one forged", accountNumber: "[REDACTED]", nested: { token: "[REDACTED]" },
  });
});

test("repository migration and artifact controls execute successfully", () => {
  for (const script of ["scripts/validate-migrations.mjs", "scripts/scan-binary-artifacts.mjs", "scripts/scan-sensitive-data.mjs", "scripts/validate-lockfile-integrity.mjs"]) {
    const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
    assert.equal(result.status, 0, `${script}: ${result.stderr}`);
  }
});
