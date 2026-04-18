// Tipos LoginAttempt e LoginBlock — entidades de dominio para a feature login
// Representam o modelo de dados das tabelas login_attempts e login_blocks.
// Sem dependencias de Drizzle, Next.js ou React (constitution.md regras 13, 16, 18).
// Rastreabilidade: T-24 · REQ-8 · REQ-9 · REQ-13

/**
 * Registro de tentativa de autenticacao (bem-sucedida ou fracassada).
 * Sem chave estrangeira para users — identifier pode nao corresponder a nenhum
 * usuario existente (REQ-13 exige registro mesmo para identificadores inexistentes).
 * Mapeia para a tabela `login_attempts`.
 */
export interface LoginAttempt {
  /** Identificador unico da tentativa (UUID) */
  id: string;
  /** Valor submetido no campo de identificador (username ou email) */
  identifier: string;
  /** true se autenticacao bem-sucedida; false se fracassada */
  success: boolean;
  /** Timestamp da tentativa — usado para janela deslizante de 10 min (REQ-8, NFR-7) */
  created_at: Date;
}

/**
 * Registro de bloqueio de identificador apos 3 tentativas falhas em 10 minutos (REQ-9).
 * Um identificador tem no maximo um bloqueio ativo por vez.
 * Mapeia para a tabela `login_blocks`.
 */
export interface LoginBlock {
  /** Identificador unico do bloqueio (UUID) */
  id: string;
  /** Identificador bloqueado (username ou email) */
  identifier: string;
  /** Momento de expiracao do bloqueio — ativacao + 15 min (REQ-9, REQ-12) */
  blocked_until: Date;
  /** Timestamp de ativacao do bloqueio */
  created_at: Date;
}
