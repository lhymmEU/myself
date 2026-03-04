CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`frequency` text DEFAULT 'daily' NOT NULL,
	`completions` text DEFAULT '[]' NOT NULL,
	`linked_node_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '{}' NOT NULL,
	`linked_node_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
