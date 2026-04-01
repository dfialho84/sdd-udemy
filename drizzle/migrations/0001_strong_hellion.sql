CREATE TABLE `confirmation_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `confirmation_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `confirmation_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `confirmation_tokens` ADD CONSTRAINT `confirmation_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;