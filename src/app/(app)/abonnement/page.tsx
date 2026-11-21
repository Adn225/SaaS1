import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { hasAccess, isSubscribed, trialDaysLeft } from "@/lib/subscription";
import { Alert, FlashMessages } from "@/components/Alert";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { openPortalAction, startCheckoutAction } from "./actions";

export const metadata: Metadata = { title: "Abonnement" };

const STATUS_LABELS: Record<string, string> = {
  trialing: "Période d'essai",
  active: "Actif",
  past_due: "Paiement en échec",
  unpaid: "Impayé",
  canceled: "Résilié",
  incomplete: "Paiement incomplet",
  incomplete_expired: "Expiré",
  paused: "En pause",
};

const FEATURES = [
  "Factures et clients illimités",
  "Relances automatiques J-3, J+3, J+10",
  "Mise en demeure PDF générée à J+20",
  "Scénario et modèles d'emails personnalisables",
  "Import CSV et historique complet",
];

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; succes?: string; expire?: string }>;
}) {
  const params = await searchParams;
  const { profile } = await requireUser();
  const subscribed = isSubscribed(profile);
  const daysLeft = trialDaysLeft(profile);

  return (
    <>
      <PageHeader title="Abonnement" />
      <FlashMessages searchParams={params} />
      {params.expire && !hasAccess(profile) && (
        <Alert type="error">Votre essai gratuit est terminé. Abonnez-vous pour retrouver l&apos;accès et relancer vos factures.</Alert>
      )}

      <div className="card max-w-xl p-8">
        <p className="text-sm font-medium text-brand-600">Relancia Pro</p>
        <p className="mt-2 text-4xl font-bold text-slate-900">19 €<span className="text-lg font-medium text-slate-500"> / mois</span></p>
        <p className="mt-1 text-sm text-slate-500">Sans engagement, résiliable à tout moment.</p>

        <ul className="mt-6 space-y-2 text-sm text-slate-700">
          {FEATURES.map((f) => <li key={f}>✓ {f}</li>)}
        </ul>

        <div className="mt-8 rounded-md bg-slate-50 p-4 text-sm">
          {subscribed ? (
            <>
              <p>Statut : <strong>{STATUS_LABELS[profile.subscription_status!] ?? profile.subscription_status}</strong></p>
              {profile.current_period_end && (
                <p className="mt-1 text-slate-600">Prochaine échéance : {formatDate(profile.current_period_end)}</p>
              )}
            </>
          ) : profile.subscription_status && STATUS_LABELS[profile.subscription_status] ? (
            <p>Statut : <strong>{STATUS_LABELS[profile.subscription_status]}</strong></p>
          ) : daysLeft > 0 ? (
            <p>Essai gratuit : <strong>{daysLeft} jour{daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""}</strong>. En vous abonnant maintenant, vous ne serez prélevé qu&apos;à la fin de l&apos;essai.</p>
          ) : (
            <p>Votre essai gratuit est terminé.</p>
          )}
        </div>

        <div className="mt-6">
          {subscribed || profile.stripe_customer_id ? (
            <div className="flex flex-wrap gap-3">
              {!subscribed && (
                <form action={startCheckoutAction}>
                  <SubmitButton pendingText="Redirection…">S&apos;abonner</SubmitButton>
                </form>
              )}
              <form action={openPortalAction}>
                <SubmitButton className="btn-secondary" pendingText="Redirection…">Gérer mon abonnement et mes factures</SubmitButton>
              </form>
            </div>
          ) : (
            <form action={startCheckoutAction}>
              <SubmitButton className="btn-primary w-full" pendingText="Redirection vers le paiement…">S&apos;abonner</SubmitButton>
            </form>
          )}
          <p className="mt-3 text-xs text-slate-500">Paiement sécurisé par Stripe.</p>
        </div>
      </div>
    </>
  );
}
