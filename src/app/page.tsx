// Pagina inicial — adapter de apresentacao (transport/UI)
// React Server Component: sem logica de negocio, sem imports de dominio.
// Rastreabilidade: T-66 · REQ-1 · REQ-2 · NFR-1 · NFR-9

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <h1 className="mb-4 text-3xl font-bold">Kanban App</h1>
        <p className="mb-8 text-gray-600">
          Gerencie seus sprints com quadros Kanban
        </p>
        <Link
          href="/register"
          className="inline-block rounded bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          data-testid="link-register"
        >
          Criar conta gratuita
        </Link>
      </div>
    </main>
  );
}
