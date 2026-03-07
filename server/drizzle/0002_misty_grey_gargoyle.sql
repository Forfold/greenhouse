CREATE TABLE IF NOT EXISTS `config` (
	`id` char(36) NOT NULL,
	`reading_name` varchar(50) NOT NULL,
	`default_unit` varchar(50) NOT NULL,
	CONSTRAINT `config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT IGNORE INTO `config` (`id`, `reading_name`, `default_unit`) VALUES
  ('c4a7e8b2-1f3d-4a56-9e8c-2b7f6a9d3e10', 'temperature', 'fahrenheit'),
  ('d5b8f9c3-2a4e-5b67-0f9d-3c8a7b0e4f21', 'humidity', 'percentage');
--> statement-breakpoint
ALTER TABLE `readings` ADD `config_id` char(36) NULL;
--> statement-breakpoint
ALTER TABLE `readings` ADD `value` double NULL;
--> statement-breakpoint
ALTER TABLE `readings` ADD `unit` varchar(50) NULL;
--> statement-breakpoint
UPDATE `readings` SET
  `config_id` = 'c4a7e8b2-1f3d-4a56-9e8c-2b7f6a9d3e10',
  `value` = `temp_f`,
  `unit` = 'fahrenheit';
--> statement-breakpoint
INSERT INTO `readings` (`id`, `config_id`, `sensor`, `value`, `unit`, `recorded_at`)
SELECT UUID(), 'd5b8f9c3-2a4e-5b67-0f9d-3c8a7b0e4f21', `sensor`, `humidity`, 'percentage', `recorded_at`
FROM `readings`
WHERE `config_id` = 'c4a7e8b2-1f3d-4a56-9e8c-2b7f6a9d3e10';
--> statement-breakpoint
ALTER TABLE `readings` MODIFY `config_id` char(36) NOT NULL;
--> statement-breakpoint
ALTER TABLE `readings` MODIFY `value` double NOT NULL;
--> statement-breakpoint
ALTER TABLE `readings` MODIFY `unit` varchar(50) NOT NULL;
--> statement-breakpoint
ALTER TABLE `readings` ADD CONSTRAINT `readings_config_id_config_id_fk` FOREIGN KEY (`config_id`) REFERENCES `config`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `readings` DROP COLUMN `board`;
--> statement-breakpoint
ALTER TABLE `readings` DROP COLUMN `temp_f`;
--> statement-breakpoint
ALTER TABLE `readings` DROP COLUMN `humidity`;
