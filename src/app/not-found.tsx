import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Page introuvable</h1>
      <p className="text-slate-500">Cette page n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
      <Link href="/tableau-de-bord" className="btn-primary">Retour au tableau de bord</Link>
    </main>
  );
}
