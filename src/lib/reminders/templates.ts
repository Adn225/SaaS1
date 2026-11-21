/**
 * Modèles d'emails : remplacement des variables {{...}} et mise en forme HTML.
 * Fichier « pur » (sans dépendance serveur) pour pouvoir être testé et utilisé
 * dans l'aperçu de la page Scénario.
 */
import { formatDate, formatEuro } from "../format.ts";

/** Variables disponibles dans l'objet et le corps des emails. */
export const TEMPLATE_VARIABLES = [
  { key: "client_nom", description: "Nom du client" },
  { key: "numero_facture", description: "Numéro de la facture" },
  { key: "montant", description: "Montant TTC (ex. 1 250,00 €)" },
  { key: "date_echeance", description: "Date d'échéance (JJ/MM/AAAA)" },
  { key: "jours_retard", description: "Nombre de jours de retard" },
  { key: "entreprise", description: "Votre raison sociale" },
  { key: "signature", description: "Votre signature" },
  { key: "taux_penalites", description: "Taux des pénalités de retard (Paramètres)" },
] as const;

export type TemplateContext = {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string; // AAAA-MM-JJ
  daysLate: number;
  companyName: string;
  signature: string;
  penaltyRate: string;
};

/** Construit le dictionnaire des variables à partir du contexte. */
export function buildVariables(ctx: TemplateContext): Record<string, string> {
  return {
    client_nom: ctx.clientName,
    numero_facture: ctx.invoiceNumber,
    montant: formatEuro(ctx.amount),
    date_echeance: formatDate(ctx.dueDate),
    jours_retard: String(Math.max(0, ctx.daysLate)),
    entreprise: ctx.companyName,
    signature: ctx.signature,
    taux_penalites: ctx.penaltyRate,
  };
}

/** Remplace {{variable}} par sa valeur ; les variables inconnues sont laissées telles quelles. */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => vars[key] ?? match);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Transforme le texte de l'email en HTML sobre (paragraphes + récapitulatif de la facture). */
export function toEmailHtml(body: string, ctx: TemplateContext): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:15px;line-height:1.55">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:28px">
    ${paragraphs}
    <table style="width:100%;border-collapse:collapse;margin-top:18px;font-size:14px;background:#f9fafb;border-radius:6px">
      <tr><td style="padding:8px 12px;color:#6b7280">Facture</td><td style="padding:8px 12px;text-align:right"><strong>${escapeHtml(ctx.invoiceNumber)}</strong></td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280">Montant TTC</td><td style="padding:8px 12px;text-align:right"><strong>${escapeHtml(formatEuro(ctx.amount))}</strong></td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280">Échéance</td><td style="padding:8px 12px;text-align:right">${escapeHtml(formatDate(ctx.dueDate))}</td></tr>
    </table>
  </div>
  <p style="max-width:600px;margin:12px auto 0;font-size:12px;color:#9ca3af;text-align:center">
    Message envoyé pour le compte de ${escapeHtml(ctx.companyName)}. Pour toute question, répondez simplement à cet email.
  </p>
</body></html>`;
}
