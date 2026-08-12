CREATE TABLE `generation_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`windowStartedAt` timestamp NOT NULL,
	`windowCount` int NOT NULL DEFAULT 0,
	`activeUntil` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generation_usage_id` PRIMARY KEY(`id`),
	CONSTRAINT `generation_usage_owner_project_unique` UNIQUE(`userId`,`projectId`)
);
