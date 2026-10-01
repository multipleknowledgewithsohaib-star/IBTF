PRAGMA foreign_keys = ON;
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`reason` text,
	`correlation_id` text NOT NULL,
	`ip_address` text,
	`occurred_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `audit_events` (`entity_type`,`entity_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_actor_time` ON `audit_events` (`actor_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `beneficiary_bank_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`embassy_id` text NOT NULL,
	`beneficiary_name` text NOT NULL,
	`iban` text NOT NULL,
	`effective_from` integer NOT NULL,
	`effective_to` integer,
	`approval_status` text NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`embassy_id`) REFERENCES `embassies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_beneficiary_embassy_effective` ON `beneficiary_bank_accounts` (`embassy_id`,`effective_from`);--> statement-breakpoint
CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`normalized_case_number` text NOT NULL,
	`normalized_booking_number` text NOT NULL,
	`embassy_id` text NOT NULL,
	`vac_id` text NOT NULL,
	`source_upload_id` text NOT NULL,
	`booking_date` integer NOT NULL,
	`submission_date` integer NOT NULL,
	`visa_fee_paisa` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`embassy_id`) REFERENCES `embassies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vac_id`) REFERENCES `vacs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_upload_id`) REFERENCES `file_uploads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_cases_booking_embassy` ON `cases` (`normalized_booking_number`,`embassy_id`);--> statement-breakpoint
CREATE INDEX `idx_cases_case_submission` ON `cases` (`normalized_case_number`,`submission_date`);--> statement-breakpoint
CREATE INDEX `idx_cases_status_vac` ON `cases` (`status`,`vac_id`);--> statement-breakpoint
CREATE TABLE `embassies` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `embassies_code_unique` ON `embassies` (`code`);--> statement-breakpoint
CREATE TABLE `file_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`original_file_name` text NOT NULL,
	`file_hash` text NOT NULL,
	`file_type` text NOT NULL,
	`submission_date` integer,
	`uploader_id` text NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`accepted_count` integer DEFAULT 0 NOT NULL,
	`rejected_count` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`uploader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_file_upload_hash` ON `file_uploads` (`file_hash`);--> statement-breakpoint
CREATE INDEX `idx_file_upload_status` ON `file_uploads` (`status`);--> statement-breakpoint
CREATE TABLE `payment_batch_cases` (
	`batch_id` text NOT NULL,
	`case_id` text NOT NULL,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `payment_batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payment_batch_case` ON `payment_batch_cases` (`batch_id`,`case_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_case_single_active_batch` ON `payment_batch_cases` (`case_id`);--> statement-breakpoint
CREATE TABLE `payment_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_reference` text NOT NULL,
	`embassy_id` text NOT NULL,
	`vac_id` text NOT NULL,
	`payment_processing_date` integer,
	`payable_amount_paisa` integer DEFAULT 0 NOT NULL,
	`case_count` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`maker_id` text NOT NULL,
	`checker_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`embassy_id`) REFERENCES `embassies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vac_id`) REFERENCES `vacs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`maker_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`checker_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_batches_batch_reference_unique` ON `payment_batches` (`batch_reference`);--> statement-breakpoint
CREATE INDEX `idx_batches_status_date` ON `payment_batches` (`status`,`payment_processing_date`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_code_unique` ON `roles` (`code`);--> statement-breakpoint
CREATE TABLE `status_history` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`changed_by` text NOT NULL,
	`reason` text,
	`correlation_id` text NOT NULL,
	`changed_at` integer NOT NULL,
	FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_status_history_entity` ON `status_history` (`entity_type`,`entity_id`,`changed_at`);--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` text NOT NULL,
	`role_id` text NOT NULL,
	`assigned_at` integer NOT NULL,
	`assigned_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_user_roles_user_role` ON `user_roles` (`user_id`,`role_id`);--> statement-breakpoint
CREATE INDEX `idx_user_roles_user_id` ON `user_roles` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_subject` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_auth_subject_unique` ON `users` (`auth_subject`);--> statement-breakpoint
CREATE TABLE `vacs` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`region` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vacs_code_unique` ON `vacs` (`code`);
--> statement-breakpoint
CREATE TRIGGER `audit_events_no_update`
BEFORE UPDATE ON `audit_events`
BEGIN SELECT RAISE(ABORT, 'audit events are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `audit_events_no_delete`
BEFORE DELETE ON `audit_events`
BEGIN SELECT RAISE(ABORT, 'audit events are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `status_history_no_update`
BEFORE UPDATE ON `status_history`
BEGIN SELECT RAISE(ABORT, 'status history is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `status_history_no_delete`
BEFORE DELETE ON `status_history`
BEGIN SELECT RAISE(ABORT, 'status history is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `cases_no_delete`
BEFORE DELETE ON `cases`
BEGIN SELECT RAISE(ABORT, 'cases must be status-controlled, not deleted'); END;
--> statement-breakpoint
CREATE TRIGGER `payment_batches_no_delete`
BEFORE DELETE ON `payment_batches`
BEGIN SELECT RAISE(ABORT, 'payment batches must be status-controlled, not deleted'); END;
--> statement-breakpoint
CREATE TRIGGER `file_uploads_no_delete`
BEFORE DELETE ON `file_uploads`
BEGIN SELECT RAISE(ABORT, 'file uploads must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER `cases_amount_guard_insert`
BEFORE INSERT ON `cases` WHEN NEW.`visa_fee_paisa` < 0
BEGIN SELECT RAISE(ABORT, 'visa fee cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER `cases_amount_guard_update`
BEFORE UPDATE OF `visa_fee_paisa` ON `cases` WHEN NEW.`visa_fee_paisa` < 0
BEGIN SELECT RAISE(ABORT, 'visa fee cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER `payment_batches_sod_guard_insert`
BEFORE INSERT ON `payment_batches` WHEN NEW.`checker_id` = NEW.`maker_id`
BEGIN SELECT RAISE(ABORT, 'maker cannot check own batch'); END;
--> statement-breakpoint
CREATE TRIGGER `payment_batches_sod_guard_update`
BEFORE UPDATE OF `checker_id`, `maker_id` ON `payment_batches` WHEN NEW.`checker_id` = NEW.`maker_id`
BEGIN SELECT RAISE(ABORT, 'maker cannot check own batch'); END;

CREATE TABLE `business_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`decision` text NOT NULL,
	`reason` text NOT NULL,
	`decided_by` text NOT NULL,
	`decided_at` integer NOT NULL,
	`correlation_id` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_business_decision_case` ON `business_decisions` (`case_id`);--> statement-breakpoint
CREATE TABLE `column_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`file_type` text NOT NULL,
	`canonical_field` text NOT NULL,
	`header_variation` text NOT NULL,
	`is_required` integer DEFAULT true NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_mapping_type_header` ON `column_mappings` (`file_type`,`header_variation`);--> statement-breakpoint
CREATE TABLE `system_rules` (
	`code` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`description` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `upload_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`upload_id` text NOT NULL,
	`row_number` integer NOT NULL,
	`raw_json` text NOT NULL,
	`normalized_json` text,
	`is_valid` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`upload_id`) REFERENCES `file_uploads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_upload_row_number` ON `upload_rows` (`upload_id`,`row_number`);--> statement-breakpoint
CREATE TABLE `validation_errors` (
	`id` text PRIMARY KEY NOT NULL,
	`upload_row_id` text NOT NULL,
	`error_code` text NOT NULL,
	`field_name` text,
	`explanation` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`upload_row_id`) REFERENCES `upload_rows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_validation_row` ON `validation_errors` (`upload_row_id`);--> statement-breakpoint
ALTER TABLE `cases` ADD `original_case_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `cases` ADD `original_booking_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `file_uploads` ADD `detected_type` text DEFAULT 'UNKNOWN' NOT NULL;--> statement-breakpoint
ALTER TABLE `file_uploads` ADD `media_type` text DEFAULT 'application/octet-stream' NOT NULL;--> statement-breakpoint
ALTER TABLE `file_uploads` ADD `original_content_base64` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TRIGGER `business_decisions_no_update` BEFORE UPDATE ON `business_decisions` BEGIN SELECT RAISE(ABORT, 'business decisions are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `business_decisions_no_delete` BEFORE DELETE ON `business_decisions` BEGIN SELECT RAISE(ABORT, 'business decisions are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `upload_rows_no_update` BEFORE UPDATE ON `upload_rows` BEGIN SELECT RAISE(ABORT, 'staged upload rows are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `upload_rows_no_delete` BEFORE DELETE ON `upload_rows` BEGIN SELECT RAISE(ABORT, 'staged upload rows must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER `validation_errors_no_update` BEFORE UPDATE ON `validation_errors` BEGIN SELECT RAISE(ABORT, 'validation results are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `validation_errors_no_delete` BEFORE DELETE ON `validation_errors` BEGIN SELECT RAISE(ABORT, 'validation results must be retained'); END;

PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`normalized_case_number` text NOT NULL,
	`normalized_booking_number` text NOT NULL,
	`original_case_number` text DEFAULT '' NOT NULL,
	`original_booking_number` text DEFAULT '' NOT NULL,
	`embassy_id` text NOT NULL,
	`vac_id` text NOT NULL,
	`source_upload_id` text NOT NULL,
	`booking_date` integer NOT NULL,
	`submission_date` integer NOT NULL,
	`visa_fee_paisa` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`embassy_id`) REFERENCES `embassies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vac_id`) REFERENCES `vacs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_upload_id`) REFERENCES `file_uploads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_cases`("id", "normalized_case_number", "normalized_booking_number", "original_case_number", "original_booking_number", "embassy_id", "vac_id", "source_upload_id", "booking_date", "submission_date", "visa_fee_paisa", "status", "created_at", "updated_at") SELECT "id", "normalized_case_number", "normalized_booking_number", "original_case_number", "original_booking_number", "embassy_id", "vac_id", "source_upload_id", "booking_date", "submission_date", "visa_fee_paisa", "status", "created_at", "updated_at" FROM `cases`;--> statement-breakpoint
DROP TABLE `cases`;--> statement-breakpoint
ALTER TABLE `__new_cases` RENAME TO `cases`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_cases_booking_embassy` ON `cases` (`normalized_booking_number`,`embassy_id`);--> statement-breakpoint
CREATE INDEX `idx_cases_case_submission` ON `cases` (`normalized_case_number`,`submission_date`);--> statement-breakpoint
CREATE INDEX `idx_cases_status_vac` ON `cases` (`status`,`vac_id`);--> statement-breakpoint
CREATE TABLE `__new_file_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`original_file_name` text NOT NULL,
	`file_hash` text NOT NULL,
	`file_type` text NOT NULL,
	`detected_type` text DEFAULT 'UNKNOWN' NOT NULL,
	`media_type` text DEFAULT 'application/octet-stream' NOT NULL,
	`original_content_base64` text DEFAULT '' NOT NULL,
	`submission_date` integer,
	`uploader_id` text NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`accepted_count` integer DEFAULT 0 NOT NULL,
	`rejected_count` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`uploader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_file_uploads`("id", "original_file_name", "file_hash", "file_type", "detected_type", "media_type", "original_content_base64", "submission_date", "uploader_id", "row_count", "accepted_count", "rejected_count", "status", "created_at") SELECT "id", "original_file_name", "file_hash", "file_type", "detected_type", "media_type", "original_content_base64", "submission_date", "uploader_id", "row_count", "accepted_count", "rejected_count", "status", "created_at" FROM `file_uploads`;--> statement-breakpoint
DROP TABLE `file_uploads`;--> statement-breakpoint
ALTER TABLE `__new_file_uploads` RENAME TO `file_uploads`;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_file_upload_hash` ON `file_uploads` (`file_hash`);--> statement-breakpoint
CREATE INDEX `idx_file_upload_status` ON `file_uploads` (`status`);--> statement-breakpoint
CREATE TRIGGER `cases_no_delete` BEFORE DELETE ON `cases` BEGIN SELECT RAISE(ABORT, 'cases must be status-controlled, not deleted'); END;
--> statement-breakpoint
CREATE TRIGGER `cases_amount_guard_insert` BEFORE INSERT ON `cases` WHEN NEW.`visa_fee_paisa` < 0 BEGIN SELECT RAISE(ABORT, 'visa fee cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER `cases_amount_guard_update` BEFORE UPDATE OF `visa_fee_paisa` ON `cases` WHEN NEW.`visa_fee_paisa` < 0 BEGIN SELECT RAISE(ABORT, 'visa fee cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER `file_uploads_no_delete` BEFORE DELETE ON `file_uploads` BEGIN SELECT RAISE(ABORT, 'file uploads must be retained'); END;

CREATE TABLE `batch_reference_sequence` (
	`sequence_date` text PRIMARY KEY NOT NULL,
	`last_value` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_batch_booking_breakups` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`booking_date` integer NOT NULL,
	`case_count` integer NOT NULL,
	`amount_paisa` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `payment_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_batch_booking_date` ON `payment_batch_booking_breakups` (`batch_id`,`booking_date`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_payment_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_reference` text NOT NULL,
	`embassy_id` text NOT NULL,
	`vac_id` text NOT NULL,
	`beneficiary_id` text NOT NULL,
	`beneficiary_name_snapshot` text NOT NULL,
	`beneficiary_account_snapshot` text NOT NULL,
	`bank_name_snapshot` text NOT NULL,
	`payment_processing_date` integer NOT NULL,
	`payable_amount_paisa` integer DEFAULT 0 NOT NULL,
	`case_count` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`maker_id` text NOT NULL,
	`checker_id` text,
	`submitted_at` integer,
	`approved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`embassy_id`) REFERENCES `embassies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vac_id`) REFERENCES `vacs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`beneficiary_id`) REFERENCES `beneficiary_bank_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`maker_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`checker_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_payment_batches`("id", "batch_reference", "embassy_id", "vac_id", "beneficiary_id", "beneficiary_name_snapshot", "beneficiary_account_snapshot", "bank_name_snapshot", "payment_processing_date", "payable_amount_paisa", "case_count", "status", "maker_id", "checker_id", "submitted_at", "approved_at", "created_at", "updated_at") SELECT p."id", p."batch_reference", p."embassy_id", p."vac_id", COALESCE((SELECT b.id FROM beneficiary_bank_accounts b WHERE b.embassy_id=p.embassy_id LIMIT 1), 'beneficiary-demo-001'), COALESCE((SELECT b.beneficiary_name FROM beneficiary_bank_accounts b WHERE b.embassy_id=p.embassy_id LIMIT 1), 'HISTORICAL BENEFICIARY'), COALESCE((SELECT b.iban FROM beneficiary_bank_accounts b WHERE b.embassy_id=p.embassy_id LIMIT 1), 'HISTORICAL-ACCOUNT'), 'Not recorded in pre-Stage-3 data', COALESCE(p."payment_processing_date", p."created_at"), p."payable_amount_paisa", p."case_count", p."status", p."maker_id", p."checker_id", NULL, NULL, p."created_at", p."updated_at" FROM `payment_batches` p;--> statement-breakpoint
DROP TABLE `payment_batches`;--> statement-breakpoint
ALTER TABLE `__new_payment_batches` RENAME TO `payment_batches`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `payment_batches_batch_reference_unique` ON `payment_batches` (`batch_reference`);--> statement-breakpoint
CREATE INDEX `idx_batches_status_date` ON `payment_batches` (`status`,`payment_processing_date`);--> statement-breakpoint
ALTER TABLE `beneficiary_bank_accounts` ADD `bank_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `beneficiary_bank_accounts` ADD `vac_id` text DEFAULT 'vac-isb' NOT NULL REFERENCES vacs(id);--> statement-breakpoint
ALTER TABLE `beneficiary_bank_accounts` ADD `is_active` integer DEFAULT true NOT NULL;--> statement-breakpoint
CREATE TRIGGER `payment_batches_amount_guard_insert` BEFORE INSERT ON `payment_batches` WHEN NEW.`payable_amount_paisa` < 0 OR NEW.`case_count` <= 0 BEGIN SELECT RAISE(ABORT, 'invalid payment batch totals'); END;
--> statement-breakpoint
CREATE TRIGGER `payment_batches_financial_lock` BEFORE UPDATE OF `embassy_id`,`vac_id`,`beneficiary_id`,`beneficiary_name_snapshot`,`beneficiary_account_snapshot`,`bank_name_snapshot`,`payment_processing_date`,`payable_amount_paisa`,`case_count` ON `payment_batches` WHEN OLD.`status` IN ('Submitted for Approval','Approved','Rejected','Sent to Bank','Cancelled') BEGIN SELECT RAISE(ABORT, 'submitted payment batch financial details are locked'); END;
--> statement-breakpoint
CREATE TRIGGER `payment_batch_cases_lock_update` BEFORE UPDATE ON `payment_batch_cases` WHEN (SELECT status FROM payment_batches WHERE id=OLD.batch_id) NOT IN ('Draft','Returned for Amendment') BEGIN SELECT RAISE(ABORT, 'payment batch composition is locked'); END;
--> statement-breakpoint
CREATE TRIGGER `payment_batch_cases_lock_delete` BEFORE DELETE ON `payment_batch_cases` BEGIN SELECT RAISE(ABORT, 'payment batch case history must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER `payment_batches_no_delete` BEFORE DELETE ON `payment_batches` BEGIN SELECT RAISE(ABORT, 'payment batches must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER `beneficiary_no_update` BEFORE UPDATE OF `beneficiary_name`,`iban`,`bank_name`,`embassy_id`,`vac_id`,`effective_from` ON `beneficiary_bank_accounts` BEGIN SELECT RAISE(ABORT, 'create a new effective-dated beneficiary version instead'); END;
--> statement-breakpoint
CREATE TRIGGER `beneficiary_no_delete` BEFORE DELETE ON `beneficiary_bank_accounts` BEGIN SELECT RAISE(ABORT, 'beneficiary history must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER `batch_breakup_guard_insert` BEFORE INSERT ON `payment_batch_booking_breakups` WHEN NEW.`case_count` <= 0 OR NEW.`amount_paisa` < 0 BEGIN SELECT RAISE(ABORT, 'invalid booking-date breakup'); END;

CREATE TABLE `confirmation_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`reconciliation_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text NOT NULL,
	`content_json` text NOT NULL,
	`generated_by` text NOT NULL,
	`generated_at` integer NOT NULL,
	`correlation_id` text NOT NULL,
	FOREIGN KEY (`reconciliation_id`) REFERENCES `reconciliation_results`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_confirmation_version` ON `confirmation_documents` (`reconciliation_id`,`version`);--> statement-breakpoint
CREATE TABLE `reconciliation_case_links` (
	`reconciliation_id` text NOT NULL,
	`case_id` text NOT NULL,
	`source_upload_id` text NOT NULL,
	`booking_breakup_id` text NOT NULL,
	FOREIGN KEY (`reconciliation_id`) REFERENCES `reconciliation_results`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_upload_id`) REFERENCES `file_uploads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_breakup_id`) REFERENCES `payment_batch_booking_breakups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_reconciliation_case_link` ON `reconciliation_case_links` (`reconciliation_id`,`case_id`);--> statement-breakpoint
CREATE TABLE `reconciliation_resolutions` (
	`id` text PRIMARY KEY NOT NULL,
	`reconciliation_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`evidence_upload_id` text NOT NULL,
	`requested_by` text NOT NULL,
	`approved_by` text,
	`previous_status` text NOT NULL,
	`resulting_status` text NOT NULL,
	`correlation_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`reconciliation_id`) REFERENCES `reconciliation_results`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evidence_upload_id`) REFERENCES `file_uploads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reconciliation_results` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`batch_id` text,
	`outcome` text NOT NULL,
	`severity` text NOT NULL,
	`explanation` text NOT NULL,
	`expected_amount_paisa` integer,
	`variance_paisa` integer,
	`status` text NOT NULL,
	`matched_by` text,
	`reconciled_by` text,
	`correlation_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `scb_confirmation_records`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `payment_batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matched_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reconciled_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_reconciliation_record` ON `reconciliation_results` (`record_id`);--> statement-breakpoint
CREATE INDEX `idx_reconciliation_outcome` ON `reconciliation_results` (`outcome`,`status`);--> statement-breakpoint
CREATE TABLE `scb_confirmation_files` (
	`id` text PRIMARY KEY NOT NULL,
	`original_file_name` text NOT NULL,
	`file_hash` text NOT NULL,
	`media_type` text NOT NULL,
	`original_content_base64` text NOT NULL,
	`uploader_id` text NOT NULL,
	`status` text NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`accepted_count` integer DEFAULT 0 NOT NULL,
	`rejected_count` integer DEFAULT 0 NOT NULL,
	`parsing_result_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`uploader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scb_confirmation_files_file_hash_unique` ON `scb_confirmation_files` (`file_hash`);--> statement-breakpoint
CREATE INDEX `idx_scb_files_status` ON `scb_confirmation_files` (`status`);--> statement-breakpoint
CREATE TABLE `scb_confirmation_records` (
	`id` text PRIMARY KEY NOT NULL,
	`file_id` text NOT NULL,
	`record_number` integer NOT NULL,
	`bank_reference` text NOT NULL,
	`payment_date` integer NOT NULL,
	`beneficiary_name` text NOT NULL,
	`beneficiary_account` text NOT NULL,
	`paid_amount_paisa` integer NOT NULL,
	`embassy_reference` text,
	`vac_reference` text,
	`narrative` text,
	`evidence_location` text NOT NULL,
	`raw_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`file_id`) REFERENCES `scb_confirmation_files`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_scb_file_record` ON `scb_confirmation_records` (`file_id`,`record_number`);--> statement-breakpoint
CREATE INDEX `idx_scb_bank_reference` ON `scb_confirmation_records` (`bank_reference`);
--> statement-breakpoint
CREATE TRIGGER `scb_files_no_delete` BEFORE DELETE ON `scb_confirmation_files` BEGIN SELECT RAISE(ABORT, 'SCB evidence must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER `scb_files_evidence_immutable` BEFORE UPDATE OF `original_file_name`,`file_hash`,`media_type`,`original_content_base64`,`uploader_id`,`created_at` ON `scb_confirmation_files` BEGIN SELECT RAISE(ABORT, 'original SCB evidence is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `scb_records_immutable` BEFORE UPDATE ON `scb_confirmation_records` BEGIN SELECT RAISE(ABORT, 'parsed SCB evidence is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `scb_records_no_delete` BEFORE DELETE ON `scb_confirmation_records` BEGIN SELECT RAISE(ABORT, 'parsed SCB evidence must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER `reconciliation_no_delete` BEFORE DELETE ON `reconciliation_results` BEGIN SELECT RAISE(ABORT, 'reconciliation history must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER `reconciliation_match_eligible` BEFORE INSERT ON `reconciliation_results` WHEN NEW.batch_id IS NOT NULL AND (SELECT status FROM payment_batches WHERE id=NEW.batch_id) <> 'Sent to Bank' BEGIN SELECT RAISE(ABORT, 'only Sent to Bank batches may be matched'); END;
--> statement-breakpoint
CREATE TRIGGER `payment_batches_reconciliation_transition` BEFORE UPDATE OF `status` ON `payment_batches` WHEN NEW.status = 'Processed Successfully' AND OLD.status <> 'Sent to Bank' BEGIN SELECT RAISE(ABORT, 'successful processing requires a Sent to Bank batch'); END;

CREATE TABLE `scb_validation_errors` (
	`id` text PRIMARY KEY NOT NULL,
	`file_id` text NOT NULL,
	`record_number` integer,
	`error_code` text NOT NULL,
	`field_name` text,
	`explanation` text NOT NULL,
	`evidence_location` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`file_id`) REFERENCES `scb_confirmation_files`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_scb_validation_file` ON `scb_validation_errors` (`file_id`,`record_number`);
ALTER TABLE `reconciliation_resolutions` ADD `proposed_batch_id` text REFERENCES payment_batches(id);--> statement-breakpoint
CREATE TRIGGER `reconciliation_resolutions_no_delete` BEFORE DELETE ON `reconciliation_resolutions` BEGIN SELECT RAISE(ABORT, 'resolution history must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER `reconciliation_resolutions_originals_immutable` BEFORE UPDATE OF `reconciliation_id`,`action`,`reason`,`evidence_upload_id`,`proposed_batch_id`,`requested_by`,`previous_status`,`correlation_id`,`created_at` ON `reconciliation_resolutions` BEGIN SELECT RAISE(ABORT, 'resolution request evidence is immutable'); END;

CREATE TABLE `operational_evidence_links` (
	`id` text PRIMARY KEY NOT NULL,
	`evidence_upload_id` text NOT NULL,
	`manifest_upload_id` text NOT NULL,
	`case_id` text,
	`reason` text NOT NULL,
	`linked_by` text NOT NULL,
	`linked_at` integer NOT NULL,
	FOREIGN KEY (`evidence_upload_id`) REFERENCES `file_uploads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`manifest_upload_id`) REFERENCES `file_uploads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linked_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_operational_evidence_link` ON `operational_evidence_links` (`evidence_upload_id`,`manifest_upload_id`,`case_id`);--> statement-breakpoint
CREATE INDEX `idx_operational_evidence_manifest` ON `operational_evidence_links` (`manifest_upload_id`);--> statement-breakpoint
CREATE TRIGGER `operational_evidence_links_no_update` BEFORE UPDATE ON `operational_evidence_links` BEGIN SELECT RAISE(ABORT, 'evidence links are immutable; create a new audited link'); END;
--> statement-breakpoint
CREATE TRIGGER `operational_evidence_links_no_delete` BEFORE DELETE ON `operational_evidence_links` BEGIN SELECT RAISE(ABORT, 'evidence link history must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER `operational_evidence_source_guard` BEFORE INSERT ON `operational_evidence_links` WHEN (SELECT file_type FROM file_uploads WHERE id=NEW.evidence_upload_id) NOT IN ('FEE_CUM_APPLICANT','EMBASSY_SUBMISSION') OR (SELECT file_type FROM file_uploads WHERE id=NEW.manifest_upload_id) <> 'VISA_MANIFEST' BEGIN SELECT RAISE(ABORT, 'evidence may only support an authoritative manifest'); END;
--> statement-breakpoint
CREATE TRIGGER `processed_batch_financial_lock` BEFORE UPDATE OF `embassy_id`,`vac_id`,`beneficiary_id`,`beneficiary_name_snapshot`,`beneficiary_account_snapshot`,`bank_name_snapshot`,`payment_processing_date`,`payable_amount_paisa`,`case_count` ON `payment_batches` WHEN OLD.`status` IN ('Processed Successfully','Reconciliation Exception') BEGIN SELECT RAISE(ABORT, 'processed batch financial details are locked'); END;
--> statement-breakpoint
CREATE TRIGGER `processed_batch_status_lock` BEFORE UPDATE OF `status` ON `payment_batches` WHEN OLD.`status` = 'Processed Successfully' AND NEW.`status` <> 'Reconciliation Exception' BEGIN SELECT RAISE(ABORT, 'processed batch may only transition to reconciliation exception'); END;
--> statement-breakpoint
CREATE TRIGGER `processed_case_financial_lock` BEFORE UPDATE OF `normalized_case_number`,`normalized_booking_number`,`original_case_number`,`original_booking_number`,`embassy_id`,`vac_id`,`source_upload_id`,`booking_date`,`submission_date`,`visa_fee_paisa` ON `cases` WHEN OLD.`status` IN ('Processed Successfully','Reconciliation Exception') BEGIN SELECT RAISE(ABORT, 'processed case financial details are locked'); END;
--> statement-breakpoint
CREATE TRIGGER `processed_case_status_lock` BEFORE UPDATE OF `status` ON `cases` WHEN OLD.`status` = 'Processed Successfully' AND NEW.`status` <> 'Reconciliation Exception' BEGIN SELECT RAISE(ABORT, 'processed case may only transition to reconciliation exception'); END;
--> statement-breakpoint
CREATE TRIGGER `reconciliation_details_matched_only_insert` BEFORE INSERT ON `reconciliation_case_links` WHEN (SELECT outcome FROM reconciliation_results WHERE id=NEW.reconciliation_id) <> 'Matched' BEGIN SELECT RAISE(ABORT, 'detailed reconciliation links are allowed only for Matched outcomes'); END;

CREATE TABLE `oracle_ap_account_mappings` (
  `id` text PRIMARY KEY NOT NULL,
  `embassy_id` text NOT NULL,
  `vac_id` text NOT NULL,
  `vendor_name` text NOT NULL,
  `vendor_number` text NOT NULL,
  `vendor_site_code` text NOT NULL,
  `operating_unit` text NOT NULL,
  `org_id` text NOT NULL,
  `terms_name` text NOT NULL,
  `invoice_source` text NOT NULL,
  `line_type` text DEFAULT 'ITEM' NOT NULL,
  `interface_status` text DEFAULT 'NEW' NOT NULL,
  `ledger_name` text,
  `account_segments_json` text NOT NULL,
  `concatenated_account` text NOT NULL,
  `code_combination_id` text,
  `effective_from` integer NOT NULL,
  `effective_to` integer,
  `approval_status` text NOT NULL,
  `is_active` integer DEFAULT true NOT NULL,
  `approved_by` text,
  `approved_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`embassy_id`) REFERENCES `embassies`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`vac_id`) REFERENCES `vacs`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_oracle_ap_mapping_effective` ON `oracle_ap_account_mappings` (`embassy_id`,`vac_id`,`effective_from`);
--> statement-breakpoint
CREATE INDEX `idx_oracle_ap_mapping_vendor_site` ON `oracle_ap_account_mappings` (`vendor_name`,`vendor_number`,`vendor_site_code`);
--> statement-breakpoint
ALTER TABLE `payment_batches` ADD `oracle_ap_mapping_id` text REFERENCES oracle_ap_account_mappings(id);
--> statement-breakpoint
ALTER TABLE `payment_batches` ADD `oracle_vendor_name_snapshot` text;
--> statement-breakpoint
ALTER TABLE `payment_batches` ADD `oracle_vendor_number_snapshot` text;
--> statement-breakpoint
ALTER TABLE `payment_batches` ADD `oracle_vendor_site_snapshot` text;
--> statement-breakpoint
ALTER TABLE `payment_batches` ADD `oracle_operating_unit_snapshot` text;
--> statement-breakpoint
ALTER TABLE `payment_batches` ADD `oracle_org_id_snapshot` text;
--> statement-breakpoint
ALTER TABLE `payment_batches` ADD `oracle_terms_name_snapshot` text;
--> statement-breakpoint
ALTER TABLE `payment_batches` ADD `oracle_invoice_source_snapshot` text;
--> statement-breakpoint
ALTER TABLE `payment_batches` ADD `oracle_line_type_snapshot` text;
--> statement-breakpoint
ALTER TABLE `payment_batches` ADD `oracle_interface_status_snapshot` text;
--> statement-breakpoint
ALTER TABLE `payment_batches` ADD `oracle_account_flexfield_snapshot` text;
--> statement-breakpoint
ALTER TABLE `payment_batches` ADD `oracle_code_combination_id_snapshot` text;
--> statement-breakpoint
CREATE TRIGGER `oracle_ap_mapping_insert_guard` BEFORE INSERT ON `oracle_ap_account_mappings`
WHEN trim(NEW.`vendor_name`) = '' OR trim(NEW.`vendor_number`) = '' OR trim(NEW.`vendor_site_code`) = '' OR trim(NEW.`operating_unit`) = '' OR trim(NEW.`org_id`) = '' OR trim(NEW.`terms_name`) = '' OR trim(NEW.`invoice_source`) = '' OR trim(NEW.`line_type`) = '' OR trim(NEW.`interface_status`) = '' OR trim(NEW.`concatenated_account`) = '' OR json_valid(NEW.`account_segments_json`) = 0 OR (NEW.`effective_to` IS NOT NULL AND NEW.`effective_to` < NEW.`effective_from`) OR (NEW.`approval_status` = 'APPROVED' AND (NEW.`approved_by` IS NULL OR NEW.`approved_at` IS NULL))
BEGIN SELECT RAISE(ABORT, 'invalid Oracle AP account mapping'); END;
--> statement-breakpoint
CREATE TRIGGER `oracle_ap_mapping_update_guard` BEFORE UPDATE ON `oracle_ap_account_mappings`
WHEN trim(NEW.`vendor_name`) = '' OR trim(NEW.`vendor_number`) = '' OR trim(NEW.`vendor_site_code`) = '' OR trim(NEW.`operating_unit`) = '' OR trim(NEW.`org_id`) = '' OR trim(NEW.`terms_name`) = '' OR trim(NEW.`invoice_source`) = '' OR trim(NEW.`line_type`) = '' OR trim(NEW.`interface_status`) = '' OR trim(NEW.`concatenated_account`) = '' OR json_valid(NEW.`account_segments_json`) = 0 OR (NEW.`effective_to` IS NOT NULL AND NEW.`effective_to` < NEW.`effective_from`) OR (NEW.`approval_status` = 'APPROVED' AND (NEW.`approved_by` IS NULL OR NEW.`approved_at` IS NULL))
BEGIN SELECT RAISE(ABORT, 'invalid Oracle AP account mapping'); END;
--> statement-breakpoint
CREATE TRIGGER `oracle_ap_mapping_approved_financial_lock` BEFORE UPDATE OF `embassy_id`,`vac_id`,`vendor_name`,`vendor_number`,`vendor_site_code`,`operating_unit`,`org_id`,`terms_name`,`invoice_source`,`line_type`,`interface_status`,`ledger_name`,`account_segments_json`,`concatenated_account`,`code_combination_id`,`effective_from` ON `oracle_ap_account_mappings`
WHEN OLD.`approval_status` = 'APPROVED'
BEGIN SELECT RAISE(ABORT, 'approved Oracle AP mappings are immutable; close and create a new effective-dated record'); END;
--> statement-breakpoint
CREATE TRIGGER `oracle_ap_mapping_no_delete` BEFORE DELETE ON `oracle_ap_account_mappings`
BEGIN SELECT RAISE(ABORT, 'Oracle AP mapping history must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER `payment_batches_oracle_snapshot_lock` BEFORE UPDATE OF `oracle_ap_mapping_id`,`oracle_vendor_name_snapshot`,`oracle_vendor_number_snapshot`,`oracle_vendor_site_snapshot`,`oracle_operating_unit_snapshot`,`oracle_org_id_snapshot`,`oracle_terms_name_snapshot`,`oracle_invoice_source_snapshot`,`oracle_line_type_snapshot`,`oracle_interface_status_snapshot`,`oracle_account_flexfield_snapshot`,`oracle_code_combination_id_snapshot` ON `payment_batches`
WHEN OLD.`status` IN ('Submitted for Approval','Approved','Rejected','Sent to Bank','Cancelled','Processed Successfully','Reconciliation Exception')
BEGIN SELECT RAISE(ABORT, 'submitted payment batch Oracle AP details are locked'); END;

CREATE TABLE `user_access_history` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `role_id` text,
  `action` text NOT NULL,
  `reason` text NOT NULL,
  `changed_by` text NOT NULL,
  `correlation_id` text NOT NULL,
  `changed_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_user_access_history_user_time` ON `user_access_history` (`user_id`,`changed_at`);
--> statement-breakpoint
CREATE INDEX `idx_user_access_history_actor_time` ON `user_access_history` (`changed_by`,`changed_at`);
--> statement-breakpoint
CREATE TRIGGER `user_access_history_no_update` BEFORE UPDATE ON `user_access_history`
BEGIN SELECT RAISE(ABORT, 'user access history is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `user_access_history_no_delete` BEFORE DELETE ON `user_access_history`
BEGIN SELECT RAISE(ABORT, 'user access history must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER `users_no_delete` BEFORE DELETE ON `users`
BEGIN SELECT RAISE(ABORT, 'users must be deactivated, not deleted'); END;
--> statement-breakpoint
CREATE TRIGGER `roles_no_delete` BEFORE DELETE ON `roles`
BEGIN SELECT RAISE(ABORT, 'role definitions must be retained'); END;

CREATE TABLE `uat_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `run_reference` text NOT NULL,
  `environment` text NOT NULL,
  `server_name` text NOT NULL,
  `application_version` text NOT NULL,
  `source_commit` text NOT NULL,
  `overall_result` text NOT NULL,
  `pass_count` integer NOT NULL DEFAULT 0,
  `fail_count` integer NOT NULL DEFAULT 0,
  `blocked_count` integer NOT NULL DEFAULT 0,
  `not_executed_count` integer NOT NULL DEFAULT 0,
  `generated_by` text NOT NULL,
  `generated_at` integer NOT NULL,
  FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uat_runs_run_reference_unique` ON `uat_runs` (`run_reference`);
--> statement-breakpoint
CREATE INDEX `idx_uat_runs_generated_at` ON `uat_runs` (`generated_at`);
--> statement-breakpoint
CREATE TABLE `uat_scenario_results` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `scenario_code` text NOT NULL,
  `category` text NOT NULL,
  `title` text NOT NULL,
  `expected_outcome` text NOT NULL,
  `actual_outcome` text NOT NULL,
  `result` text NOT NULL,
  `evidence_json` text NOT NULL,
  `evaluated_at` integer NOT NULL,
  FOREIGN KEY (`run_id`) REFERENCES `uat_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_uat_scenario_run_code` ON `uat_scenario_results` (`run_id`,`scenario_code`);
--> statement-breakpoint
CREATE INDEX `idx_uat_scenario_result` ON `uat_scenario_results` (`result`);
--> statement-breakpoint
CREATE TRIGGER `uat_runs_no_update` BEFORE UPDATE ON `uat_runs` BEGIN SELECT RAISE(ABORT, 'UAT runs are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `uat_runs_no_delete` BEFORE DELETE ON `uat_runs` BEGIN SELECT RAISE(ABORT, 'UAT runs cannot be deleted'); END;
--> statement-breakpoint
CREATE TRIGGER `uat_scenario_results_no_update` BEFORE UPDATE ON `uat_scenario_results` BEGIN SELECT RAISE(ABORT, 'UAT scenario results are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `uat_scenario_results_no_delete` BEFORE DELETE ON `uat_scenario_results` BEGIN SELECT RAISE(ABORT, 'UAT scenario results cannot be deleted'); END;

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

