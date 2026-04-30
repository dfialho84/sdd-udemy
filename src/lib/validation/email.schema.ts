// Schema Zod de validacao de formato de email (RFC 5322 simplificado)
// Rejeita strings sem @, sem dominio, ou com caracteres invalidos.
// Utilizado no route handler POST /api/auth/password-reset/request e no formulario React.
// Rastreabilidade: T-02 · REQ-3

import { z } from "zod";

// Regex de email seguindo RFC 5322 simplificado:
// - Local part: letras, digitos e caracteres especiais .!#$%&'*+/=?^_`{|}~-
// - Domain: labels separados por ponto, cada label 1-63 caracteres, TLD >= 2 letras
// - Rejeita strings sem @, sem dominio, com espacos ou caracteres invalidos
const emailRegex =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export const emailSchema = z
  .string({ error: "O campo email e obrigatorio." })
  .trim()
  .min(1, "O campo email e obrigatorio.")
  .regex(emailRegex, "Informe um endereco de email valido.");

export type Email = z.infer<typeof emailSchema>;
