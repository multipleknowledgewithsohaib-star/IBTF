# Stage 5 operational verification and production-hardening report

Date: 2026-09-13  
Scope: clean replacement implementation based on the merged Stage 4 baseline

## Implemented controls

- Operational manifests accept UTF-8 CSV, XLSX, and BIFF8 XLS. Workbook processing uses canonical worksheet/header mappings, strict PKR-to-paisa conversion, controlled text dates, and Excel serial dates with the workbook's 1904/1900 epoch.
- XLSX ZIP central-directory entry counts, names, encryption flags, declared compressed/expanded sizes, and expansion ratios are checked before decompression. Workbook relationships select the canonical sheet; shared strings are bounded and resolved exactly. Formula cells carrying cached results are rejected.
- BIFF8 parsing bounds OLE allocations, sector chains, records, rows, columns, strings, and characters. SST `CONTINUE` encoding transitions are parsed explicitly and malformed transitions fail closed. NUMBER, RK, and MULRK numeric records remain supported. DATEMODE controls the date epoch.
- `FEE_CUM_APPLICANT` and embassy-submission inputs are retained only as immutable supporting evidence. Only `VISA_MANIFEST` can post cases. Evidence links require a manifest target, an allowed evidence source, a reason, actor, and timestamp; database triggers preserve the link history.
- Existing normalized duplicate and inclusive configurable 14-day repeat controls remain authoritative and atomic.
- Zero-amount manifest rows remain staged and posted for audit/exception visibility, but server-side composition and reporting helpers exclude them from payable batches, counts, booking-date breakups, and totals.
- CSV, XLSX, and supported text-PDF SCB ingestion has bounded input and stable failure codes. Unsupported/image-only PDFs remain controlled exceptions rather than guessed data.
- Reconciliation preserves the uniquely applicable candidate batch, expected batch amount, and signed variance in integer paisa. Case-level detail is inserted only for `Matched` outcomes.
- Database triggers lock processed batch/case financial attributes. The only permitted processed status exit is `Processed Successfully` to `Reconciliation Exception`, performed by the approved reversal path.

## Safety assumptions

- Formula-derived spreadsheet values are not authoritative even when a workbook contains a cached value; the uploader must provide static exported values.
- Excel's fictitious 1900-02-29 is normalized to 1900-02-28. This is deterministic and avoids creating a nonexistent date.
- The custom BIFF implementation intentionally accepts BIFF8 `.xls` only. Older BIFF dialects, encrypted workbooks, extended DIFAT chains, macros as data sources, OCR, and encoded-font PDF extraction fail closed.
- Supporting-evidence files do not overwrite any manifest field. Linking records evidence provenance only.

## Verification record

The replacement was checked with ESLint, strict TypeScript, exactly 75 automated control tests, a production build, and a clean local migration/seed cycle. Repository diff whitespace, tracked binary artifacts, and sensitive-data patterns were also checked. Synthetic spreadsheet/PDF structures exist only in test source; no generated workbook or PDF is committed.

Dependency audit is environment-dependent: the package manager audit is attempted separately and any registry/network limitation must be reported in the PR rather than represented as a successful security result.

## Remaining operational handover work

- Organization identity integration, production secrets, TLS/edge policy, backup schedules, monitoring destinations, and retention periods must be supplied and approved by IT before production use.
- Machine-readable PDF layouts outside the documented label/value profile need an approved parser mapping. Scanned PDFs require an authorized OCR workflow.
- Production acceptance should include business-owned representative files in a protected environment; those files must not be committed.
