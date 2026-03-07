CREATE TABLE `config` (
	`id` char(36) NOT NULL,
	`reading_name` varchar(50) NOT NULL,
	`default_unit` varchar(50) NOT NULL,
	CONSTRAINT `config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

-- Seed config rows
SET @temp_id = UUID();
SET @humidity_id = UUID();

INSERT INTO `config` (`id`, `reading_name`, `default_unit`) VALUES
  (@temp_id, 'temperature', 'fahrenheit'),
  (@humidity_id, 'humidity', 'percentage');
--> statement-breakpoint

-- Add new columns as nullable first (required when existing rows are present)
ALTER TABLE `readings` ADD `config_id` char(36) NULL;
--> statement-breakpoint
ALTER TABLE `readings` ADD `value` double NULL;
--> statement-breakpoint
ALTER TABLE `readings` ADD `unit` varchar(50) NULL;
--> statement-breakpoint

-- Migrate existing rows to temperature readings (sensor col preserved as-is)
UPDATE `readings` SET
  `config_id` = @temp_id,
  `value` = `temp_f`,
  `unit` = 'fahrenheit';
--> statement-breakpoint

-- Insert a humidity reading for each existing row, copying sensor + recorded_at
INSERT INTO `readings` (`id`, `config_id`, `sensor`, `value`, `unit`, `recorded_at`)
SELECT UUID(), @humidity_id, `sensor`, `humidity`, 'percentage', `recorded_at`
FROM `readings`
WHERE `config_id` = @temp_id;
--> statement-breakpoint

-- Now enforce NOT NULL
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
