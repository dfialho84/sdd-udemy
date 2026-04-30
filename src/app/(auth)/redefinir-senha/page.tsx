"use client";

// Pagina de redefinicao de senha — adapter de apresentacao (UI)
// Exibe formulario para definir nova senha apos validacao do token.
// Rastreabilidade: T-14 · REQ-7 · REQ-9

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PasswordStrength {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  specialChar: boolean;
}

function checkStrength(password: string): PasswordStrength {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    specialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const strength = checkStrength(password);
  const allCriteriaMet = Object.values(strength).every(Boolean);
  const passwordsMatch = password === passwordConfirm && password.length > 0;

  // Validar token ao carregar a pagina
  useEffect(() => {
    async function validateToken() {
      if (!token || token.length < 32) {
        setTokenError("O link de recuperacao e invalido");
        setIsValidatingToken(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/password-reset/validate?token=${encodeURIComponent(token)}`,
        );

        if (!response.ok) {
          if (response.status === 410) {
            setTokenError("O link de recuperacao expirou");
          } else {
            setTokenError("O link de recuperacao e invalido");
          }
        }
      } catch {
        setTokenError("Erro ao validar o link de recuperacao");
      } finally {
        setIsValidatingToken(false);
      }
    }

    validateToken();
  }, [token]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage(null);

      if (!passwordsMatch) {
        setErrorMessage("As senhas nao coincidem");
        return;
      }

      if (!allCriteriaMet) {
        setErrorMessage("A senha nao atende aos criterios de forca");
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch("/api/auth/password-reset/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password, passwordConfirm }),
        });

        if (response.ok) {
          setSuccessMessage("Senha redefinida com sucesso");
          // Redirecionar para login apos 3 segundos
          setTimeout(() => {
            router.push("/login");
          }, 3000);
        } else {
          const body = await response.json().catch(() => ({}));
          if (body.code === "WEAK_PASSWORD") {
            setErrorMessage(body.message ?? "Senha nao atende aos criterios de forca");
          } else if (body.code === "PASSWORDS_MISMATCH") {
            setErrorMessage("As senhas nao coincidem");
          } else {
            setErrorMessage("Erro ao redefinir a senha. Tente novamente.");
          }
        }
      } catch {
        setErrorMessage("Erro de conexao. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
    },
    [token, password, passwordConfirm, passwordsMatch, allCriteriaMet, router],
  );

  // Tela de validacao do token
  if (isValidatingToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-4">
        <div className="w-full max-w-sm rounded-lg bg-[#d4f252] p-8 shadow-md">
          <p className="text-center text-sm text-gray-700">
            Validando link de recuperacao...
          </p>
        </div>
      </main>
    );
  }

  // Token invalido/expirado — mostrar erro e link para solicitar novo
  if (tokenError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-4">
        <div className="w-full max-w-sm rounded-lg bg-[#d4f252] p-8 shadow-md">
          <p className="mb-4 text-center text-sm text-red-600">{tokenError}</p>
          <div className="text-center">
            <Link href="/esqueci-senha">
              <Button variant="default" className="w-full bg-blue-600 text-white hover:bg-blue-700">
                Solicitar novo link
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Sucesso — exibir mensagem e redirecionar
  if (successMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-4">
        <div className="w-full max-w-sm rounded-lg bg-[#d4f252] p-8 shadow-md">
          <p className="mb-6 text-center text-sm text-gray-700">
            {successMessage}
          </p>
          <p className="mb-4 text-center text-xs text-gray-500">
            Voce sera redirecionado para o login em instantes...
          </p>
          <div className="text-center">
            <Link href="/login">
              <Button variant="link">Ir para o login</Button>
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
          Redefinir senha
        </h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          Escolha uma nova senha para sua conta
        </p>

        <form
          onSubmit={onSubmit}
          noValidate
          data-testid="redefinir-senha-form"
        >
          {/* Nova Senha */}
          <div className="mb-4">
            <input
              id="password"
              type="password"
              placeholder="Nova senha"
              aria-label="Nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                password.length > 0 && !allCriteriaMet
                  ? "border-yellow-500"
                  : password.length > 0 && allCriteriaMet
                  ? "border-green-500"
                  : "border-gray-300"
              }`}
              data-testid="input-password"
            />
          </div>

          {/* Confirmacao da Senha */}
          <div className="mb-4">
            <input
              id="passwordConfirm"
              type="password"
              placeholder="Confirme a nova senha"
              aria-label="Confirmacao da nova senha"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className={`w-full rounded border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                passwordConfirm.length > 0 && !passwordsMatch
                  ? "border-red-500"
                  : passwordConfirm.length > 0 && passwordsMatch
                  ? "border-green-500"
                  : "border-gray-300"
              }`}
              data-testid="input-password-confirm"
            />
          </div>

          {/* Criterios de forca da senha */}
          {password.length > 0 && (
            <div className="mb-4 space-y-1 text-xs">
              <p className="font-medium text-gray-700">
                Criterios de forca da senha:
              </p>
              <ul className="space-y-0.5">
                <li
                  className={
                    strength.minLength ? "text-green-600" : "text-gray-500"
                  }
                >
                  {strength.minLength ? "+" : "-"} Minimo de 8 caracteres
                </li>
                <li
                  className={
                    strength.uppercase ? "text-green-600" : "text-gray-500"
                  }
                >
                  {strength.uppercase ? "+" : "-"} Pelo menos uma letra maiuscula
                </li>
                <li
                  className={
                    strength.lowercase ? "text-green-600" : "text-gray-500"
                  }
                >
                  {strength.lowercase ? "+" : "-"} Pelo menos uma letra minuscula
                </li>
                <li
                  className={
                    strength.number ? "text-green-600" : "text-gray-500"
                  }
                >
                  {strength.number ? "+" : "-"} Pelo menos um numero
                </li>
                <li
                  className={
                    strength.specialChar ? "text-green-600" : "text-gray-500"
                  }
                >
                  {strength.specialChar ? "+" : "-"} Pelo menos um caractere
                  especial
                </li>
              </ul>
            </div>
          )}

          {/* Mensagem de erro */}
          {errorMessage && (
            <p className="mb-4 text-xs text-red-600" role="alert">
              {errorMessage}
            </p>
          )}

          {/* Botao de Submit */}
          <Button
            type="submit"
            variant="default"
            size="lg"
            disabled={isLoading || !allCriteriaMet || !passwordsMatch}
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
                Redefinindo...
              </>
            ) : (
              "Redefinir senha"
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
