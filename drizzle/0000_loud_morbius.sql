CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`player` text NOT NULL,
	`level` integer NOT NULL,
	`created` integer NOT NULL,
	`used` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `runs_player_created` ON `runs` (`player`,`created`);--> statement-breakpoint
CREATE TABLE `scores` (
	`run` text PRIMARY KEY NOT NULL,
	`player` text NOT NULL,
	`name` text NOT NULL,
	`level` integer NOT NULL,
	`score` integer NOT NULL,
	`combo` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scores_level_score` ON `scores` (`level`,`score`);