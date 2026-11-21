import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { firstDayOfMonthInParis, parisMidnightIso, todayInParis } from "@/lib/dates";
import { formatDate, formatDateTime, formatEuro } from "@/lib/format";
import { FlashMessages } from "@/components/Alert";
import { PageHeader } from "@/components/PageHeader";
import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import type { Invoice, ReminderLog } from "@/lib/types";

export const metadata: Metadata = { title: "Tableau de bord" };

type Row = Pick<Invoice, "id" | "number" | "amount" | "due_date" | "status" | "paid_at"> & { client: { name: string } | null };

function StatCard({ label, value, hint, tone = "slate" }: { label: string; value: string; hint?: string; tone?: "slate" | "red" | "green" }) {
  const color = { slate: "text-slate-900", red: "text-red-600", green: "text-emerald-600" }[tone];
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ erreur?: string; succes?: string }> }) {
  const params = await searchParams;
  const { supabase } = await requireUser();
  const today = todayInParis();
  const monthStart = firstDayOfMonthInParis();

  const [{ data: unpaid }, { data: paidThisMonth }, { data: logs }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, number, amount, due_date, status, paid_at, client:clients(name)")
      .eq("status", "unpaid")
      .order("due_date")
      .returns<Row[]>(),
    supabase
      .from("invoices")
      .select("id, amount")
      .eq("status", "paid")
      .gte("paid_at", parisMidnightIso(monthStart))
      .returns<{ id: string; amount: number }[]>(),
    supabase
      .from("reminder_logs")
      .select("*, invoice:invoices(number)")
      .order("sent_at", { ascending: false })
      .limit(6)
      .returns<(ReminderLog & { invoice: { number: string } | null })[]>(),
  ]);

  const sum = (rows: { amount: number }[] | null) => (rows ?? []).reduce((t, r) => t + Number(r.amount), 0);
  const overdue = (unpaid ?? []).filter((i) => i.due_date < today);

  return (
    <>
      <FlashMessages searchParams={params} />
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de vos encaissements."
        actions={
          <>
            <Link href="/factures/import" className="btn-secondary">Importer un CSV</Link>
            <Link href="/factures/nouvelle" className="btn-primary">Nouvelle facture</Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total impayé" value={formatEuro(sum(unpaid))} hint={`${unpaid?.length ?? 0} facture(s) en attente`} />
        <StatCard label="Factures en retard" value={String(overdue.length)} hint={formatEuro(sum(overdue))} tone="red" />
        <StatCard label="Payées ce mois-ci" value={formatEuro(sum(paidThisMonth))} hint={`${paidThisMonth?.length ?? 0} facture(s)`} tone="green" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section className="card lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Factures en retard</h2>
            <Link href="/factures?filtre=retard" className="text-sm text-brand-600 hover:underline">Tout voir</Link>
          </div>
          {overdue.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Aucune facture en retard. Bravo !</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {overdue.slice(0, 6).map((inv) => (
                <li key={inv.id}>
                  <Link href={`/factures/${inv.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{inv.number} · {inv.client?.name}</p>
                      <p className="text-xs text-slate-500">Échéance le {formatDate(inv.due_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatEuro(Number(inv.amount))}</p>
                      <InvoiceStatusBadge invoice={inv} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card lg:col-span-2">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Dernières relances envoyées</h2>
          </div>
          {!logs?.length ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Aucune relance pour le moment.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {logs.map((log) => (
                <li key={log.id} className="px-5 py-3">
                  <Link href={`/factures/${log.invoice_id}`} className="text-sm font-medium text-slate-900 hover:underline">
                    {log.label} · {log.invoice?.number}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(log.sent_at)} · {log.status === "sent" ? "Envoyée" : "Échec d'envoi"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
