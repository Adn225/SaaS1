import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/AuthCard";
import { FlashMessages } from "@/components/Alert";
import { SubmitButton } from "@/components/SubmitButton";
import { signUp } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function InscriptionPage({ searchParams }: { searchParams: Promise<{ erreur?: string; succes?: string }> }) {
  const params = await searchParams;
  return (
    <AuthCard title="Créer votre compte" subtitle="14 jours d'essai gratuit, sans carte bancaire.">
      <FlashMessages searchParams={params} />
      <form action={signUp} className="space-y-4">
        <div>
          <label htmlFor="company_name" className="label">Nom de votre entreprise</label>
          <input id="company_name" name="company_name" type="text" autoComplete="organization" required className="input" placeholder="Ex. Dupont Conseil" />
        </div>
        <div>
          <label htmlFor="email" className="label">Adresse email professionnelle</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label htmlFor="password" className="label">Mot de passe</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
          <p className="mt-1 text-xs text-slate-500">8 caractères minimum.</p>
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input type="checkbox" name="cgu" required className="mt-0.5" />
          J&apos;accepte les conditions générales d&apos;utilisation et la politique de confidentialité.
        </label>
        <SubmitButton className="btn-primary w-full" pendingText="Création du compte…">Commencer l&apos;essai gratuit</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-medium text-brand-600 hover:underline">Se connecter</Link>
      </p>
    </AuthCard>
  );
}
