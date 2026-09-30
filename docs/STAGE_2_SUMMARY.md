# Stage 2 — Data Intake and Controls

## Implemented

Stage 2 turns the Stage 1 upload and case placeholders into server-controlled workflows:

- The upload API authorizes the caller, permits only the four named file classifications, limits files to 10 MiB, checks media types, calculates SHA-256, rejects an already-preserved hash, sanitizes the evidence filename, and stores the original bytes in the database alongside uploader, upload time, selected/detected type, submission date, and row outcomes.
- Visa-manifest CSV headers are resolved through database-configurable aliases. Required values, ISO dates, active embassy/VAC masters, exact decimal amounts, and normalized in-file/database duplicates are checked. Validation evidence is retained per source row with stable error codes and can be downloaded as CSV.
- One D1 batch writes upload evidence, immutable staging rows, validation errors, cases, and audit events. A mandatory failure posts no cases and marks every data row rejected; a successful file posts the complete case set.
- Case and booking identifiers retain their original representation and use an uppercase, Unicode-normalized, punctuation-free comparison value. Existing normalized bookings reject a file. Prior normalized cases inside the configurable inclusive 14-day window are posted only to **Business Decision Required**.
- An authorized decision approver can allow or halt an unresolved repeat. A meaningful reason is mandatory, the decision and status history are immutable, and the change and actor are audit logged in the same atomic batch.
- The case register supports server-side identifier, embassy, VAC, status, and source-file filters and displays booking/submission dates and integer-paisa amounts. Zero amounts remain visible as exceptions. The payable summary rule counts only **Eligible for Payment**, excluding both unresolved and halted cases.
- Upload history, original-evidence retrieval, validation-detail download, case register, and decision queue routes all enforce permissions on the server. Upload, validation, posting, repeat detection, and decisions produce immutable audit events.
- Migrations add preserved content, mappings, staging, validation evidence, configurable rules, original identifiers, and decisions, with protective no-update/no-delete triggers. Seed changes remain fictional and clearly non-production.

## Explicit assumptions and safe behavior

- Stage 2 parses operational case records from UTF-8 CSV Visa manifests. XLS/XLSX evidence is preserved for the other classifications, but spreadsheet cell parsing is deliberately deferred rather than pretending that opaque binary content was validated. SCB PDFs are preserved as source evidence; semantic bank reconciliation belongs to Stage 4.
- The user-selected file type is authoritative when filename detection is uncertain. Both values are retained so mismatches are visible to reviewers.
- An exact or format-normalized booking collision is a mandatory validation failure for the complete manifest. A case identifier repeated under a different booking within the review window is uncertain and therefore enters the decision queue.
- The repeat interval includes the prior submission date through exactly `REPEAT_WINDOW_DAYS` elapsed days. Future-dated prior records are not treated as preceding submissions.
- Original bytes are stored as base64 in the relational evidence record for the current D1 deployment. For larger production volume, IT should replace this with encrypted immutable object storage while retaining the database hash and metadata transaction boundary.

## Verified controls

Automated checks cover identifier normalization, configured aliases, mandatory-file rejection, invalid dates/amounts, exact and normalized duplicates, inclusive/configurable repeat windows, and payable exclusion with visible eligible zero amounts. Existing authorization, money, and status-transition tests remain active.

## Remains / out of scope

- Stage 3 payment population, batching, booking-wise batch breakup, maker submission, checker approval, and beneficiary approval actions are not implemented.
- Stage 4 SCB content extraction, confirmation matching, reconciliation, and document generation are not implemented.
- Administrators configure mappings and rule values directly through migration-controlled master data in this stage; an approval-controlled administration UI is later work.
- Malware scanning and external encrypted object storage require organization-selected infrastructure before production deployment.
