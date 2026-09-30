PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO roles (id, code, name, description, created_at) VALUES
  ('role-operations', 'OPERATIONS_UPLOADER', 'Operations Uploader', 'Uploads operational files and reviews validation results.', 1789000000000),
  ('role-maker', 'FINANCE_MAKER', 'Finance Maker', 'Creates and submits payment batches.', 1789000000000),
  ('role-checker', 'FINANCE_CHECKER', 'Finance Checker/Approver', 'Reviews batches independently from the maker.', 1789000000000),
  ('role-decision', 'BUSINESS_DECISION_APPROVER', 'Business Decision Approver', 'Records allow or halt decisions for repeat submissions.', 1789000000000),
  ('role-treasury', 'TREASURY_UPLOADER', 'Treasury Uploader', 'Loads bank confirmations for reconciliation.', 1789000000000),
  ('role-audit', 'MANAGEMENT_AUDIT', 'Management/Audit', 'Read-only management and audit access.', 1789000000000),
  ('role-admin', 'SYSTEM_ADMIN', 'System Administrator', 'Administers users, roles, and controlled system configuration.', 1789000000000);

INSERT OR IGNORE INTO users (id, auth_subject, email, display_name, is_active, created_at, updated_at) VALUES
  ('user-local-admin', 'local_seedy', 'seedy@sites.test', 'Local System Administrator', 1, 1789000000000, 1789000000000),
  ('user-demo-maker', 'demo_maker', 'maker@example.invalid', 'Demo Finance Maker', 1, 1789000000000, 1789000000000),
  ('user-demo-checker', 'demo_checker', 'checker@example.invalid', 'Demo Finance Checker', 1, 1789000000000, 1789000000000);

INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at, assigned_by) VALUES
  ('user-local-admin', 'role-admin', 1789000000000, 'user-local-admin'),
  ('user-demo-maker', 'role-maker', 1789000000000, 'user-local-admin'),
  ('user-demo-checker', 'role-checker', 1789000000000, 'user-local-admin');

INSERT OR IGNORE INTO embassies (id, code, name, is_active, created_at, updated_at) VALUES
  ('embassy-italy', 'ITALY', 'Italy', 1, 1789000000000, 1789000000000),
  ('embassy-spain', 'SPAIN', 'Spain', 1, 1789000000000, 1789000000000);

INSERT OR IGNORE INTO vacs (id, code, name, region, is_active, created_at, updated_at) VALUES
  ('vac-isb', 'ISB', 'Islamabad', 'North', 1, 1789000000000, 1789000000000),
  ('vac-lhe', 'LHE', 'Lahore', 'Central', 1, 1789000000000, 1789000000000),
  ('vac-khi', 'KHI', 'Karachi', 'South', 1, 1789000000000, 1789000000000),
  ('vac-mlt', 'MLT', 'Multan', 'Central', 1, 1789000000000, 1789000000000),
  ('vac-fsd', 'FSD', 'Faisalabad', 'Central', 1, 1789000000000, 1789000000000),
  ('vac-uet', 'UET', 'Quetta', 'South', 1, 1789000000000, 1789000000000);

-- Fictional payment scenario uses Karachi for the Consulate of Italy. Finance must approve live beneficiary/VAC routing before activation.
INSERT OR IGNORE INTO beneficiary_bank_accounts (id, embassy_id, vac_id, beneficiary_name, iban, bank_name, effective_from, approval_status, is_active, approved_by, approved_at, created_at, updated_at) VALUES
  ('beneficiary-demo-001', 'embassy-italy', 'vac-khi', 'Consulate of Italy', 'PK18HABB0025257001606801', 'DEMO BANK NAME — VERIFY BEFORE USE', 1788134400000, 'APPROVED', 1, 'user-local-admin', 1789000000000, 1789000000000, 1789000000000);

INSERT OR IGNORE INTO file_uploads (id, original_file_name, file_hash, file_type, submission_date, uploader_id, row_count, accepted_count, rejected_count, status, created_at) VALUES
  ('upload-demo-001', 'DEMO-MANIFEST-NON-PRODUCTION.xlsx', 'demo-hash-stage-1', 'VISA_MANIFEST', 1788825600000, 'user-local-admin', 3, 3, 0, 'Validated', 1788912000000);

INSERT OR IGNORE INTO cases (id, normalized_case_number, normalized_booking_number, original_case_number, original_booking_number, embassy_id, vac_id, source_upload_id, booking_date, submission_date, visa_fee_paisa, status, created_at, updated_at) VALUES
  ('case-demo-001', 'DEMOCASE001', 'DEMOBOOK001', 'DEMO-CASE-001', 'DEMO-BOOK-001', 'embassy-italy', 'vac-khi', 'upload-demo-001', 1788739200000, 1788825600000, 3000000, 'Sent to Bank', 1788912000000, 1788912000000),
  ('case-demo-002', 'DEMOCASE002', 'DEMOBOOK002', 'DEMO-CASE-002', 'DEMO-BOOK-002', 'embassy-italy', 'vac-khi', 'upload-demo-001', 1788739200000, 1788825600000, 3000000, 'Sent to Bank', 1788912000000, 1788912000000),
  ('case-demo-003', 'DEMOCASE003', 'DEMOBOOK003', 'DEMO-CASE-003', 'DEMO-BOOK-003', 'embassy-spain', 'vac-lhe', 'upload-demo-001', 1788652800000, 1788825600000, 2500000, 'Business Decision Required', 1788912000000, 1788912000000);

INSERT OR IGNORE INTO payment_batches (id, batch_reference, embassy_id, vac_id, beneficiary_id, beneficiary_name_snapshot, beneficiary_account_snapshot, bank_name_snapshot, payment_processing_date, payable_amount_paisa, case_count, status, maker_id, created_at, updated_at) VALUES
  ('batch-demo-001', 'DEMO-IBFT-SEP26-00001', 'embassy-italy', 'vac-khi', 'beneficiary-demo-001', 'Consulate of Italy', 'PK18HABB0025257001606801', 'DEMO BANK NAME — VERIFY BEFORE USE', 1788912000000, 6000000, 2, 'Sent to Bank', 'user-local-admin', 1788912000000, 1788912000000);


INSERT OR IGNORE INTO payment_batch_cases (batch_id, case_id, added_at) VALUES
  ('batch-demo-001', 'case-demo-001', 1788912000000),
  ('batch-demo-001', 'case-demo-002', 1788912000000);

INSERT OR IGNORE INTO payment_batch_booking_breakups (id, batch_id, booking_date, case_count, amount_paisa, created_at) VALUES
  ('breakup-demo-001', 'batch-demo-001', 1788739200000, 2, 6000000, 1788912000000);

INSERT OR IGNORE INTO status_history (id, entity_type, entity_id, from_status, to_status, changed_by, reason, correlation_id, changed_at) VALUES
  ('history-demo-batch', 'payment_batch', 'batch-demo-001', 'Approved', 'Sent to Bank', 'user-local-admin', 'Fictional Stage 4 reconciliation candidate', 'corr-stage4-seed', 1788912000000);

INSERT OR IGNORE INTO audit_events (id, actor_id, action, entity_type, entity_id, after_json, reason, correlation_id, occurred_at) VALUES
  ('audit-demo-001', 'user-local-admin', 'DEMO_DATA_SEEDED', 'system', 'stage-1', '{"records":"non-sensitive demonstration data"}', 'Stage 1 demonstration environment', 'corr-stage1-seed', 1789000000000),
  ('audit-demo-002', 'user-local-admin', 'ROLE_ASSIGNED', 'user', 'user-local-admin', '{"role":"SYSTEM_ADMIN"}', 'Local development access', 'corr-stage1-seed', 1789000001000);


INSERT OR IGNORE INTO system_rules (code, value, description, updated_at, updated_by) VALUES
 ('REPEAT_WINDOW_DAYS', '14', 'Preceding-day window requiring a repeat-submission business decision.', 1789000000000, 'user-local-admin');

INSERT OR IGNORE INTO column_mappings (id, file_type, canonical_field, header_variation, is_required, is_active, created_at) VALUES
 ('map-case-number', 'VISA_MANIFEST', 'caseNumber', 'case number', 1, 1, 1789000000000),
 ('map-case-no', 'VISA_MANIFEST', 'caseNumber', 'case no', 1, 1, 1789000000000),
 ('map-booking-number', 'VISA_MANIFEST', 'bookingNumber', 'booking number', 1, 1, 1789000000000),
 ('map-booking-id', 'VISA_MANIFEST', 'bookingNumber', 'booking id', 1, 1, 1789000000000),
 ('map-embassy', 'VISA_MANIFEST', 'embassy', 'embassy', 1, 1, 1789000000000),
 ('map-vac', 'VISA_MANIFEST', 'vac', 'vac', 1, 1, 1789000000000),
 ('map-location', 'VISA_MANIFEST', 'vac', 'location', 1, 1, 1789000000000),
 ('map-booking-date', 'VISA_MANIFEST', 'bookingDate', 'booking date', 1, 1, 1789000000000),
 ('map-submission-date', 'VISA_MANIFEST', 'submissionDate', 'submission date', 1, 1, 1789000000000),
 ('map-reporting-date', 'VISA_MANIFEST', 'submissionDate', 'reporting date', 1, 1, 1789000000000),
 ('map-visa-fee', 'VISA_MANIFEST', 'visaFee', 'visa fee', 1, 1, 1789000000000),
 ('map-amount', 'VISA_MANIFEST', 'visaFee', 'amount', 1, 1, 1789000000000);
