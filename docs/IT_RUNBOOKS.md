# IT production runbooks

## Deployment and rollback

Use a least-privilege service identity and an immutable artifact from a protected `main` commit whose CI passed. Obtain IT change approval and Finance go/no-go sign-off; verify the environment values against `.env.example` and inject the database binding/identity configuration outside Git. Do not inject bank logins or customer data. Follow `DATABASE_OPERATIONS.md`, deploy first to a production-like environment, then use a rolling/blue-green release only if the chosen platform preserves single-writer financial behavior. Probe `GET /api/health/live` for process life and `GET /api/health/ready` for configuration/database availability. Neither endpoint authenticates nor returns operational data.

Rollback on readiness failure, elevated server errors, audit-write failure, incorrect control totals, authorization regression, or Finance stop decision. Stop new writes, preserve evidence and correlation IDs, revert only to a schema-compatible approved artifact, and follow the database rollback rules. Never repair financial records directly.

## Monitoring and alerting

Collect JSON application logs into access-controlled centralized storage with retention approved by Security and Audit. Alert on sustained readiness failures, 5xx/error rate, latency, capacity, failed authentication/authorization, rejected/duplicate uploads, approval returns, confirmation pending age, reconciliation exceptions/variance, manual overrides/reversals, failed audit writes, backup failures and recovery-test failures. Dashboard by environment and release. Logs are diagnostic only; immutable database audit events remain the evidence of business actions. Restrict log access and never log uploaded rows, names, emails, identifiers, account/IBAN values, tokens, cookies or request bodies.

## Incident response

1. Acknowledge, open an incident, assign commander/scribe, classify severity and record UTC time, environment and release. Finance owns business-processing decisions; IT owns containment/recovery; Security/Privacy joins suspected access or data exposure.
2. For integrity or unauthorized-action risk, disable writes/access at the platform edge without deleting records. Preserve database snapshot, audit events, application/platform logs, hashes and deployment metadata with chain of custody.
3. Scope affected uploads, cases, batches, approvals, confirmations and reconciliations through IDs/correlation references. Do not place sensitive values in chat/tickets; use the approved restricted evidence store.
4. Recover using an approved artifact/backup and independent verification. Finance reconciles control totals and explicitly authorizes resumption.
5. Notify stakeholders through the organization's approved legal/privacy/security process. Complete root cause, corrective actions and post-incident review; retain the incident record.

Severity 1 includes suspected financial integrity loss, unauthorized approval, sensitive-data exposure, audit failure or unavailable critical processing. Page IT operations, Finance system owner, Information Security and executive duty manager immediately. Severity 2 includes degraded processing or accumulating reconciliation exceptions: notify IT on-call and Finance operations. Severity 3 is non-critical support. Names, telephone numbers, RPO/RTO and response-time commitments must be completed in the controlled service directory before go-live, not committed here.

## Support and escalation

Level 1 records time, user role, safe error code, correlation ID and reproduction without customer data. Level 2 reviews health, sanitized logs and configuration. Level 3 engineering handles reproducible defects via reviewed change; database/platform and Security specialists join as applicable. Finance approves any reprocessing, decision, override, reversal or business workaround. IT must never bypass maker-checker or alter records directly. Attach ticket, approvals and verification to every emergency release.
