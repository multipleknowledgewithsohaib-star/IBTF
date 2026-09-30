import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const action = process.argv[2];
if (!["migrate", "seed"].includes(action)) throw new Error("Use: node scripts/d1-local.mjs migrate|seed");

if (!existsSync(new URL("../dist/server/wrangler.json", import.meta.url))) {
  const build = spawnSync("pnpm", ["build"], { cwd: root, stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const common = ["--import", "./scripts/sites-env.mjs", wrangler, "d1"];
const command = action === "migrate"
  ? [...common, "migrations", "apply", "DB", "--local", "--config", "wrangler.local.jsonc", "--persist-to", ".wrangler/state"]
  : [...common, "execute", "DB", "--local", "--config", "wrangler.local.jsonc", "--persist-to", ".wrangler/state", "--file", "db/seed.sql"];
const result = spawnSync(process.execPath, command, { cwd: root, stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
