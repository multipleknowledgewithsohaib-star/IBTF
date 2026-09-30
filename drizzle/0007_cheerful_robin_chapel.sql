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
