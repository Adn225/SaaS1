import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/AuthCard";
import { FlashMessages } from "@/components/Alert";
import { SubmitButton } from "@/components/SubmitButton";
import { signIn } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<{ erreur?: string; succes?: string }> }) {
  const params = await searchParams;
  return (
    <AuthCard title="Connexion" subtitle="Accédez à votre espace Relancia.">
      <FlashMessages searchParams={params} />
      <form action={signIn} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">Adresse email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label htmlFor="password" className="label">Mot de passe</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
        <SubmitButton className="btn-primary w-full" pendingText="Connexion…">Se connecter</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-medium text-brand-600 hover:underline">Essai gratuit de 14 jours</Link>
      </p>
    </AuthCard>
  );
}
