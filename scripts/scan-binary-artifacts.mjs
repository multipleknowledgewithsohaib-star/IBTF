import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".woff", ".woff2"]);
const files = execFileSync("git", ["ls-files", "-z"]).toString().split("\0").filter(Boolean);
const findings = [];
for (const file of files) {
  const lower = file.toLowerCase();
  if (allowedExtensions.has(lower.slice(lower.lastIndexOf(".")))) continue;
  const bytes = readFileSync(file);
  if (bytes.includes(0)) findings.push(`${file}: unexpected binary/NUL content`);
  if (/\.(?:zip|xlsx|xls|pdf|sqlite|db|exe|dll|so|dylib|class|jar)$/i.test(file)) findings.push(`${file}: prohibited tracked binary artifact`);
}
if (findings.length) { console.error(findings.join("\n")); process.exit(1); }
console.log(`Scanned ${files.length} tracked files; no unexpected binary artifacts.`);
