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
