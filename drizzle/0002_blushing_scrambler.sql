ALTER TABLE `runs` ADD `points` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `runs` ADD `best_combo` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `runs` ADD `parent` text;--> statement-breakpoint
CREATE UNIQUE INDEX `runs_parent` ON `runs` (`parent`);--> statement-breakpoint
ALTER TABLE `scores` ADD `title` text DEFAULT 'Squire' NOT NULL;