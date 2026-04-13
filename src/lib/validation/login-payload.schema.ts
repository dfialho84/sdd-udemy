// Schema Zod para o payload de login — POST /api/auth/callback/credentials
// Valida os campos identifier e password antes de delegar ao Domain.
// Rastreabilidade: T-02 · REQ-1 · REQ-6

import { z } from "zod";

export const loginPayloadSchema = z.object({
  identifier: z
    .string({ error: "O campo identificador e obrigatorio." })
    .trim()
    .min(1, "O campo identificador e obrigatorio."),
  password: z
    .string({ error: "O campo senha e obrigatorio." })
    .min(1, "O campo senha e obrigatorio."),
});

export type LoginPayload = z.infer<typeof loginPayloadSchema>;
