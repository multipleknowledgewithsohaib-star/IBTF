# Stage 4 — SCB Reconciliation and Embassy Confirmations

## Implemented scope

Stage 4 adds immutable SCB evidence storage, SHA-256 duplicate blocking, structured CSV/XLSX and machine-readable PDF parsing, stable record-level validation errors and complete-file rejection. Original bytes, filename, media type, uploader, timestamp, raw rows, normalized parse results and evidence locations are retained. Unreadable, scanned/image-only, encrypted, or structurally unsupported evidence is retained in an explicit **Parsing Exception** state rather than inferred.

Automatic matching considers only batches in **Sent to Bank** and requires Embassy/Consulate and VAC references when supplied, normalized beneficiary account/IBAN, normalized beneficiary name, exact integer-paisa amount, and intended payment-processing date. Booking date is never used as payment date. Zero tolerance is fixed. Multiple exact candidates produce **Ambiguous Match**; a filename never proves a match. Existing and intra-file duplicate bank references reject the complete file.

A successful atomic post links evidence to the batch, each derived case, its booking-date breakup, and original manifest upload. Correlated audit and immutable status history preserve Sent to Bank, Bank Confirmed and Processed Successfully milestones. Confirmation preview and controlled CSV export are restricted to reconciled exact matches; case counts and breakups are derived from system data.

Screens cover SCB upload/history/detail, reconciliation workbench, exception queue, detail, monitor, confirmation preview and controlled exports. Server permissions protect intake, viewing and generation.

## Assumptions and limitations

- The existing Cloudflare Worker/D1 architecture is preserved. D1 `batch` supplies atomic posting.
- Accepted dates are `YYYY-MM-DD`, `DD-MM-YYYY`, `DD/MM/YYYY`, and unambiguous `D Month YYYY` / `D-Mon-YYYY`. Invalid calendar dates and other orders are rejected rather than guessed; amounts use no more than two decimal digits.
- Tolerance is deliberately fixed at PKR 0.00. Configurability requires a future approved, effective-dated, versioned master.
- Controlled resolution, return, reopening, supersession and reversal actions require an existing supporting upload plus reason. High-impact approval is segregated from requester, SCB uploader and original matcher. Manual resolution still requires exact amount; tolerance override is prohibited.
- Missing confirmation is represented by a Sent-to-Bank batch; no synthetic bank evidence is created.
- Monitor outcomes are gross so net-zero offsetting exceptions remain visible. Expanded multidimensional exports remain Stage 5.

## Unsupported evidence formats

Supported inputs are UTF-8 CSV with quoted fields; structured `.xlsx` ZIP/XML workbooks using inline or shared strings and the first worksheet; and machine-readable PDFs whose SCB values use explicit label/value text operators (`Tj`/`TJ`) in standard or Flate-compressed content streams. Raw and normalized values plus CSV/XLSX row or PDF page evidence locations are retained. Encrypted PDFs, custom/encoded font maps that do not expose text, malformed XLSX, legacy `.xls`, scans and image-only PDFs become **Parsing Exception**. OCR is not authorized. Filename-only matching remains prohibited.

## Verification

Automated controls cover CSV, XLSX, machine-readable PDF, image-only/unreadable PDF, controlled date normalization, exact paisa, mandatory validation, Sent-to-Bank eligibility, mismatches, ambiguity, derived counts, breakups, zero amounts, resolution authorization and segregation, reopening/reversal, and blocked unresolved output. Migration triggers reinforce evidence immutability, retention, eligibility and successful-processing transitions.

## Stage 5 boundary

Production readiness, broad reporting, security hardening, deployment runbooks, browser walkthrough, approved PDF rendering/templates, extraction adapters and final handover are not started.
