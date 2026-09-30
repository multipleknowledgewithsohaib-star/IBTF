# Stage 6 verification report

Date: 2026-09-14. Scope: repository-level production-readiness controls only. This report is not a production approval.

## Implemented evidence

| Control | Evidence |
| --- | --- |
| CI and supply chain | `.github/workflows/ci.yml`, frozen lockfile, complete dependency tree, integrity/signature checks, separate production/development registry audits |
| Configuration | `.env.example`, `lib/runtime-config.ts` |
| Health and safe logging | `/api/health/live`, `/api/health/ready`, `lib/operational-logger.ts` |
| Migration/artifact/data controls | `scripts/validate-migrations.mjs`, `scan-binary-artifacts.mjs`, `scan-sensitive-data.mjs` |
| Operating readiness | database and IT runbooks, production checklists, limitations and Stage 7 boundary |
| Automated regression | `tests/production-controls.test.ts` plus all Stage 1–5 tests |

## Verification policy

The implementation must be checked with `pnpm verify:production`. CI separately runs `pnpm audit:prod` and `pnpm audit:dev`; either fails on critical/high findings or an inability to execute. It also prints `pnpm deps:tree`, reproduces the frozen lockfile, validates sha512 integrity for every locked registry package, and verifies registry signatures. A clean `git diff --exit-code` after checks establishes that generation/build did not rewrite tracked sources.

## PR #6 corrective verification record

The first GitHub run reported 61 dependency occurrences (4 low, 19 moderate, 36 high, 2 critical), including `fast-uri` 3.1.2 through AJV-related production and development paths. The transitive constraint and lockfile now select the advisory's patched 3.1.3 release; the integrity control rejects regression to 3.0.x or 3.1.0–3.1.2. Production and development results are intentionally separate while remaining required and visible.

The initial `dependency-review-action` failure was a repository-capability failure, not a successful review. That unsupported job has been replaced by capability-independent lockfile/tree/integrity/signature controls. GitHub Dependency graph / Advanced Security remains an IT prerequisite; this report does not claim GitHub dependency review ran.

Local registry audit and signature calls could not execute because the environment's npm registry proxy returned HTTP 403. No local audit pass is claimed. The corrected CI fails rather than ignores registry errors and is the required network-backed evidence before Go. Local non-network checks and their actual outcomes are recorded in the change summary.

### Second production-audit remediation

The next GitHub production audit, after the `fast-uri` correction, executed and reported 30 remaining occurrences: 1 low, 9 moderate, 18 high and 2 critical. The confirmed vulnerable production path was Next.js → optional `sharp` 0.34.5, affected below 0.35.4. Next.js is upgraded from 16.2.6 to the compatible stable 16.3.5 release, whose published optional-dependency constraint is `sharp ^0.35.4`; the lockfile resolves `sharp` and all platform packages to 0.35.4. A reviewed workspace override enforces that floor for the additional Miniflare path, and the automated integrity control rejects any locked `sharp` below 0.35.4. The regenerated lockfile contains no `sharp` 0.34.x and retains sha512 integrity for all 829 packages.

This upgrade also refreshes Next.js-owned production transitives such as `@next/env`, SWC platform packages, `postcss`, `@swc/helpers`, `baseline-browser-mapping`, and the `sharp`/libvips platform graph through their publisher-declared 16.3.5 constraints. It is not a blind forced dependency-tree upgrade. Vinext beta.5 declares no Next.js peer range, Node 22.13 satisfies Next.js and sharp's Node `>=20.9.0` requirement, and React 19.2.6 satisfies Next.js 16.3.5's published peer range. The existing build remains the compatibility gate.

The local proxy still prevents a fresh production/development audit, signature verification, and download of the new package tarballs, so this environment cannot honestly claim those network-backed checks or a post-upgrade local build passed. CI retains all gates without ignore, severity reduction, skipped audit, or false-success behavior. Production audit must pass before the development audit runs; both and the signature audit are mandatory PR evidence.

## Remaining before go-live

Complete every item in `PRODUCTION_CHECKLISTS.md` with external evidence. Configure production identity, infrastructure, malware scanning, centralized monitoring, backup policy and service contacts; execute migration/rollback/recovery rehearsals against the chosen platform; obtain Security and Finance acceptance. Stage 7 real-file verification must follow its boundary. Do not infer production readiness from repository CI alone.
