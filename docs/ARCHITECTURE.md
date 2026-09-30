# INTIANA IBFT architecture through Stage 6

## Trust boundaries

The browser is an untrusted presentation client. Every upload, evidence download, register query, and business decision reaches a server route or server component that resolves the authenticated subject to an active user and checks a database-backed role permission. Financial eligibility, normalization, duplicate/repeat rules, and decisions run only on the server.

## Intake pipeline

1. **Gate** — authorization, supported classification, 10 MiB size limit, allowed media/extension, and non-empty content.
2. **Preserve and identify** — SHA-256 is checked against a unique database key; original bytes and sanitized filename are retained with selected and detected types.
3. **Map and stage** — active mapping rows resolve normalized header aliases into canonical fields. Parsed raw and normalized values are prepared without creating operational cases.
4. **Validate** — mandatory fields, true ISO calendar dates, non-negative two-decimal PKR values, active embassy/VAC masters, in-file duplicates, persisted normalized bookings, and repeat submissions are evaluated.
5. **Atomic post** — a single D1 batch writes evidence, every staging row, errors, cases (only if the whole file passes), and audit events. Database batch semantics prevent partial posting.
6. **Review evidence** — upload history exposes counts, result, hash, original evidence, and row-level validation CSV.

The source row and validation tables have no-update/no-delete triggers. File evidence and cases retain the Stage 1 no-delete controls. File hashes and normalized booking/embassy keys provide independent database enforcement of idempotency and uniqueness.

## Duplicate and eligibility model

Identifiers are Unicode NFKC normalized, trimmed, uppercased, and stripped to ASCII letters/digits. Both original values are retained for auditability. A booking collision rejects the complete file before posting. A normalized case seen within the configurable preceding window is posted as **Business Decision Required**, never payable. Only **Eligible for Payment** contributes to payable counts and integer-paisa totals; **Halted** and unresolved cases contribute zero. A valid zero fee is retained and prominently labelled as an exception rather than disappearing.

## Decisions and audit

`ALLOW` transitions an unresolved case to **Eligible for Payment**; `HALT` transitions it to **Halted**. The decision permission, current state, allowed decision value, and minimum reason are server enforced. Decision record, case update, immutable status history, and immutable audit event share one database batch. The audit event includes actor, time, before/after state, reason, and correlation ID.

## Data and runtime

Next.js 16 App Router runs through Vinext on a Cloudflare-compatible Worker. Drizzle maps the relational D1/SQLite store. Integer paisa avoids floating-point financial arithmetic. Original content is currently base64 evidence in D1; encrypted immutable object storage is the recommended production scaling adaptation. Docker Compose remains the reproducible local runtime.

## Scope boundary

Stage 2 accepts and preserves Visa manifest, fee-cum-applicant, embassy submission, and SCB confirmation evidence. Only manifest CSV is semantically posted to cases. Payment batching/approval is Stage 3; SCB parsing and reconciliation is Stage 4. No Stage 3 approval action is exposed.

## Stage 3 payment boundary

Payment composition is a server-only operation. The service re-reads every selected case, requires the exact **Eligible for Payment** state, rejects mixed Embassy/VAC groups and existing assignments, validates an approved active beneficiary for the intended payment date, and derives count, integer-paisa total, and booking-date rows. Browser totals are informational and are never accepted. A unique case-assignment key independently prevents reuse; batch reference uniqueness backs the date-scoped controlled sequence.

A beneficiary is mapped to one Embassy/Consulate and VAC. Financial identity fields cannot be overwritten: a database trigger requires administrators to create a new effective-dated row, preserving history. Each batch stores immutable name, account/IBAN, and bank snapshots so later master-data changes cannot rewrite an instruction.

Creation, each case assignment, status history, and audit events are issued in a single D1 atomic batch. Workflow actions use server-side permissions and permitted-state checks. A checker cannot approve the maker's batch, return/reject remarks are mandatory, and submitted/terminal financial data is protected by database triggers. Approval locks composition; assignment records and batches cannot be deleted.

Stage 3 screens are server rendered from controlled data: eligible population, batch list, detail/payment instruction, and approval queue. CSV exports contain integer paisa and booking-date rows. Original upload IDs and filenames are joined through each case for Stage 2 traceability.

## Stage 4 boundary

The **Sent to Bank** action records dispatch only. No SCB parsing, reconciliation matching, tolerance override, final confirmation generation, or embassy communication is performed in Stage 3. Existing Stage 1/2 placeholder statuses remain for forward compatibility, but Stage 4 alone may implement reconciliation outcomes.

## Reconciliation integrity (Stage 4)

- SCB evidence and parse results are append-only. SHA-256 uniqueness provides idempotent intake; triggers prohibit evidence update/delete.
- A Worker-compatible pure TypeScript parser handles CSV, XLSX ZIP/XML, and controlled PDF text operators. Validation stages the whole file and atomically persists either a rejected file plus every stable error, or all records, results, traceability links, histories and audits.
- The matcher filters to `Sent to Bank`, uses exact integer paisa and intended payment date, and refuses ambiguity. Links traverse reconciliation → batch → booking breakup → case → source upload.
- Manual exception actions are append-only and high-impact approval excludes the requester, evidence uploader, and original matcher; reason and supporting evidence are mandatory, and tolerance remains zero.
- Confirmation previews/exports derive counts and booking totals from locked data. Export authorization is server-side and emits a correlated audit event.

## Stage 5 file trust boundary and financial locks

`lib/spreadsheet.ts` is the bounded workbook trust boundary. XLSX central-directory metadata is validated before inflation, relationships drive canonical worksheet selection, and cached formula results are rejected. The BIFF8 path bounds OLE sector allocation and record/SST decoding, including `CONTINUE` encoding changes and DATEMODE. Parsed cells then enter the same canonical server-side manifest validator used by CSV.

Only `VISA_MANIFEST` imports can create cases. Fee-cum-applicant and embassy-submission uploads remain evidence and can only be connected through immutable, reasoned `operational_evidence_links`; they cannot mutate manifest amounts. Reconciliation exceptions can retain one uniquely applicable batch with expected amount and variance in paisa, while case-level reconciliation links are database-restricted to Matched outcomes. Processed case and batch financial columns are database-locked, and an approved reconciliation reversal is the sole path from Processed Successfully to Reconciliation Exception.

## Stage 6 operational boundary

Production readiness adds controls around, rather than replacements for, the Stage 1–5 financial domain. Runtime configuration is parsed from a narrow allowlist with fixed PKR, Asia/Karachi and July fiscal context. `/api/health/live` proves only that the process can answer; `/api/health/ready` fails closed unless configuration validates and the D1 binding answers a bounded query. Both return data-minimal, non-cacheable responses. Readiness writes newline-safe JSON diagnostics with sensitive field-name redaction; it never emits configuration values, request bodies or database content.

CI installs the locked dependency graph and gates lint, strict types, all tests, ordered/non-destructive migration validation, tracked binary and sensitive-signature scans, production build, repository cleanliness and registry/dependency review. These repository controls supplement—not replace—platform secret scanning, malware inspection, identity, encrypted backups, monitoring and organizational approval.

Database migrations remain immutable and forward-only. Release and recovery use two-person change control, pre-change backup, isolated restore verification, integer-paisa business totals and audit-chain checks. Stage 7 is a distinct restricted boundary for real operational layouts/data. No Stage 6 component initiates payment, posts a GL entry, or connects to an enterprise system.


## Oracle R12 AP account-flexfield boundary

Oracle AP accounting is controlled through an effective-dated master keyed by Embassy/Consulate and VAC/location. Each record stores the exact AP vendor name and number, site code, operating unit and ORG_ID, invoice source, payment terms, line type, optional ledger and Code Combination ID, named flexfield segments as JSON, and the concatenated account. A mapping is usable only when active, Finance-approved, and effective on the intended payment date. Missing or overlapping effective mappings block payment-batch creation rather than selecting an arbitrary account.

Approved accounting fields cannot be overwritten or deleted. Corrections close the earlier record and create a newly approved effective-dated record. New payment batches retain immutable snapshots of the vendor name and number, site, operating unit, ORG_ID, source, terms, line type, concatenated account and Code Combination ID, so later master changes cannot rewrite historical exports. The controlled CSV export follows the approved 17-column Oracle R12 AP uploader order: INVOICE_NUM, INVOICE_DATE, SOURCE, VENDOR_NUM, VENDOR_SITE_CODE, INVOICE_AMOUNT, INVOICE_CURRENCY_CODE, ORG_ID, TERMS_NAME, DESCRIPTION, LINE_AMOUNT, LINE_DESCRIPTION, STATUS, DIST_CODE_CONCATENATED, LINE_TYPE, GL_DATE and BATCH.


## Access-control administration

The existing server-side RBAC model now has an inactive-first provisioning workflow. Current assignments remain in `user_roles`; every account, role and activation change is preserved in append-only `user_access_history` and correlated `audit_events`. Finance Maker and Finance Checker are mutually exclusive, System Administrator cannot hold operational roles, self-role/self-deactivation actions fail closed, and the last active administrator is protected. Enterprise SSO, password/MFA and session policy remain outside the application repository and must be supplied by IT.


## Standalone UAT evidence boundary

The UAT evidence module reads aggregate operational state on the server and writes a frozen `uat_runs` record plus immutable scenario rows in one D1 batch. The operator supplies only a server label and deployed commit; pass/fail/not-executed status is calculated server-side. Beneficiary evidence is masked, applicant data is not copied, prior runs cannot be updated or deleted, and report generation writes a correlated audit event. CSV/JSON and print-to-PDF output derive from the frozen rows.

This is application acceptance evidence, not remote monitoring. It does not prove identity infrastructure, secrets, backup/restore, monitoring, production capacity, live bank connectivity or Oracle posting, and it cannot authorize deployment or final handover.
