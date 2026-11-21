import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { addDays, todayInParis } from "@/lib/dates";
import { formatDate, formatDateTime, formatEuro, formatOffset } from "@/lib/format";
import { FlashMessages } from "@/components/Alert";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import type { Client, Invoice, ReminderLog, ReminderStep } from "@/lib/types";
import {
  attachPdfAction,
  deleteInvoiceAction,
  markPaidAction,
  markUnpaidAction,
  togglePauseAction,
} from "../actions";

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string; succes?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const { supabase } = await requireUser();

  const [{ data: invoice }, { data: logs }, { data: steps }] = await Promise.all([
    supabase.from("invoices").select("*, client:clients(*)").eq("id", id).maybeSingle<Invoice & { client: Client }>(),
    supabase.from("reminder_logs").select("*").eq("invoice_id", id).order("sent_at", { ascending: false }).returns<ReminderLog[]>(),
    supabase.from("reminder_steps").select("*").eq("enabled", true).order("offset_days").returns<ReminderStep[]>(),
  ]);
  if (!invoice) notFound();

  const today = todayInParis();
  const sentOffsets = new Set((logs ?? []).filter((l) => l.status === "sent").map((l) => l.offset_days));
  const lastSent = Math.max(-Infinity, ...sentOffsets);
  const isUnpaid = invoice.status === "unpaid";

  return (
    <>
      <PageHeader
        title={`Facture ${invoice.number}`}
        description={`${invoice.client.name} · ${invoice.client.email}`}
        actions={<Link href="/factures" className="btn-secondary">Retour</Link>}
      />
      <FlashMessages searchParams={flash} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informations et actions */}
        <section className="card p-6 lg:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-semibold text-slate-900">{formatEuro(Number(invoice.amount))}</p>
            <InvoiceStatusBadge invoice={invoice} />
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Date de facture</dt><dd>{formatDate(invoice.issue_date)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Échéance</dt><dd>{formatDate(invoice.due_date)}</dd></div>
            {invoice.paid_at && (
              <div className="flex justify-between"><dt className="text-slate-500">Payée le</dt><dd>{formatDateTime(invoice.paid_at)}</dd></div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">PDF</dt>
              <dd>
                {invoice.pdf_path ? (
                  <a href={`/api/factures/${invoice.id}/pdf`} target="_blank" className="text-brand-600 hover:underline">Télécharger</a>
                ) : (
                  "Aucun"
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-6 space-y-3">
            {isUnpaid ? (
              <form action={markPaidAction.bind(null, invoice.id)}>
                <SubmitButton className="btn-success w-full" pendingText="…">✓ Marquer comme payée</SubmitButton>
              </form>
            ) : (
              <form action={markUnpaidAction.bind(null, invoice.id)}>
                <SubmitButton className="btn-secondary w-full" pendingText="…">Repasser en impayée</SubmitButton>
              </form>
            )}
            {isUnpaid && (
              <form action={togglePauseAction.bind(null, invoice.id, !invoice.reminders_paused)}>
                <SubmitButton className="btn-secondary w-full" pendingText="…">
                  {invoice.reminders_paused ? "Réactiver les relances" : "Mettre les relances en pause"}
                </SubmitButton>
              </form>
            )}
            <a href={`/api/factures/${invoice.id}/mise-en-demeure`} target="_blank" className="btn-secondary w-full">
              Aperçu de la mise en demeure (PDF)
            </a>
          </div>

          <form action={attachPdfAction.bind(null, invoice.id)} className="mt-6 space-y-2 border-t border-slate-200 pt-4">
            <label className="label" htmlFor="pdf">{invoice.pdf_path ? "Remplacer le PDF" : "Joindre le PDF de la facture"}</label>
            <input id="pdf" name="pdf" type="file" accept="application/pdf" required className="input text-xs" />
            <SubmitButton className="btn-secondary w-full" pendingText="Envoi…">Envoyer le PDF</SubmitButton>
          </form>

          <form action={deleteInvoiceAction.bind(null, invoice.id)} className="mt-6 border-t border-slate-200 pt-4">
            <SubmitButton className="btn-danger w-full" pendingText="…" confirm="Supprimer cette facture et son historique ?">
              Supprimer la facture
            </SubmitButton>
          </form>
        </section>

        <div className="space-y-6 lg:col-span-2">
          {/* Calendrier prévisionnel du scénario */}
          <section className="card">
            <h2 className="border-b border-slate-200 px-5 py-4 font-semibold text-slate-900">Scénario de relance</h2>
            <ol className="divide-y divide-slate-100">
              {steps?.map((step) => {
                const date = addDays(invoice.due_date, step.offset_days);
                let state: { text: string; cls: string };
                if (sentOffsets.has(step.offset_days)) state = { text: "Envoyée", cls: "text-emerald-700" };
                else if (!isUnpaid) state = { text: "Annulée (payée)", cls: "text-slate-400" };
                else if (invoice.reminders_paused) state = { text: "En pause", cls: "text-amber-700" };
                else if (date >= today && step.offset_days > lastSent) state = { text: "Prévue", cls: "text-brand-700" };
                else state = { text: "Ignorée", cls: "text-slate-400" };
                return (
                  <li key={step.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <span className="mr-2 inline-block w-12 font-semibold text-slate-900">{formatOffset(step.offset_days)}</span>
                      {step.label}
                      {step.kind === "formal_notice" && <span className="ml-2 text-xs text-slate-500">(PDF joint)</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500">{formatDate(date)}</span>
                      <span className={`ml-3 font-medium ${state.cls}`}>{state.text}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              Les relances partent chaque matin. Si une facture est saisie après une étape, seule l&apos;étape la plus récente
              est envoyée.
            </p>
          </section>

          {/* Historique */}
          <section className="card">
            <h2 className="border-b border-slate-200 px-5 py-4 font-semibold text-slate-900">Historique des relances</h2>
            {!logs?.length ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">Aucune relance envoyée pour cette facture.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <li key={log.id} className="px-5 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900">{formatOffset(log.offset_days)} · {log.label}</p>
                      <span className={log.status === "sent" ? "text-emerald-700" : "text-red-700"}>
                        {log.status === "sent" ? "Envoyée" : "Échec"}
                      </span>
                    </div>
                    <p className="text-slate-600">« {log.subject} »</p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(log.sent_at)} · à {log.email_to}
                      {log.error && ` · ${log.error}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
