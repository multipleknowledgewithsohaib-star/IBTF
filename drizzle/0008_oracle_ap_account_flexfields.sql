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
