import type { Metadata } from "next";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = {
  title: "Ingreso de administrador",
  robots: { index: false, follow: false },
};

export default function PaginaLogin() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-green-900">Centro Botánico</h1>
        <p className="mb-6 text-sm text-zinc-600">Panel de administración</p>
        <FormularioLogin />
      </div>
    </main>
  );
}
