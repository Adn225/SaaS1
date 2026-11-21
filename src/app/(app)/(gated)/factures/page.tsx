import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { todayInParis } from "@/lib/dates";
import { formatDate, formatEuro } from "@/lib/format";
import { FlashMessages } from "@/components/Alert";
import { PageHeader } from "@/components/PageHeader";
import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import type { Invoice } from "@/lib/types";

export const metadata: Metadata = { title: "Factures" };

const FILTERS = [
  { key: "toutes", label: "Toutes" },
  { key: "impayees", label: "Impayées" },
  { key: "retard", label: "En retard" },
  { key: "payees", label: "Payées" },
];

type Row = Invoice & { client: { name: string } | null };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string; erreur?: string; succes?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filtre ?? "impayees";
  const { supabase } = await requireUser();
  const today = todayInParis();

  let query = supabase.from("invoices").select("*, client:clients(name)").order("due_date", { ascending: filter !== "payees" });
  if (filter === "impayees") query = query.eq("status", "unpaid");
  if (filter === "retard") query = query.eq("status", "unpaid").lt("due_date", today);
  if (filter === "payees") query = query.eq("status", "paid");
  const { data: invoices } = await query.returns<Row[]>();

  return (
    <>
      <PageHeader
        title="Factures"
        actions={
          <>
            <Link href="/factures/import" className="btn-secondary">Importer un CSV</Link>
            <Link href="/factures/nouvelle" className="btn-primary">Nouvelle facture</Link>
          </>
        }
      />
      <FlashMessages searchParams={params} />

      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/factures?filtre=${f.key}`}
            className={`rounded-full px-3 py-1 text-sm ${filter === f.key ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="table-th">N°</th>
              <th className="table-th">Client</th>
              <th className="table-th text-right">Montant</th>
              <th className="table-th">Échéance</th>
              <th className="table-th">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!invoices?.length && (
              <tr><td colSpan={5} className="table-td py-10 text-center text-slate-500">Aucune facture dans cette vue.</td></tr>
            )}
            {invoices?.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="table-td font-medium">
                  <Link href={`/factures/${inv.id}`} className="text-brand-600 hover:underline">{inv.number}</Link>
                  {inv.reminders_paused && inv.status === "unpaid" && <span className="ml-2 text-xs text-slate-400">(relances en pause)</span>}
                </td>
                <td className="table-td">{inv.client?.name}</td>
                <td className="table-td text-right font-medium">{formatEuro(Number(inv.amount))}</td>
                <td className="table-td">{formatDate(inv.due_date)}</td>
                <td className="table-td"><InvoiceStatusBadge invoice={inv} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
