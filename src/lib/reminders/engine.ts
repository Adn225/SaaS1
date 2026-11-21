import "server-only";
/**
 * Moteur de relance exécuté chaque jour par la tâche planifiée (/api/cron/relances).
 *
 * Pour chaque utilisateur ayant accès (essai ou abonnement actif) :
 *   1. charge ses factures impayées (non mises en pause) et son scénario ;
 *   2. détermine l'étape à envoyer aujourd'hui (voir schedule.ts) ;
 *   3. envoie l'email via Resend (PDF de la facture + mise en demeure en pièces jointes) ;
 *   4. enregistre le résultat dans l'historique (reminder_logs).
 *
 * Le moteur est idempotent : relancé plusieurs fois le même jour, il n'envoie
 * jamais deux fois la même étape (index unique sur reminder_logs).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { resend } from "@/lib/resend";
import { daysBetween, todayInParis } from "@/lib/dates";
import { hasAccess } from "@/lib/subscription";
import type { Client, Invoice, Profile, ReminderStep } from "@/lib/types";
import { pickStepToSend } from "./schedule";
import { buildVariables, renderTemplate, toEmailHtml, type TemplateContext } from "./templates";
import { generateFormalNoticePdf } from "@/lib/pdf/mise-en-demeure";

type InvoiceWithClient = Invoice & { client: Client };

export type RunSummary = { users: number; invoices: number; sent: number; failed: number; errors: string[] };

/** Nom d'expéditeur affiché : la raison sociale de l'utilisateur. */
function senderName(profile: Profile) {
  return (profile.company_name || "Service comptabilité").replace(/[<>"]/g, "");
}

export function contextFor(profile: Profile, invoice: InvoiceWithClient, today: string): TemplateContext {
  return {
    clientName: invoice.client.name,
    invoiceNumber: invoice.number,
    amount: Number(invoice.amount),
    dueDate: invoice.due_date,
    daysLate: daysBetween(invoice.due_date, today),
    companyName: profile.company_name || profile.email,
    signature: profile.signature || profile.company_name || profile.email,
    penaltyRate: profile.late_penalty_rate,
  };
}

/** Construit les données de la mise en demeure (réutilisé par la route de téléchargement). */
export function formalNoticeData(profile: Profile, invoice: InvoiceWithClient, today: string) {
  return {
    sender: {
      companyName: profile.company_name || profile.email,
      address: profile.address,
      siret: profile.siret,
      email: profile.email,
      signature: profile.signature || profile.company_name || profile.email,
    },
    recipient: { name: invoice.client.name, address: invoice.client.address, email: invoice.client.email },
    invoice: {
      number: invoice.number,
      amount: Number(invoice.amount),
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
    },
    penaltyRate: profile.late_penalty_rate,
    date: today,
  };
}

/** Envoie une étape de relance pour une facture et enregistre le résultat. */
export async function sendReminder(
  db: SupabaseClient,
  profile: Profile,
  invoice: InvoiceWithClient,
  step: ReminderStep,
  today: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = contextFor(profile, invoice, today);
  const vars = buildVariables(ctx);
  const subject = renderTemplate(step.subject, vars);
  const text = renderTemplate(step.body, vars);

  const attachments: { filename: string; content: Buffer }[] = [];
  try {
    // PDF de la facture, s'il a été joint
    if (invoice.pdf_path) {
      const { data } = await db.storage.from("invoices").download(invoice.pdf_path);
      if (data) {
        attachments.push({ filename: `Facture-${invoice.number}.pdf`, content: Buffer.from(await data.arrayBuffer()) });
      }
    }
    // Mise en demeure générée à la volée
    if (step.kind === "formal_notice") {
      const pdf = await generateFormalNoticePdf(formalNoticeData(profile, invoice, today));
      attachments.push({ filename: `Mise-en-demeure-${invoice.number}.pdf`, content: Buffer.from(pdf) });
    }
  } catch (e) {
    console.error("Pièces jointes", invoice.id, e);
  }

  let status: "sent" | "failed" = "sent";
  let error: string | null = null;
  let providerId: string | null = null;

  const { data, error: sendError } = await resend.emails.send({
    from: `${senderName(profile)} <${process.env.RESEND_FROM_EMAIL}>`,
    to: invoice.client.email,
    replyTo: profile.email, // les réponses du client arrivent directement chez l'utilisateur
    subject,
    text,
    html: toEmailHtml(text, ctx),
    attachments,
  });
  if (sendError) {
    status = "failed";
    error = sendError.message;
  } else {
    providerId = data?.id ?? null;
  }

  const { error: logError } = await db.from("reminder_logs").insert({
    user_id: profile.id,
    invoice_id: invoice.id,
    step_id: step.id,
    offset_days: step.offset_days,
    kind: step.kind,
    label: step.label,
    email_to: invoice.client.email,
    subject,
    status,
    error,
    provider_id: providerId,
  });
  if (logError) console.error("Historique", invoice.id, logError.message);

  return status === "sent" ? { ok: true } : { ok: false, error: error ?? undefined };
}

/** Point d'entrée de la tâche planifiée quotidienne. */
export async function runDailyReminders(db: SupabaseClient, now = new Date()): Promise<RunSummary> {
  const today = todayInParis(now);
  const summary: RunSummary = { users: 0, invoices: 0, sent: 0, failed: 0, errors: [] };

  const { data: profiles, error } = await db.from("profiles").select("*").returns<Profile[]>();
  if (error) throw new Error(error.message);

  for (const profile of profiles ?? []) {
    if (!hasAccess(profile, now)) continue;
    summary.users++;

    const [{ data: steps }, { data: invoices }] = await Promise.all([
      db.from("reminder_steps").select("*").eq("user_id", profile.id).returns<ReminderStep[]>(),
      db
        .from("invoices")
        .select("*, client:clients(*)")
        .eq("user_id", profile.id)
        .eq("status", "unpaid")
        .eq("reminders_paused", false)
        .returns<InvoiceWithClient[]>(),
    ]);
    if (!steps?.length || !invoices?.length) continue;

    const { data: logs } = await db
      .from("reminder_logs")
      .select("invoice_id, offset_days")
      .eq("status", "sent")
      .in("invoice_id", invoices.map((i) => i.id))
      .returns<{ invoice_id: string; offset_days: number }[]>();

    for (const invoice of invoices) {
      const sentOffsets = (logs ?? []).filter((l) => l.invoice_id === invoice.id).map((l) => l.offset_days);
      const step = pickStepToSend(steps, daysBetween(invoice.due_date, today), sentOffsets);
      if (!step) continue;

      summary.invoices++;
      const result = await sendReminder(db, profile, invoice, step, today);
      if (result.ok) summary.sent++;
      else {
        summary.failed++;
        summary.errors.push(`${invoice.number}: ${result.error}`);
      }
    }
  }

  return summary;
}
