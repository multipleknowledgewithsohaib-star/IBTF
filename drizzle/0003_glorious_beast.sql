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
