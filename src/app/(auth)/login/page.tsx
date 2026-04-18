"use client";

// Pagina de login — adapter de apresentacao (UI)
// Renderiza o formulario de login com campos identifier e password.
// Sem logica de negocio — delega autenticacao ao next-auth via signIn.
// Rastreabilidade: T-01 · T-03 · T-04 · REQ-1 · REQ-5 · REQ-6 · REQ-7 · REQ-10 · REQ-11 · NFR-1 · NFR-6

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { signIn, getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

// Mapeamento de codigos de erro do next-auth para mensagens exibidas ao usuario (NFR-6)
const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Usuário ou senha incorretos",
  auth_failed: "Usuário ou senha incorretos",
  account_blocked: "Muitas tentativas fracassadas. Tente novamente em 15 minutos",
};

interface LoginFormValues {
  identifier: string;
  password: string;
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Le o parametro ?error= da URL — mecanismo padrao do next-auth para erros de autenticacao (T-04)
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      const message =
        ERROR_MESSAGES[errorParam] ?? "Usuário ou senha incorretos";
      setErrorMessage(message);
    }
  }, [searchParams]);

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

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // Delega ao next-auth que invoca o authorize callback (T-13).
      // callbackUrl sera /users/<id> — o redirect callback do next-auth (T-15)
      // redireciona para a URL correta apos sessao criada.
      const result = await signIn("credentials", {
        identifier: data.identifier,
        password: data.password,
        redirect: false,
      });

      if (!result || result.error) {
        const errorCode = result?.error ?? "CredentialsSignin";
        const message =
          ERROR_MESSAGES[errorCode] ?? "Usuário ou senha incorretos";
        setErrorMessage(message);
        setIsLoading(false);
        return;
      }

      // Autenticacao bem-sucedida — le a sessao para obter o id e redireciona (REQ-4, T-15, NFR-2)
      const session = await getSession();
      const userId = session?.user?.id;
      window.location.href = userId ? `/users/${userId}` : "/";
    } catch {
      setErrorMessage("Usuário ou senha incorretos");
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

        {/* Area de exibicao de mensagem de erro — T-04 · REQ-5 · REQ-7 · REQ-10 · REQ-11 · NFR-6 */}
        {errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
            data-testid="error-message"
          >
            {errorMessage}
          </div>
        )}

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
