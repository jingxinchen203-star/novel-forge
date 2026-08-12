CREATE TABLE `chapters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`chapterNumber` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`outline` text NOT NULL,
	`body` text NOT NULL,
	`targetWords` int NOT NULL DEFAULT 3000,
	`status` enum('planned','draft','revised') NOT NULL DEFAULT 'planned',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chapters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`entityType` enum('outline','chapter') NOT NULL,
	`entityId` int NOT NULL,
	`label` varchar(160) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`title` varchar(180) NOT NULL,
	`message` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `novel_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`genre` varchar(120) NOT NULL,
	`synopsis` text NOT NULL,
	`targetWords` int NOT NULL DEFAULT 100000,
	`status` enum('draft','writing','completed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `novel_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_docs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`worldSetting` text NOT NULL,
	`characters` text NOT NULL,
	`conflicts` text NOT NULL,
	`styleGuide` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_docs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trend_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(80) NOT NULL,
	`category` varchar(80) NOT NULL,
	`heat` int NOT NULL DEFAULT 50,
	`note` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trend_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `writing_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`cronExpression` varchar(80) NOT NULL,
	`timezone` varchar(80) NOT NULL DEFAULT 'UTC',
	`enabled` int NOT NULL DEFAULT 1,
	`schedule_cron_task_uid` varchar(65),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `writing_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `chapters_project_idx` ON `chapters` (`projectId`);--> statement-breakpoint
CREATE INDEX `content_versions_entity_idx` ON `content_versions` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `novel_projects_user_idx` ON `novel_projects` (`userId`);--> statement-breakpoint
CREATE INDEX `project_docs_project_idx` ON `project_docs` (`projectId`);--> statement-breakpoint
CREATE INDEX `trend_tags_user_idx` ON `trend_tags` (`userId`);--> statement-breakpoint
CREATE INDEX `writing_schedules_task_idx` ON `writing_schedules` (`schedule_cron_task_uid`);