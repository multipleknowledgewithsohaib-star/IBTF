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
