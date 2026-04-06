"use client";

// Pagina de cadastro de usuario — /register
// Adapter de transporte inbound (UI): formulario que envia multipart/form-data para POST /api/auth/register.
// Implementacao com react-hook-forms e validacao Zod (STACK CLAUDE.md).
// Rastreabilidade: T-22 · REQ-1 · REQ-2 · REQ-4 · REQ-5 · REQ-6 · GH-1 · GH-2

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { RegisterUserInput } from "@/lib/validation/register-user.schema";
import { registerUserSchema } from "@/lib/validation/register-user.schema";

interface ApiError {
  codigo: number;
  mensagem: string;
  requestId: string;
  timestamp: string;
}

type FormValues = Omit<RegisterUserInput, "passwordConfirmation"> & {
  passwordConfirmation: string;
};

export default function RegisterPage() {
  const avatarRef = useRef<HTMLInputElement>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // React Hook Forms com resolutor Zod para validacao automatica (STACK: react-hook-forms + zod)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirmation: "",
      birthDate: "",
    },
  });

  // Efeito de limpeza ao enviar com sucesso (apenas exibicao)
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  async function onSubmit(data: FormValues) {
    setErrorMessage(null);
    setLoading(true);

    try {
      // Monta o FormData para envio como multipart/form-data (REQ-1 · DT-6)
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("email", data.email);
      formData.append("password", data.password);
      formData.append("passwordConfirmation", data.passwordConfirmation);
      formData.append("birthDate", data.birthDate);

      const avatarFile = avatarRef.current?.files?.[0];
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      // Nao define Content-Type — o browser define automaticamente com boundary correto
      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const result = (await res.json()) as { message: string };
        setSuccessMessage(result.message);
      } else {
        const errorData = (await res.json()) as ApiError;
        setErrorMessage(errorData.mensagem ?? "Erro ao realizar cadastro.");
      }
    } catch {
      setErrorMessage("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (successMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div
          role="alert"
          aria-live="polite"
          className="w-full max-w-md rounded-lg border border-green-200 bg-green-50 p-6 text-center"
          data-testid="success-message"
        >
          <p className="text-green-800">{successMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-2xl font-bold">Criar conta</h1>

        {errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            data-testid="error-message"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="register-form">
          {/* Campo Nome Completo */}
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Nome completo
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
              }`}
              data-testid="input-name"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600" data-testid="error-name">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Campo Email */}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
              }`}
              data-testid="input-email"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600" data-testid="error-email">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Campo Senha */}
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Senha
            </label>
            <input
              id="password"
              type="password"
              {...register("password")}
              className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
              }`}
              data-testid="input-password"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600" data-testid="error-password">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Campo Confirmacao de Senha */}
          <div>
            <label htmlFor="passwordConfirmation" className="mb-1 block text-sm font-medium">
              Confirmar senha
            </label>
            <input
              id="passwordConfirmation"
              type="password"
              {...register("passwordConfirmation")}
              className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.passwordConfirmation
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              data-testid="input-password-confirmation"
            />
            {errors.passwordConfirmation && (
              <p className="mt-1 text-xs text-red-600" data-testid="error-password-confirmation">
                {errors.passwordConfirmation.message}
              </p>
            )}
          </div>

          {/* Campo Data de Nascimento */}
          <div>
            <label htmlFor="birthDate" className="mb-1 block text-sm font-medium">
              Data de nascimento
            </label>
            <input
              id="birthDate"
              type="date"
              {...register("birthDate")}
              className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.birthDate ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
              }`}
              data-testid="input-birth-date"
            />
            {errors.birthDate && (
              <p className="mt-1 text-xs text-red-600" data-testid="error-birth-date">
                {errors.birthDate.message}
              </p>
            )}
          </div>

          {/* Campo Avatar Upload */}
          <div>
            <label htmlFor="avatar" className="mb-1 block text-sm font-medium">
              Foto de perfil (opcional — JPEG, PNG ou WebP, máx. 2 MB)
            </label>
            <input
              id="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              ref={avatarRef}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="input-avatar"
            />
          </div>

          {/* Botao de Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            data-testid="submit-button"
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>
      </div>
    </main>
  );
}
