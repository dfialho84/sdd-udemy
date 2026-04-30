"use client";

// Pagina de confirmacao de redefinicao de senha — adapter de apresentacao (UI)
// Exibida apos redefinicao bem-sucedida, com redirecionamento para login.
// Rastreabilidade: T-15 · REQ-11

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ConfirmacaoRedefinicaoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm rounded-lg bg-[#d4f252] p-8 shadow-md">
        <div className="mb-4 flex justify-center">
          <svg
            aria-hidden="true"
            className="h-12 w-12 text-green-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-center text-xl font-bold text-gray-900">
          Senha redefinida com sucesso
        </h1>

        <p className="mb-6 text-center text-sm text-gray-700">
          Sua senha foi alterada. Use sua nova senha para fazer login.
        </p>

        <div className="text-center">
          <Link href="/login">
            <Button
              variant="link"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Ir para o login
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
