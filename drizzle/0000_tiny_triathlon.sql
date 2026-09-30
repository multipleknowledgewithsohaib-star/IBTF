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
