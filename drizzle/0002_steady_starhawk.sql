CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`target_date` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`milestones` text DEFAULT '[]' NOT NULL,
	`linked_node_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
