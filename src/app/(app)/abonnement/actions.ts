"use server";
/** Abonnement Stripe : création de la session de paiement et accès au portail client. */
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Retourne le client Stripe de l'utilisateur, en le créant si besoin. */
async function getOrCreateCustomer(userId: string, email: string, name: string | null, existing: string | null) {
  if (existing) return existing;
  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { user_id: userId },
    preferred_locales: ["fr"],
  });
  // Les colonnes Stripe ne sont modifiables que par le service role (voir migration)
  await createAdminClient().from("profiles").update({ stripe_customer_id: customer.id }).eq("id", userId);
  return customer.id;
}

export async function startCheckoutAction() {
  const { user, profile } = await requireUser();
  const customer = await getOrCreateCustomer(user.id, profile.email, profile.company_name, profile.stripe_customer_id);

  // Les jours d'essai restants sont conservés : le premier prélèvement a lieu à la fin de l'essai.
  // (Stripe exige un trial_end au moins 48 h dans le futur.)
  const trialEnd = Math.floor(new Date(profile.trial_ends_at).getTime() / 1000);
  const keepTrial = trialEnd > Math.floor(Date.now() / 1000) + 48 * 3600;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    subscription_data: {
      metadata: { user_id: user.id },
      ...(keepTrial ? { trial_end: trialEnd } : {}),
    },
    locale: "fr",
    allow_promotion_codes: true,
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto", address: "auto" },
    success_url: `${appUrl()}/abonnement?succes=${encodeURIComponent("Merci ! Votre abonnement est activé.")}`,
    cancel_url: `${appUrl()}/abonnement`,
  });

  redirect(session.url!);
}

export async function openPortalAction() {
  const { profile } = await requireUser();
  if (!profile.stripe_customer_id) redirect("/abonnement");
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    locale: "fr",
    return_url: `${appUrl()}/abonnement`,
  });
  redirect(session.url);
}
