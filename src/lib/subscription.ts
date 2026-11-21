import type { Profile } from "./types";

/** Statuts Stripe qui donnent accès à l'application. */
const ACTIVE_STATUSES = ["active", "trialing"];

/**
 * Un utilisateur a accès à Relancia s'il est encore dans ses 14 jours d'essai
 * (gérés côté application, sans carte bancaire) ou s'il a un abonnement Stripe actif.
 */
export function hasAccess(profile: Pick<Profile, "trial_ends_at" | "subscription_status">, now = new Date()): boolean {
  if (profile.subscription_status && ACTIVE_STATUSES.includes(profile.subscription_status)) return true;
  return new Date(profile.trial_ends_at) > now;
}

/** Nombre de jours d'essai restants (0 si terminé). */
export function trialDaysLeft(profile: Pick<Profile, "trial_ends_at">, now = new Date()): number {
  const ms = new Date(profile.trial_ends_at).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function isSubscribed(profile: Pick<Profile, "subscription_status">): boolean {
  return !!profile.subscription_status && ACTIVE_STATUSES.includes(profile.subscription_status);
}
