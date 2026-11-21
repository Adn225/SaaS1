/**
 * Logique « pure » du scénario de relance : quelle étape envoyer aujourd'hui ?
 * Aucune dépendance (testée dans tests/schedule.test.ts).
 */

export type StepLike = { offset_days: number; kind: "reminder" | "formal_notice"; enabled: boolean };

/**
 * Choisit l'étape à envoyer pour une facture impayée.
 *
 * @param steps          étapes du scénario de l'utilisateur
 * @param daysFromDue    aujourd'hui - date d'échéance (négatif avant l'échéance)
 * @param sentOffsets    décalages des étapes déjà envoyées avec succès pour cette facture
 *
 * Règles :
 *  1. Une étape est « due » quand daysFromDue >= offset_days.
 *  2. Les étapes avant échéance (offset < 0) ne sont plus envoyées une fois l'échéance passée.
 *  3. On n'envoie que l'étape due la plus avancée : si une facture est saisie en retard,
 *     les étapes intermédiaires manquées sont ignorées (pas de rafale d'emails).
 *  4. On n'envoie jamais une étape antérieure ou égale à la dernière étape déjà envoyée.
 *  5. Une mise en demeure n'est jamais le premier contact : si aucune relance n'a encore été
 *     envoyée, on envoie à la place la relance la plus avancée disponible.
 */
export function pickStepToSend<S extends StepLike>(steps: S[], daysFromDue: number, sentOffsets: number[]): S | null {
  const due = steps
    .filter((s) => s.enabled && s.offset_days <= daysFromDue)
    .filter((s) => s.offset_days < 0 ? daysFromDue < 0 : true)
    .sort((a, b) => a.offset_days - b.offset_days);

  if (due.length === 0) return null;

  let candidate = due[due.length - 1];

  if (candidate.kind === "formal_notice" && sentOffsets.length === 0) {
    const fallback = due.filter((s) => s.kind === "reminder" && s.offset_days >= 0).pop();
    if (fallback) candidate = fallback;
  }

  const lastSent = sentOffsets.length ? Math.max(...sentOffsets) : -Infinity;
  if (candidate.offset_days <= lastSent) return null;

  return candidate;
}
