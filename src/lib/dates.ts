/**
 * Utilitaires de dates. Toutes les dates « métier » (échéances) sont des chaînes
 * AAAA-MM-JJ, interprétées dans le fuseau Europe/Paris pour éviter les décalages
 * d'un jour selon l'heure d'exécution du serveur (UTC sur Vercel).
 */

/** Date du jour à Paris au format AAAA-MM-JJ. */
export function todayInParis(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Nombre de jours entre deux dates AAAA-MM-JJ (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Ajoute n jours à une date AAAA-MM-JJ. */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Premier jour du mois courant (Paris), AAAA-MM-01. */
export function firstDayOfMonthInParis(now: Date = new Date()): string {
  return `${todayInParis(now).slice(0, 7)}-01`;
}

/** Vérifie qu'une chaîne est une date AAAA-MM-JJ valide. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Minuit (heure de Paris) d'une date AAAA-MM-JJ, en ISO avec décalage (gère l'heure d'été). */
export function parisMidnightIso(date: string): string {
  const probe = new Date(`${date}T12:00:00Z`);
  const tz =
    new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", timeZoneName: "longOffset" })
      .formatToParts(probe)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT+01:00";
  return `${date}T00:00:00${tz.replace("GMT", "") || "+00:00"}`;
}
