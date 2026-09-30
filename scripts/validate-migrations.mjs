import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sqlFiles = readdirSync("drizzle").filter((name) => name.endsWith(".sql")).sort();
const migrations = sqlFiles.filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name));
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
const tags = journal.entries.map((entry) => entry.tag);
const errors = [];
const reviewedLegacyRebuilds = new Map([
  ["0002_damp_cerise.sql", "fbc398baa664a018399f685b2b786ef1424168b0dda1a1a45a361f42bc865321"],
  ["0003_glorious_beast.sql", "20504d1e07d2a64f104b90812c6bbc2937bee8fd589224bf948cc70db1df1a7a"],
]);

if (sqlFiles.length === 0) errors.push("no SQL migrations found");
for (const filename of sqlFiles) {
  if (!migrations.includes(filename)) errors.push(`${filename}: invalid migration filename`);
}
for (const [index, filename] of migrations.entries()) {
  const expectedPrefix = String(index).padStart(4, "0") + "_";
  if (!filename.startsWith(expectedPrefix)) errors.push(`${filename}: non-contiguous migration sequence`);
  const bytes = readFileSync(`drizzle/${filename}`);
  const sql = bytes.toString("utf8").trim();
  if (!sql) errors.push(`${filename}: empty migration`);
  // Match executable statement starts, not trigger definitions such as BEFORE DELETE.
  const destructive = /^\s*(?:DROP\s+(?:TABLE|INDEX|VIEW|TRIGGER)\b|DELETE\s+FROM\b|TRUNCATE\b|REPLACE\s+INTO\b|UPDATE\s+[^;]+?\s+SET\b|ALTER\s+TABLE\s+[^;]+?\s+DROP\s+COLUMN\b)/im.test(sql);
  if (destructive) {
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (reviewedLegacyRebuilds.get(filename) !== digest) errors.push(`${filename}: destructive statement requires an explicitly reviewed recovery migration`);
  }
}
if (JSON.stringify(tags.map((tag) => `${tag}.sql`)) !== JSON.stringify(migrations)) errors.push("migration journal does not exactly match ordered SQL files");
if (new Set(tags).size !== tags.length) errors.push("duplicate migration journal tags");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

// Parse and apply the reviewed sequence against a fresh, isolated local D1 database.
const temp = mkdtempSync(join(tmpdir(), "ibft-migration-check-"));
try {
  const result = spawnSync(process.execPath, [
    "--import", "./scripts/sites-env.mjs", "./node_modules/wrangler/bin/wrangler.js",
    "d1", "migrations", "apply", "DB", "--local",
    "--config", "wrangler.local.jsonc", "--persist-to", join(temp, "state"),
  ], { encoding: "utf8", timeout: 120000, maxBuffer: 10 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    console.error("Fresh D1 migration application failed:", result.error?.message ?? result.stderr ?? result.stdout);
    process.exitCode = 1;
  } else {
    console.log(`Validated and applied ${migrations.length} ordered, journaled migrations to a fresh local D1 database.`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
