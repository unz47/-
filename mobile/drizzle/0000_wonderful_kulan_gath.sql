CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`is_default` integer NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`amount` integer NOT NULL,
	`category_id` text NOT NULL,
	`memo` text,
	`created_at` text NOT NULL,
	`merchant` text,
	`merchant_key` text,
	`occurred_at` text
);
--> statement-breakpoint
CREATE INDEX `expenses_date_idx` ON `expenses` (`date`);--> statement-breakpoint
CREATE INDEX `expenses_category_idx` ON `expenses` (`category_id`);--> statement-breakpoint
CREATE INDEX `expenses_merchant_key_idx` ON `expenses` (`merchant_key`);--> statement-breakpoint
CREATE TABLE `sub_change_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`field` text NOT NULL,
	`old_value` text NOT NULL,
	`new_value` text NOT NULL,
	`changed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sub_change_logs_sub_idx` ON `sub_change_logs` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `sub_change_logs_changed_idx` ON `sub_change_logs` (`changed_at`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`service_name` text NOT NULL,
	`plan_name` text NOT NULL,
	`amount` integer NOT NULL,
	`billing_cycle` text NOT NULL,
	`category_id` text NOT NULL,
	`billing_day` integer NOT NULL,
	`billing_month` integer,
	`started_at` text NOT NULL,
	`canceled_at` text,
	`preset_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `subscriptions_service_idx` ON `subscriptions` (`service_name`);--> statement-breakpoint
CREATE INDEX `subscriptions_canceled_idx` ON `subscriptions` (`canceled_at`);