"use client";

// Pagina de cadastro de usuario — /register
// Adapter de transporte inbound (UI): formulario que chama POST /api/auth/register.
// Rastreabilidade: T-22 · REQ-1 · REQ-2 · REQ-4 · REQ-5 · REQ-6 · GH-1 · GH-2

import { useState, FormEvent } from "react";

interface FormState {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  birthDate: string;
  avatarUrl: string;
}

interface ApiError {
  codigo: number;
  mensagem: string;
  requestId: string;
  timestamp: string;
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    passwordConfirmation: "",
    birthDate: "",
    avatarUrl: "",
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const payload: Record<string, string> = {
        name: form.name,
        email: form.email,
        password: form.password,
        passwordConfirmation: form.passwordConfirmation,
        birthDate: form.birthDate,
      };
      if (form.avatarUrl) {
        payload.avatarUrl = form.avatarUrl;
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = (await res.json()) as { message: string };
        setSuccessMessage(data.message);
      } else {
        const data = (await res.json()) as ApiError;
        setErrorMessage(data.mensagem ?? "Erro ao realizar cadastro.");
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

        <form
          onSubmit={handleSubmit}
          noValidate
          data-testid="register-form"
          className="flex flex-col gap-4"
        >
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Nome completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="input-name"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="input-email"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="input-password"
            />
          </div>

          <div>
            <label htmlFor="passwordConfirmation" className="mb-1 block text-sm font-medium">
              Confirmar senha
            </label>
            <input
              id="passwordConfirmation"
              name="passwordConfirmation"
              type="password"
              value={form.passwordConfirmation}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="input-password-confirmation"
            />
          </div>

          <div>
            <label htmlFor="birthDate" className="mb-1 block text-sm font-medium">
              Data de nascimento
            </label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              value={form.birthDate}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="input-birth-date"
            />
          </div>

          <div>
            <label htmlFor="avatarUrl" className="mb-1 block text-sm font-medium">
              Foto de perfil (URL — opcional)
            </label>
            <input
              id="avatarUrl"
              name="avatarUrl"
              type="url"
              value={form.avatarUrl}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="input-avatar-url"
            />
          </div>

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
