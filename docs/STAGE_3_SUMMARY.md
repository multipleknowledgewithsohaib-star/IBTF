# Stage 3 — Payment Batching and Approval

## Implemented controls

- Only unassigned cases currently in **Eligible for Payment** can be composed. Unresolved and halted cases fail the server control. Zero-paisa cases stay visible, count as cases, and add zero to payable value.
- A batch is homogeneous by Embassy/Consulate, VAC, beneficiary account, and intended payment date. Every case retains its original Stage 2 upload relationship and every distinct booking date is persisted separately.
- Counts, integer-paisa totals, and booking-date aggregates are recalculated from database cases. Their aggregate invariant is checked before any write.
- References use `IBFT-YYYYMMDD-NNNNN`, a persisted daily sequence, and a unique database key. A unique case assignment prevents concurrent duplicate batching.
- Beneficiaries are approved, active, effective-dated and mapped to Embassy/VAC. Name, IBAN/account, and bank are snapshotted into batches. Financial master fields cannot be overwritten or deleted.
- Workflow states are Draft, Submitted for Approval, Returned for Amendment, Approved, Rejected, Sent to Bank, and Cancelled. Maker and checker permissions are server enforced; self-approval fails; approval, return, and rejection remarks are mandatory.
- Submitted and terminal financial fields are database locked. Approved composition is locked and assignment history cannot be deleted. Actions produce correlated immutable audit and status-history evidence atomically.
- Batch list filters, creation, controlled instruction/detail, approval queue, explicit blocks/exceptions, source traceability, and booking-breakup CSV are available.

## Demonstration data

The mandated Italy identity is seeded as **Consulate of Italy**, account **PK18HABB0025257001606801**, for the Islamabad VAC. Since no official bank name was supplied, its bank name is conspicuously fictional: **DEMO BANK NAME — VERIFY BEFORE USE**. No other production account is invented. Separate fictional maker/checker identities use `.invalid` addresses.

## Assumptions and limitations

- An account is VAC-specific; a new effective-dated beneficiary version is required for each additional applicable VAC. Financially identifying master fields are append-only. Active state/effective-to can retire a version.
- Cancellation preserves assignment and composition rather than making a case reusable. This conservative behavior ensures a case cannot enter another active or completed batch and retains complete financial history; a future controlled release process would require an explicit business rule.
- The date-scoped sequence is protected by sequence and reference uniqueness. A rare concurrent sequence collision fails safely and asks the maker to refresh rather than silently choosing a reference.
- The batch list supports the required filters. Beneficiary master creation/approval remains administrator/database provisioned in Stage 3; no browser mutation endpoint is exposed, reducing the risk of unapproved financial master changes.
- D1/SQLite is retained from Stages 1–2 for the deployed Worker architecture. Atomic `db.batch` operations and constraints provide the required integrity within this platform.

## Verification

Automated domain checks cover eligibility, duplicate assignment flags, exact integer-paisa totals, zero values, booking breakup, beneficiary effectiveness, maker/checker separation, locked states, and mandatory remarks. The migration adds database triggers for retention and financial locks. Verification commands and their results are recorded in the pull request and final delivery response.

## Stage 4 boundary

No SCB reconciliation, bank-confirmation matching, successful-processing decision, final embassy confirmation, or operational confirmation message is generated. **Sent to Bank** is the Stage 3 endpoint.
