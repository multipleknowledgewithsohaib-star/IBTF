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
