"use client";

// Pagina de solicitacao de recuperacao de senha — adapter de apresentacao (UI)
// Renderiza o formulario com campo de email para solicitar link de recuperacao.
// Sem logica de negocio — apenas validacao de formulario no cliente.
// Rastreabilidade: T-01 · REQ-1

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EsqueciSenhaFormValues {
  email: string;
}

export default function EsqueciSenhaPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EsqueciSenhaFormValues>({
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: EsqueciSenhaFormValues) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      if (response.ok) {
        const body = await response.json();
        setSuccessMessage(
          body.message ??
            "Se existe conta com esse email, voce recebera um link de recuperacao"
        );
      } else {
        const body = await response.json().catch(() => ({}));
        // Exibe erro do servidor se houver, senao mensagem generica
        if (body.code === "RATE_LIMIT_EXCEEDED") {
          setSuccessMessage(body.message);
        } else {
          setSuccessMessage(
            "Se existe conta com esse email, voce recebera um link de recuperacao"
          );
        }
      }
    } catch {
      setSuccessMessage(
        "Se existe conta com esse email, voce recebera um link de recuperacao"
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Apos sucesso, exibe a mensagem generica no lugar do formulario (REQ-2)
  if (successMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-4">
        <div className="w-full max-w-sm rounded-lg bg-[#d4f252] p-8 shadow-md">
          <p className="mb-6 text-center text-sm text-gray-700">
            {successMessage}
          </p>
          <p className="mb-4 text-center text-xs text-gray-500">
            Nao recebeu?{" "}
            <Link
              href="/register"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Crie uma conta
            </Link>
          </p>
          <div className="text-center">
            <Link href="/login">
              <Button variant="link">Voltar para o login</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm rounded-lg bg-[#d4f252] p-8 shadow-md">
        <h1 className="mb-1 text-center text-2xl font-bold text-gray-900">
          Recuperar senha
        </h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          Informe seu email para receber um link de recuperacao
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          data-testid="esqueci-senha-form"
        >
          {/* Campo Email */}
          <div className="mb-6">
            <input
              id="email"
              type="email"
              placeholder="Seu email"
              aria-label="Endereco de email"
              {...register("email", {
                required: "O email e obrigatorio",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Formato de email invalido",
                },
              })}
              className={`w-full rounded border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
              data-testid="input-email"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Botao de Submit */}
          <Button
            type="submit"
            variant="default"
            size="lg"
            disabled={isLoading}
            aria-busy={isLoading}
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
            data-testid="submit-button"
          >
            {isLoading ? (
              <>
                <svg
                  aria-hidden="true"
                  className="mr-2 inline-block h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  data-testid="loading-spinner"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Enviando...
              </>
            ) : (
              "Enviar link"
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="text-sm text-blue-600 underline hover:text-blue-800"
          >
            Voltar para o login
          </Link>
        </div>
      </div>
    </main>
  );
}
