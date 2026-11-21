import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { addDays, todayInParis } from "@/lib/dates";
import { FlashMessages } from "@/components/Alert";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { createInvoiceAction } from "../actions";

export const metadata: Metadata = { title: "Nouvelle facture" };

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ erreur?: string; client?: string }> }) {
  const params = await searchParams;
  const { supabase } = await requireUser();
  const { data: clients } = await supabase.from("clients").select("id, name").order("name").returns<{ id: string; name: string }[]>();
  const today = todayInParis();

  return (
    <>
      <PageHeader title="Nouvelle facture" actions={<Link href="/factures" className="btn-secondary">Annuler</Link>} />
      <FlashMessages searchParams={params} />

      {!clients?.length ? (
        <div className="card p-6 text-sm text-slate-600">
          Ajoutez d&apos;abord un client avant de créer une facture.{" "}
          <Link href="/clients" className="font-medium text-brand-600 hover:underline">Ajouter un client</Link>
        </div>
      ) : (
        <form action={createInvoiceAction} className="card space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="number">Numéro de facture *</label>
              <input id="number" name="number" required className="input" placeholder="Ex. F-2026-042" />
            </div>
            <div>
              <label className="label" htmlFor="client_id">Client *</label>
              <select id="client_id" name="client_id" required className="input" defaultValue={params.client ?? ""}>
                <option value="" disabled>Choisir un client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="amount">Montant TTC (€) *</label>
              <input id="amount" name="amount" required inputMode="decimal" className="input" placeholder="1 250,00" />
            </div>
            <div>
              <label className="label" htmlFor="issue_date">Date de facture</label>
              <input id="issue_date" name="issue_date" type="date" defaultValue={today} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="due_date">Date d&apos;échéance *</label>
              <input id="due_date" name="due_date" type="date" required defaultValue={addDays(today, 30)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="pdf">Facture PDF (jointe aux relances)</label>
              <input id="pdf" name="pdf" type="file" accept="application/pdf" className="input file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1" />
            </div>
          </div>
          <SubmitButton>Enregistrer la facture</SubmitButton>
        </form>
      )}
    </>
  );
}
