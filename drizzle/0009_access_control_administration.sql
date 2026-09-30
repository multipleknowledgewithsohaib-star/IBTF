CREATE TABLE `user_access_history` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `role_id` text,
  `action` text NOT NULL,
  `reason` text NOT NULL,
  `changed_by` text NOT NULL,
  `correlation_id` text NOT NULL,
  `changed_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_user_access_history_user_time` ON `user_access_history` (`user_id`,`changed_at`);
--> statement-breakpoint
CREATE INDEX `idx_user_access_history_actor_time` ON `user_access_history` (`changed_by`,`changed_at`);
--> statement-breakpoint
CREATE TRIGGER `user_access_history_no_update` BEFORE UPDATE ON `user_access_history`
BEGIN SELECT RAISE(ABORT, 'user access history is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `user_access_history_no_delete` BEFORE DELETE ON `user_access_history`
BEGIN SELECT RAISE(ABORT, 'user access history must be retained'); END;
--> statement-breakpoint
CREATE TRIGGER `users_no_delete` BEFORE DELETE ON `users`
BEGIN SELECT RAISE(ABORT, 'users must be deactivated, not deleted'); END;
--> statement-breakpoint
CREATE TRIGGER `roles_no_delete` BEFORE DELETE ON `roles`
BEGIN SELECT RAISE(ABORT, 'role definitions must be retained'); END;
