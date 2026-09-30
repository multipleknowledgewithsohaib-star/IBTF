# Database deployment and recovery runbook

Owner: IT database/platform administrator. Approver: Finance system owner. Applies to D1/SQLite deployments; commands must be adapted to the approved platform account without placing credentials in source control.

## Change and forward migration

1. Obtain approved release, CI evidence, migration review, change ticket, maintenance window, named operator and independent verifier. Confirm `/api/health/ready` is healthy and record reconciliation/exception counts.
2. Stop writes or place the service in the platform's maintenance mode. Export a point-in-time backup and record its platform-generated identifier, UTC time, release commit and checksum in the ticket.
3. Restore that backup to an isolated non-production database and run integrity/business-control verification below. A backup is not accepted merely because export succeeded.
4. Run `pnpm db:validate`. Preview the ordered SQL under `drizzle/`; migrations are immutable and forward-only. Apply through the approved D1 migration facility (`wrangler d1 migrations apply DB --remote --config <approved-config>`), with the binding supplied by the platform.
5. Deploy the exact CI-tested image/commit, check liveness then readiness, and perform read-only smoke checks. Re-enable writes only after the verifier signs off. Preserve all command output in the change record.

Never edit an applied migration, use `db/seed.sql` in production, or run an unreviewed destructive statement. Schema change and application deployment must retain compatible sequencing (expand, deploy, migrate data, contract in a later release).

## Rollback

Application rollback means redeploying the last approved artifact only when its schema is forward-compatible. Database migration rollback is a new reviewed forward migration; do not delete migration journal rows or reverse financial writes manually. If the new schema or data prevents safe application rollback: stop writes, declare an incident, preserve logs/audit evidence, and execute the restore procedure under two-person approval. Record the outage and all decisions.

## Backup, restore, and recovery verification

- Configure encrypted platform-managed backups with access separated from application operators. IT and Finance must approve retention/RPO/RTO before go-live; these are organization decisions, not repository defaults.
- Quarterly and before every release, restore into an access-restricted non-production environment. Never overwrite production as a test.
- Verify platform checksum/import success; `PRAGMA integrity_check` returns `ok`; every migration in `drizzle/meta/_journal.json` is applied; immutable audit and status-history triggers exist; and no orphan case assignments, reconciliation links, or evidence references exist.
- Compare signed control totals from before backup with restored counts and integer-paisa totals by embassy, VAC and status. Sample upload hashes, batch booking breakups, approvals, SCB evidence, processed locks and audit correlation chains.
- Run the automated suite against the release and perform authenticated read-only workflow smoke tests. Record backup ID, restore target, timings (actual RPO/RTO), checks, discrepancies, verifier and Finance acceptance. Destroy the restored copy under retention policy.

Recovery fails closed: do not resume processing when integrity, totals, migrations, audit continuity or independent verification differs. Escalate using the incident runbook.
