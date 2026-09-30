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
