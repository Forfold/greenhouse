ALTER TABLE `readings` MODIFY COLUMN `id` char(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `readings` MODIFY COLUMN `recorded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;