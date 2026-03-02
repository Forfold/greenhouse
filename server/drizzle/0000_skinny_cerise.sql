CREATE TABLE `readings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`board` varchar(50) NOT NULL,
	`sensor` varchar(50) NOT NULL,
	`temp_f` double NOT NULL,
	`humidity` double NOT NULL,
	`recorded_at` bigint NOT NULL DEFAULT (UNIX_TIMESTAMP()),
	CONSTRAINT `readings_id` PRIMARY KEY(`id`)
);
