import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-z"]).toString().split("\0").filter(Boolean);
const excluded = new Set(["docs/IBFT_SYSTEM_REQUIREMENTS.md", "scripts/scan-sensitive-data.mjs"]);
const rules = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9_]{30,}/],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{20,}/],
  ["assigned secret", /(?:password|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["']?(?!\[?REDACTED|example|changeme|process\.env)[A-Za-z0-9/+_.-]{12,}/i],
];
const findings = [];
for (const file of files) {
  if (excluded.has(file)) continue;
  let content;
  try { content = readFileSync(file, "utf8"); } catch { continue; }
  for (const [label, pattern] of rules) if (pattern.test(content)) findings.push(`${file}: possible ${label}`);
}
if (findings.length) { console.error(findings.join("\n")); process.exit(1); }
console.log(`Scanned ${files.length - excluded.size} tracked files; no known sensitive-data signatures.`);
