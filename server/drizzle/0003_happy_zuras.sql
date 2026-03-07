CREATE TABLE `limit_windows` (
	`id` char(36) NOT NULL,
	`limit_id` char(36) NOT NULL,
	`period_start` datetime NOT NULL,
	`triggered_at` datetime,
	CONSTRAINT `limit_windows_id` PRIMARY KEY(`id`),
	CONSTRAINT `limit_id_idx` UNIQUE(`limit_id`)
);
--> statement-breakpoint
CREATE TABLE `limits` (
	`id` char(36) NOT NULL,
	`config_id` char(36) NOT NULL,
	`limit_value` double NOT NULL,
	`limit_unit` varchar(50) NOT NULL,
	`period` enum('minute','hour','day','month','year') NOT NULL,
	`period_count` int NOT NULL DEFAULT 1,
	`type` enum('threshold','rate') NOT NULL,
	`direction` enum('above','below','increase','decrease') NOT NULL,
	CONSTRAINT `limits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `limit_windows` ADD CONSTRAINT `limit_windows_limit_id_limits_id_fk` FOREIGN KEY (`limit_id`) REFERENCES `limits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `limits` ADD CONSTRAINT `limits_config_id_config_id_fk` FOREIGN KEY (`config_id`) REFERENCES `config`(`id`) ON DELETE no action ON UPDATE no action;