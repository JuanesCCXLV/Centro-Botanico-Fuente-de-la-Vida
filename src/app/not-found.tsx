import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-5xl" aria-hidden>
        🌿
      </p>
      <h1 className="mt-4 text-2xl font-bold">No encontramos esta página</h1>
      <p className="mt-2 text-zinc-600">Puede que el producto ya no esté disponible.</p>
      <Link href="/" className="mt-6 rounded-full bg-green-800 px-5 py-2 font-semibold text-white hover:bg-green-900">
        Ver el catálogo
      </Link>
    </main>
  );
}
