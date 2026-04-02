import Link from "next/link";

interface Props {
  searchParams: Promise<{ status?: string; error?: string }>;
}

export default async function ConfirmPage({ searchParams }: Props) {
  const { status, error } = await searchParams;
  const success = status === "success";

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border p-8 text-center shadow-sm">
        {success ? (
          <>
            <h1 className="mb-2 text-2xl font-semibold text-green-600">
              Email confirmado!
            </h1>
            <p className="mb-6 text-gray-600">
              Sua conta foi ativada com sucesso.
            </p>
            <Link
              href="/login"
              className="inline-block rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
            >
              Fazer login
            </Link>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-semibold text-red-600">
              Link inválido
            </h1>
            <p className="mb-6 text-gray-600">
              {error === "expired"
                ? "Este link de confirmação expirou."
                : error === "already_confirmed"
                  ? "Esta conta já foi confirmada."
                  : "O link de confirmação é inválido ou não foi encontrado."}
            </p>
            <Link
              href="/register"
              className="inline-block rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
            >
              Novo cadastro
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
