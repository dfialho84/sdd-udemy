"use client";

// Pagina de login — adapter de apresentacao (UI)
// Renderiza o formulario de login com campos identifier e password.
// Sem logica de negocio — delega autenticacao ao next-auth via signIn.
// Rastreabilidade: T-01 · T-03 · REQ-1 · NFR-1 · Scenario: "Login bem-sucedido com usuario"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";

interface LoginFormValues {
  identifier: string;
  password: string;
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  async function onSubmit(_: LoginFormValues) {
    setIsLoading(true);
    try {
      // Delegacao ao next-auth sera implementada em T-13
      // Por ora, apenas simula o estado de loading
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm rounded-lg bg-[#d4f252] p-8 shadow-md">
        <h1 className="mb-1 text-center text-2xl font-bold text-gray-900">
          Bem-vindo de volta
        </h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          gerencie seus projetos de forma pratica e gratuita
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          data-testid="login-form"
        >
          {/* Campo Identificador */}
          <div className="mb-4">
            <input
              id="identifier"
              type="text"
              placeholder="Nome de usuario ou email"
              aria-label="Nome de usuario ou email"
              {...register("identifier")}
              className={`w-full rounded border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.identifier ? "border-red-500" : "border-gray-300"
              }`}
              data-testid="input-identifier"
            />
            {errors.identifier && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.identifier.message}
              </p>
            )}
          </div>

          {/* Campo Senha */}
          <div className="mb-6">
            <input
              id="password"
              type="password"
              placeholder="Senha"
              aria-label="Senha"
              {...register("password")}
              className={`w-full rounded border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.password ? "border-red-500" : "border-gray-300"
              }`}
              data-testid="input-password"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Botao de Submit — estado Loading: spinner interno + desabilitado (T-03 · NFR-1) */}
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
                Entrando...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
