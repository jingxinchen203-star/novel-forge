CREATE TABLE `trend_refresh_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskUid` varchar(65),
	`trigger` varchar(24) NOT NULL,
	`status` varchar(24) NOT NULL,
	`itemCount` int NOT NULL DEFAULT 0,
	`error` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trend_refresh_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `trend_refresh_runs_user_idx` ON `trend_refresh_runs` (`userId`);--> statement-breakpoint
CREATE INDEX `trend_refresh_runs_task_idx` ON `trend_refresh_runs` (`taskUid`);