ALTER TABLE `reconciliation_resolutions` ADD `proposed_batch_id` text REFERENCES payment_batches(id);--> statement-breakpoint
CREATE TRIGGER `reconciliation_resolutions_no_delete` BEFORE DELETE ON `reconciliation_resolutions` BEGIN SELECT RAISE(ABORT, 'resolution history must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER `reconciliation_resolutions_originals_immutable` BEFORE UPDATE OF `reconciliation_id`,`action`,`reason`,`evidence_upload_id`,`proposed_batch_id`,`requested_by`,`previous_status`,`correlation_id`,`created_at` ON `reconciliation_resolutions` BEGIN SELECT RAISE(ABORT, 'resolution request evidence is immutable'); END;
