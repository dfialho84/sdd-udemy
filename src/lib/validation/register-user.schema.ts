// Schema de validação para POST /api/auth/register
// Valida apenas os campos textuais recebidos via multipart/form-data.
// O campo `avatar` (File) é validado diretamente no RegisterUserHandler antes deste schema.
// Rastreabilidade: T-03 · REQ-1 · REQ-2 · REQ-4 · REQ-5 · REQ-6

import { z } from "zod";

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export const registerUserSchema = z
  .object({
    name: z
      .string({ error: "O campo nome completo é obrigatório." })
      .trim()
      .min(1, "O campo nome completo é obrigatório."),
    username: z
      .string({ error: "O campo username é obrigatório." })
      .trim()
      .min(1, "O campo username é obrigatório."),
    email: z
      .string({ error: "O campo email é obrigatório." })
      .trim()
      .min(1, "O campo email é obrigatório.")
      .email("Informe um endereço de email válido."),
    password: z
      .string({ error: "O campo senha é obrigatório." })
      .min(1, "O campo senha é obrigatório.")
      .regex(
        passwordRegex,
        "A senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.",
      ),
    passwordConfirmation: z
      .string({ error: "O campo confirmação de senha é obrigatório." })
      .min(1, "O campo confirmação de senha é obrigatório."),
    birthDate: z
      .string({ error: "O campo data de nascimento é obrigatório." })
      .trim()
      .min(1, "O campo data de nascimento é obrigatório.")
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "O campo data de nascimento deve estar no formato YYYY-MM-DD.",
      ),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["passwordConfirmation"],
  });

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
