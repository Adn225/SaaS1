import "server-only";
import Stripe from "stripe";

/** Client Stripe (clé secrète, côté serveur uniquement). */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  appInfo: { name: "Relancia" },
});
