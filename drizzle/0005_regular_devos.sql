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