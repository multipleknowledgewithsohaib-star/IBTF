# Release notes

## Stage 6 — Production Readiness (2026-09-14)

- Added CI gates for frozen dependency installation, lint, strict typing, tests, migration integrity, repository cleanliness, binary/sensitive artifact scanning, production build, registry audit and pull-request dependency review.
- Added allowlisted runtime configuration parsing, safe non-secret template, unauthenticated data-minimal liveness/readiness probes, database dependency checking and redacted JSON operational logging.
- Added forward-only database deployment/rollback/backup/restore guidance and recovery verification; deployment, incident, monitoring, support and escalation runbooks; Finance/IT go/no-go templates; explicit limitations; and Stage 7 controlled real-data/file boundary.
- Added automated tests for configuration rejection, log redaction/injection protection, migration validation and repository scanners.

No production deployment, live-data handling, direct bank-payment initiation, GL posting or enterprise integration is included.

### PR #6 supply-chain correction

- Pinned the vulnerable AJV transitive `fast-uri` path to patched 3.1.3 and regenerated the lockfile without forced major upgrades.
- Split required production and development audits so exposure classification is visible while critical/high failures remain enforced.
- Replaced the unavailable GitHub dependency-review action with frozen-lock reproduction, complete dependency-tree output, sha512 integrity enforcement and registry-signature verification; Dependency graph / Advanced Security remains an explicit IT prerequisite.
- Upgraded Next.js from 16.2.6 to 16.3.5 and its publisher-declared production transitives, constrained `sharp` to patched 0.35.4 across the Next.js and Miniflare paths, and extended lockfile regression checks to reject every earlier `sharp` minor line.
