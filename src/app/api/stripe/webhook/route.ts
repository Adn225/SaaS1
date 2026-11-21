/**
 * Webhook Stripe : synchronise le statut de l'abonnement dans la table profiles.
 * Événements à activer dans Stripe : checkout.session.completed,
 * customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
 */
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  // Selon la version de l'API Stripe, la fin de période est portée par l'abonnement ou par ses lignes.
  const periodEnd =
    subscription.items.data[0]?.current_period_end ??
    (subscription as unknown as { current_period_end?: number }).current_period_end;

  const update = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  };

  const db = createAdminClient();
  const userId = subscription.metadata?.user_id;
  const { error } = userId
    ? await db.from("profiles").update(update).eq("id", userId)
    : await db.from("profiles").update(update).eq("stripe_customer_id", customerId);
  if (error) throw new Error(error.message);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signature manquante" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e) {
    return NextResponse.json({ error: `Signature invalide : ${(e as Error).message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await syncSubscription(await stripe.subscriptions.retrieve(id));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;
    }
  } catch (e) {
    console.error("Webhook Stripe", event.type, e);
    return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 }); // Stripe réessaiera
  }

  return NextResponse.json({ received: true });
}
