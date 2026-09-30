# Operational IBFT Web System — Requirements Baseline

Status: Approved baseline for development  
Repository: private  
Business owner: Finance / INTIANA (Pvt) Ltd  
Fiscal year: July–June  
Currency: PKR  
Business timezone: Asia/Karachi

## 1. Objective

Build a secure, browser-based operational system that controls daily visa-fee payments, validates uploaded operational data, prevents duplicate or ineligible cases from entering payment processing, reconciles manifest amounts with SCB bank confirmations, and produces embassy-wise and VAC-wise payment confirmations and management reports.

The system must run from a laptop browser, support multiple authorized users, preserve a complete audit trail, and be delivered with deployable source code and technical documentation for the IT department.

## 2. Initial business scope

- Embassies: Italy and Spain, with an extensible embassy master.
- VACs: Islamabad, Lahore, Karachi, Multan, and Faisalabad, with an extensible VAC master.
- Operational inputs:
  - Visa manifest files.
  - Fee-cum-applicant files.
  - Embassy submission files.
  - SCB payment/confirmation files, including PDF or spreadsheet formats when supplied.
- Operational outputs:
  - Payment batches.
  - Embassy-wise payment information.
  - Booking-date-wise breakup within each payment.
  - Bank confirmation reconciliation.
  - Confirmation drafts in the approved embassy format.
  - One consolidated operational communication where required.
  - Exception, duplicate, pending-decision, unpaid, paid, and reconciliation reports.

## 3. Core workflow

1. Authorized user uploads operational files and identifies the file type when it cannot be detected reliably.
2. System stages the data and validates columns, data types, dates, embassy, VAC, booking/case identifiers, and visa-fee amounts.
3. System performs duplicate, repeat-submission, missing-field, invalid-date, invalid-amount, and cross-file consistency controls before posting.
4. Invalid records are rejected with specific reasons. Valid records are posted idempotently, without duplicating previously loaded records.
5. Eligible unpaid records are grouped for payment by embassy and VAC, while retaining booking-date-level detail.
6. Finance reviews a proposed payment batch. Any repeat case within the configured review window is excluded until an authorized business decision is recorded.
7. Maker submits the batch for approval; checker/approver approves or returns it. Segregation of duties prevents a maker from approving the same batch.
8. After payment processing, the SCB confirmation is uploaded and matched to the payment batch.
9. System reconciles amount by embassy, VAC, and payment-processing date, while separately showing every booking date contributing to that payment.
10. When reconciled, the batch status becomes **Processed Successfully**. Exceptions remain visible and cannot be silently cleared.
11. System generates the required embassy confirmation and consolidated operations message.
12. Every upload, edit, decision, approval, match, override, generation, and status change is audit logged.

## 4. Mandatory business rules

### 4.1 Upload controls

- Preserve the original uploaded file, file name, file hash, uploader, upload time, detected type, reporting/submission date, row count, accepted count, rejected count, and processing result.
- Block reprocessing of the same file hash unless an authorized administrator deliberately creates a new controlled version.
- Detect header variations through configurable column mappings.
- Never silently discard a row. Every rejected row must have a clear error code and explanation.
- Posting must be atomic: a failed batch must not create partial operational records.
- Provide downloadable row-level validation results.

### 4.2 Case uniqueness and repeat submissions

- Enforce case/booking uniqueness using normalized identifiers.
- Check both exact duplicates and case-insensitive/format-normalized duplicates.
- Check whether a case has already been submitted within the preceding 14 days; make this window configurable.
- A duplicate or repeat-submission record must not enter the payable population automatically.
- Put uncertain repeat submissions into **Business Decision Required** status.
- Authorized users can choose **Allow for Payment** or **Halt Payment**, with mandatory reason and audit trail.
- A halted or unresolved record is excluded completely from payment totals and confirmation counts.
- Do not physically delete financial or audit records; use controlled statuses.

### 4.3 Amount and count

- Visa-fee amount is sourced from the manifest's visa-fee field after validation.
- Counts are derived from eligible manifest cases; SCB confirmations do not supply case counts.
- Calculate and display case count and amount by embassy, VAC, booking date, submission date, and payment-processing date.
- Preserve decimal precision and prevent rounding differences from being hidden.

### 4.4 Reconciliation

- Match manifest payable totals to the relevant SCB confirmation by embassy, VAC, and payment-processing date.
- A payment date may settle cases from multiple earlier booking dates.
- Show each booking date separately, with its case count and amount, even when one SCB confirmation settles the combined total.
- Status **Processed Successfully** is allowed only when the approved payable amount equals the confirmed bank amount within a configurable tolerance.
- Show unmatched manifest records, unmatched confirmations, amount differences, duplicate confirmations, and partially matched batches as exceptions.
- Any manual match or tolerance override requires authorization, reason, and audit evidence.

### 4.5 Italy beneficiary

Default Italy beneficiary data:

- Beneficiary name: Consulate of Italy
- Beneficiary account number / IBAN: PK18HABB0025257001606801

Beneficiary information must come from an effective-dated, approval-controlled embassy bank master. It must appear in Italy payment instructions and confirmations. Italy outputs must follow the approved attached format and include booking-wise payment breakup. No unsupported segregation is to be invented.

### 4.6 Communications and documents

- Generate editable draft text before finalization.
- Final confirmation must be generated from locked, approved, reconciled data.
- Include embassy, beneficiary bank details where required, VAC, booking-date-wise counts and amounts, payment date, SCB references, and total transferred amount.
- Maintain document version, generator, generation time, and source batch.
- Support a consolidated operations message rather than forcing separate city emails when consolidation is required.

## 5. Status model

At minimum:

- Uploaded
- Validation Failed
- Validated
- Business Decision Required
- Halted
- Eligible for Payment
- Draft Batch
- Submitted for Approval
- Returned for Amendment
- Approved
- Sent for Processing
- Bank Confirmation Pending
- Reconciliation Exception
- Processed Successfully
- Cancelled

Status transitions must be enforced server-side and audited.

## 6. Roles and permissions

At minimum:

- Operations Uploader
- Finance Maker
- Finance Checker/Approver
- Business Decision Approver
- Treasury/Bank Confirmation Uploader
- Read-only Management/Audit
- System Administrator

Use least-privilege role-based access. Enforce maker-checker segregation, prevent self-approval, and protect master-data changes with approval where financial impact exists.

## 7. Screens

- Sign-in and access-denied screens.
- Operational dashboard.
- Upload center and upload history.
- Validation results and rejected-row details.
- Case register with search and filters.
- Duplicate/repeat-submission decision queue.
- Eligible/unpaid population.
- Payment batch creation and booking-wise breakup.
- Approval inbox and batch review.
- SCB confirmation upload and matching workspace.
- Reconciliation exceptions.
- Confirmation/document generation.
- Embassy, VAC, beneficiary, fee, tolerance, mapping, and rule administration.
- Audit trail.
- Reports and exports.

## 8. Dashboard and reporting

Filters:

- Date range
- Day
- Month
- Fiscal year (July–June)
- Embassy
- VAC
- Booking date
- Submission date
- Payment-processing date
- Status

KPIs:

- Uploaded cases and amount
- Valid eligible cases and amount
- Excluded duplicates/repeats
- Business decisions pending
- Unpaid cases and amount
- Approved/sent batches
- Bank confirmations pending
- Successfully processed cases and amount
- Reconciliation exceptions and variance
- Ageing of pending payments and exceptions

Provide VAC-wise and embassy-wise counts and amounts, current-period and fiscal-YTD views, and exportable detailed reports.

## 9. Audit, controls, and security

- Immutable audit events for authentication, file upload, record creation, field changes, decisions, approvals, overrides, matches, document generation, and master changes.
- Audit event includes actor, timestamp, action, entity, before/after values, reason, and correlation/batch reference.
- Server-side validation and authorization for all sensitive actions.
- Secure password handling or organization identity integration where available.
- Session timeout, account disablement, access logging, and safe error messages.
- Protect against common web vulnerabilities and malicious file uploads.
- Store secrets outside source control.
- Provide database backup and restore instructions.
- No production bank credentials or real applicant data in sample/demo fixtures.

## 10. Technical delivery baseline

Preferred maintainable architecture:

- TypeScript web application.
- Responsive browser UI.
- Relational database with migrations and constraints.
- Server-side API/service layer.
- Background-capable import processing.
- Automated checks for calculations, permissions, status transitions, duplicate prevention, and reconciliation.
- Docker-based local deployment.
- Environment-variable configuration.
- Seeded demonstration data containing no real personal data.
- Clear README and deployment guide for IT.

The cloud implementation may select a current stable framework and ORM, but must document the choice and keep the system deployable on standard organizational infrastructure. Avoid unnecessary vendor lock-in.

## 11. Delivery stages

### Stage 1 — Foundation
- Architecture, data model, authentication shell, roles, audit framework, Docker setup, migrations, and basic dashboard shell.

### Stage 2 — Data intake and controls
- Uploads, mappings, staging, validations, duplicate/repeat controls, decision queue, and case register.

### Stage 3 — Payments and approval
- Eligible population, payment batching, booking-date breakup, maker-checker workflow, and beneficiary controls.

### Stage 4 — Bank reconciliation and confirmations
- SCB confirmation intake, matching, exception management, successful-processing status, and confirmation generation.

### Stage 5 — Operational completion
- Reports, exports, security hardening, deployment instructions, technical documentation, and final project record.

Each stage must leave the repository in a runnable state and include a concise implementation summary.

## 12. Stage 1 completion criteria

Stage 1 is complete when:

- The application starts through documented commands and Docker Compose.
- Database migrations and demonstration seed work.
- Users can sign in using a safe local-development method.
- Role and permission enforcement is demonstrated.
- Core entities and status history exist.
- Audit events are written for key sample actions.
- A responsive dashboard shell and navigation for the required modules are present.
- Automated checks pass.
- README explains setup, architecture, environment variables, and next-stage work.

## 13. Non-negotiable delivery expectations

- Keep the repository private.
- Commit coherent, reviewable increments.
- Never claim a control is implemented unless it is enforced and verified.
- Preserve auditability; do not hard-delete operational or financial history.
- Keep calculations and eligibility rules on the server, not only in the browser.
- Do not use real applicant or bank-login credentials in development.
- Deliver complete source code and documentation suitable for IT handover.
