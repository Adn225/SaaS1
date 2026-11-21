import Link from "next/link";
import { Logo } from "@/components/Logo";

/** Page d'accueil publique. */
export default function HomePage() {
  const steps = [
    { day: "J-3", title: "Rappel courtois", text: "Un message aimable quelques jours avant l'échéance." },
    { day: "J+3", title: "Première relance", text: "Un rappel poli, avec la mention des pénalités légales." },
    { day: "J+10", title: "Relance ferme", text: "Un ton plus direct et un délai de régularisation." },
    { day: "J+20", title: "Mise en demeure", text: "Un courrier PDF conforme, joint automatiquement." },
  ];
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link href="/connexion" className="btn-secondary">Connexion</Link>
          <Link href="/inscription" className="btn-primary">Essai gratuit</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-16 pb-20 text-center">
        <p className="mb-4 inline-block rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
          Pour les TPE, PME et indépendants
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Vos factures impayées relancées automatiquement
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Relancia envoie pour vous des relances polies et conformes aux usages français, jusqu&apos;à la mise en
          demeure. Vous vous concentrez sur votre métier, vous êtes payé plus vite.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/inscription" className="btn-primary px-6 py-3 text-base">Démarrer 14 jours gratuits</Link>
        </div>
        <p className="mt-3 text-sm text-slate-500">19 €/mois ensuite · sans engagement · sans carte bancaire pour l&apos;essai</p>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-semibold text-slate-900">Un scénario de relance éprouvé, entièrement modifiable</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.day} className="card p-6">
                <span className="text-sm font-bold text-brand-600">{s.day}</span>
                <h3 className="mt-2 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-slate-500">© {new Date().getFullYear()} Relancia</footer>
    </div>
  );
}
