ALTER TABLE `trend_tags` ADD `source` varchar(180) DEFAULT '手动记录' NOT NULL;--> statement-breakpoint
ALTER TABLE `trend_tags` ADD `collectedAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `trend_tags` ADD `automated` int DEFAULT 0 NOT NULL;