# Stage 7 boundary — controlled data migration and real-file verification

Stage 6 does **not** migrate production data, inspect real operational/customer files, connect to bank services, initiate payment, post to a GL, or approve go-live. Stage 7 begins only after privacy/security approval, a named Finance data owner, an isolated access-controlled environment, retention/deletion rules, encrypted transfer, and signed reconciliation/acceptance criteria exist.

## Permitted Stage 7 work

1. Inventory each approved legacy/operational source, owner, period, schema, classification and control total without copying it into Git, tickets, logs or fixtures.
2. Create versioned mappings and parsers using synthetic data first. Receive real files only in the approved restricted channel; preserve original bytes, safe filename, hash, custodian and timestamps.
3. Dry-run into staging. Produce row-level accepted/rejected reasons and duplicate/repeat candidates; do not make staged records payable. Finance resolves mappings and exceptions through signed evidence.
4. Reconcile source-to-stage and stage-to-post counts/integer-paisa totals by embassy, VAC, booking/submission date and status. An independent checker verifies hashes, samples and audit chains.
5. Use an idempotent, transactional, rehearsal-tested cutover. Finance and IT explicitly approve posting; retain rollback/recovery evidence and destroy temporary copies under policy.
6. Verify representative *approved* real manifest, fee/applicant, embassy submission and SCB variants against authoritative expected outcomes. New layouts are rejected until mappings/parser changes pass code review and regression tests.

## Prohibited or deferred

- No live credentials or operational files in source control, CI, developer laptops, shared chat, screenshots or demonstration seeds.
- No silent cleanup, inferred missing values, direct database updates, deletion of history, bypass of maker-checker, or tolerance invented for migration convenience.
- No payment initiation, GL posting, bank automation or enterprise integration without a separately approved scope, threat model and acceptance plan.
- Production cutover remains No-Go until every checklist item, recovery drill, business total, exception disposition and sign-off is complete.
