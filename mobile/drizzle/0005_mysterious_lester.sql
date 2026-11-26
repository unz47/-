CREATE TABLE `sub_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`verdict` text NOT NULL,
	`usage` text,
	`reviewed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sub_reviews_sub_idx` ON `sub_reviews` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `sub_reviews_reviewed_idx` ON `sub_reviews` (`reviewed_at`);