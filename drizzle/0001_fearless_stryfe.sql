ALTER TABLE `runs` ADD `ruleset` text DEFAULT 'classic-v1' NOT NULL;--> statement-breakpoint
ALTER TABLE `scores` ADD `ruleset` text DEFAULT 'classic-v1' NOT NULL;