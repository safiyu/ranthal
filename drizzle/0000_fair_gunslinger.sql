CREATE TABLE `edits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`original_url` text NOT NULL,
	`result_url` text NOT NULL,
	`tool_used` text NOT NULL,
	`created_at` integer DEFAULT '"2025-12-10T21:40:28.569Z"',
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `password_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT '"2025-12-10T21:40:28.570Z"',
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text,
	`role` text DEFAULT 'user' NOT NULL,
	`is_password_changed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT '"2025-12-10T21:40:28.569Z"'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);