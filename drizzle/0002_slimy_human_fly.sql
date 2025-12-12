CREATE TABLE `login_attempts` (
	`ip` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_attempt` integer DEFAULT '"2025-12-11T19:26:12.945Z"',
	`blocked_until` integer
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_edits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`original_url` text NOT NULL,
	`result_url` text NOT NULL,
	`tool_used` text NOT NULL,
	`created_at` integer DEFAULT '"2025-12-11T19:26:12.945Z"',
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_edits`("id", "user_id", "original_url", "result_url", "tool_used", "created_at") SELECT "id", "user_id", "original_url", "result_url", "tool_used", "created_at" FROM `edits`;--> statement-breakpoint
DROP TABLE `edits`;--> statement-breakpoint
ALTER TABLE `__new_edits` RENAME TO `edits`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_password_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT '"2025-12-11T19:26:12.946Z"',
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_password_requests`("id", "user_id", "status", "created_at") SELECT "id", "user_id", "status", "created_at" FROM `password_requests`;--> statement-breakpoint
DROP TABLE `password_requests`;--> statement-breakpoint
ALTER TABLE `__new_password_requests` RENAME TO `password_requests`;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text,
	`role` text DEFAULT 'user' NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`is_password_changed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT '"2025-12-11T19:26:12.945Z"'
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "password_hash", "name", "role", "approved", "is_password_changed", "created_at") SELECT "id", "email", "password_hash", "name", "role", 0 as "approved", "is_password_changed", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);