-- Adiciona campo username (VARCHAR 50, NOT NULL, UNIQUE) à tabela users.
-- O DEFAULT '' temporario e necessario para bancos com dados existentes;
-- após a migration, o constraint NOT NULL e aplicado com o indice UNIQUE.
-- Rastreabilidade: T-85 · REQ-7 · NFR-6 · DT-10
ALTER TABLE `users` ADD `username` varchar(50) NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `users` ADD UNIQUE INDEX `users_username_unique`(`username`);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `username` varchar(50) NOT NULL;
