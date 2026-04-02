"use client";

// Pagina de cadastro de usuario — /register
// Adapter de transporte inbound (UI): formulario que envia multipart/form-data para POST /api/auth/register.
// Rastreabilidade: T-22 · REQ-1 · REQ-2 · REQ-4 · REQ-5 · REQ-6 · GH-1 · GH-2

import { useState, FormEvent, useRef } from "react";

interface ApiError {
  codigo: number;
  mensagem: string;
  requestId: string;
  timestamp: string;
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const avatarRef = useRef<HTMLInputElement>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      // Monta o FormData para envio como multipart/form-data (REQ-1 · DT-6)
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("passwordConfirmation", passwordConfirmation);
      formData.append("birthDate", birthDate);

      const avatarFile = avatarRef.current?.files?.[0];
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      // Não define Content-Type — o browser define automaticamente com boundary correto
      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: formData,
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
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
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
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="input-birth-date"
            />
          </div>

          <div>
            <label htmlFor="avatar" className="mb-1 block text-sm font-medium">
              Foto de perfil (opcional — JPEG, PNG ou WebP, máx. 2 MB)
            </label>
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              ref={avatarRef}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="input-avatar"
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
