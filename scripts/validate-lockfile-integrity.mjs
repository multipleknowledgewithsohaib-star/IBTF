import { readFileSync } from "node:fs";

const lockfile = readFileSync("pnpm-lock.yaml", "utf8");
const lines = lockfile.split("\n");
const errors = [];

if (!lockfile.startsWith("lockfileVersion: '9.0'")) errors.push("pnpm-lock.yaml must use the reviewed lockfile format");
if (!/^overrides:\n  fast-uri: 3\.1\.6$/m.test(lockfile)) errors.push("the reviewed fast-uri 3.1.6 security override is missing");
if (/fast-uri@(?:3\.0\.|3\.1\.[0-5])(?:\D|$)/.test(lockfile)) errors.push("a vulnerable fast-uri version remains locked");
if (!/^  browserslist: 4\.28\.7$/m.test(lockfile)) errors.push("the reviewed browserslist 4.28.7 security override is missing");
if (!lockfile.includes("browserslist@4.28.7:")) errors.push("the patched browserslist package is not locked");
if (/browserslist@4\.28\.[0-6](?:\D|$)/.test(lockfile)) errors.push("a vulnerable browserslist version remains locked");
if (!/^  sharp: 0\.35\.4$/m.test(lockfile)) errors.push("the reviewed sharp 0.35.4 security override is missing");
if (/sharp@0\.(?:[0-9]|[12][0-9]|3[0-4])\./.test(lockfile)) errors.push("a vulnerable sharp version remains locked");

let inPackages = false;
let packageName;
let packageLines = [];
let packageCount = 0;
function checkPackage() {
  if (!packageName) return;
  packageCount += 1;
  if (!packageLines.some((line) => /^    resolution: \{integrity: sha512-/.test(line))) {
    errors.push(`${packageName}: missing sha512 registry integrity`);
  }
}
for (const line of lines) {
  if (line === "packages:") { inPackages = true; continue; }
  if (line === "snapshots:") { checkPackage(); break; }
  if (!inPackages) continue;
  if (/^  \S.*:$/.test(line)) {
    checkPackage();
    packageName = line.trim().slice(0, -1);
    packageLines = [];
  } else packageLines.push(line);
}
if (packageCount === 0) errors.push("no locked registry packages found");

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Validated sha512 integrity for ${packageCount} locked packages and the reviewed security overrides.`);
