-- Migration: login_attempts e login_blocks
-- Rastreabilidade: T-26 · REQ-8 · REQ-9 · REQ-11 · REQ-12 · REQ-13 · NFR-1 · NFR-3 · NFR-4

-- Tabela login_attempts — registra toda tentativa de autenticacao (REQ-13)
-- Sem FK para users — identifier pode nao corresponder a usuario existente
CREATE TABLE `login_attempts` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`success` boolean NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_attempts_id` PRIMARY KEY(`id`)
);

-- Tabela login_blocks — registra bloqueios por excesso de tentativas (REQ-9)
-- Um identificador tem no maximo um bloqueio ativo por vez
CREATE TABLE `login_blocks` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`blocked_until` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_blocks_id` PRIMARY KEY(`id`)
);

-- Indices em identifier para performance das consultas de janela deslizante (NFR-1, NFR-3)
CREATE INDEX `login_attempts_identifier_idx` ON `login_attempts` (`identifier`);
CREATE INDEX `login_attempts_created_at_idx` ON `login_attempts` (`created_at`);

-- Indice em identifier para consulta rapida de bloqueio ativo (NFR-4)
CREATE INDEX `login_blocks_identifier_idx` ON `login_blocks` (`identifier`);
