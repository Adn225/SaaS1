/** Formatage à la française (montants, dates, libellés d'étapes). */

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function formatEuro(amount: number): string {
  return eur.format(amount);
}

/** 2026-11-19 -> 19/11/2026 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Date + heure (pour l'historique), dans le fuseau de Paris. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** -3 -> « J-3 », 10 -> « J+10 », 0 -> « Jour J » */
export function formatOffset(offset: number): string {
  if (offset === 0) return "Jour J";
  return offset > 0 ? `J+${offset}` : `J${offset}`;
}

/**
 * Les polices standard des PDF (WinAnsi) ne gèrent pas les espaces insécables
 * fines utilisées par Intl en français : on les remplace par des espaces simples.
 */
export function pdfSafe(text: string): string {
  return text.replace(/[  ]/g, " ").replace(/[’]/g, "'");
}
