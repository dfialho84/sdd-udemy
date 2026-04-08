-- Renomeia coluna avatar_url → avatar_key na tabela users.
-- A object key do MinIO tem formato `avatars/<uuid>.<ext>` (max ~50 chars),
-- mas usamos VARCHAR(500) para margem de segurança.
-- Rastreabilidade: T-02 · REQ-2 · DT-6
ALTER TABLE `users` RENAME COLUMN `avatar_url` TO `avatar_key`;
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `avatar_key` varchar(500);
