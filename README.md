# INTIANA Visa Fee Management System

Stages 1–6 implement the controlled operational IBFT workflow from evidence intake through maker-checker payment batching, SCB reconciliation, locked confirmation records, auditability, and repository-level production readiness. Stage 6 preserves every existing financial and processed-record control; it does not deploy the system or process live data.

## Architecture and controls

This strict-TypeScript Next.js 16 App Router/Vinext application runs on a Cloudflare-compatible Worker with Drizzle and relational D1/SQLite. The preserved platform choice is documented rather than claiming raw PostgreSQL compatibility. Amounts remain integer paisa; eligibility, status transitions, approvals and reconciliation run server-side; evidence, audit histories and processed financial fields remain protected from destructive change. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and the Stage 1–5 documents.

Stage 6 adds frozen-install CI, migration/repository/security checks, controlled runtime configuration, safe structured readiness logging, data-minimal health endpoints, operational runbooks and Finance/IT acceptance gates. See [`docs/STAGE_6_VERIFICATION.md`](docs/STAGE_6_VERIFICATION.md).

## Local demonstration setup

Prerequisites: Node.js 22.13+, pnpm 11.19 through Corepack, and optionally Docker Compose.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm db:migrate:local
pnpm db:seed:local
pnpm dev
```

Open `http://localhost:5173/signin-with-chatgpt?return_to=/dashboard`. The seeded `local_seedy` identity and mock authentication are development-only and excluded from production builds. Never use real employees, applicants, credentials or operational files in this environment.

For the containerized demonstration, run `docker compose up --build` and open port 8787. The named volume is local demonstration state, not a production backup design.

## Configuration

`.env.example` contains only safe non-secret defaults. Supported application variables are `IBFT_ENVIRONMENT`, `IBFT_BUSINESS_TIMEZONE` (`Asia/Karachi`), `IBFT_CURRENCY` (`PKR`), `IBFT_FISCAL_YEAR_START_MONTH` (`7`), `IBFT_LOG_LEVEL`, and bounded `IBFT_READINESS_TIMEOUT_MS`. Database/identity bindings and secrets must be injected by the approved platform, never committed. Invalid financial context fails readiness.

## Health and verification

- `GET /api/health/live` is a non-cached process liveness probe.
- `GET /api/health/ready` validates configuration and database access, returns 503 on failure, and exposes no exception, credentials or operational values.

```bash
pnpm verify:production
pnpm audit --audit-level high
git diff --exit-code
```

`verify:production` runs lint enforcement, strict TypeScript, all automated tests, migration validation, tracked binary/sensitive signature scans and a production build. Network-backed production and development audits are separate required CI gates and must not be reported successful unless they execute. CI also reproduces the frozen lockfile, displays the complete dependency tree, validates every locked registry integrity hash, and verifies registry signatures. GitHub dependency review is not claimed because the repository capability is unavailable.

## Oracle AP uploader preparation

Payment-batch creation requires one Finance-approved, active and effective Oracle AP account-flexfield mapping for the selected Embassy/Consulate and location. The batch retains immutable vendor name/number, site, operating-unit, ORG_ID, source, terms, line type, flexfield and optional Code Combination ID snapshots. CSV export follows the supplied 17-column Oracle R12 AP uploader layout; field values still require AP/IT validation.

## Access administration

Controlled inactive-first user provisioning, role replacement, activation/deactivation, segregation-of-duties checks and immutable access-change history are documented in [`docs/ACCESS_CONTROL.md`](docs/ACCESS_CONTROL.md). Enterprise SSO, password/MFA policy and session controls remain IT-owned deployment decisions.

## Standalone UAT evidence

The governance workspace at `/uat` captures immutable, system-derived UAT runs from the standalone database. Missing scenarios remain **NOT EXECUTED**; operators cannot manually choose a result. Reports export to CSV/JSON and the printable view supports Save as PDF. See [`docs/UAT_EVIDENCE_REPORT.md`](docs/UAT_EVIDENCE_REPORT.md). A PASS result is application evidence only and is not production authorization.

## IT handover

- [Database deployment, rollback, backup, restore and recovery verification](docs/DATABASE_OPERATIONS.md)
- [Deployment, monitoring, incident, support and escalation runbooks](docs/IT_RUNBOOKS.md)
- [Finance readiness and IT go/no-go checklists](docs/PRODUCTION_CHECKLISTS.md)
- [Known limitations](docs/KNOWN_LIMITATIONS.md)
- [Release notes](docs/RELEASE_NOTES.md)
- [Stage 7 real-data and operational-file boundary](docs/STAGE_7_BOUNDARY.md)

## Explicit exclusions

Do not deploy this repository without completed organizational approvals. No direct bank-payment initiation, GL posting, live data migration or unapproved enterprise integration is implemented. Stage 7 must use its restricted, auditable boundary; production credentials and customer data must never enter Git or CI.
