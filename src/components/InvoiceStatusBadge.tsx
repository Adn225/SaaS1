import { daysBetween, todayInParis } from "@/lib/dates";
import type { Invoice } from "@/lib/types";

/** Statut affiché d'une facture : payée, à venir ou en retard (avec nombre de jours). */
export function invoiceDisplayStatus(invoice: Pick<Invoice, "status" | "due_date">, today = todayInParis()) {
  if (invoice.status === "paid") return { label: "Payée", tone: "green" as const };
  const late = daysBetween(invoice.due_date, today);
  if (late > 0) return { label: `En retard · ${late} j`, tone: "red" as const };
  if (late === 0) return { label: "Échéance aujourd'hui", tone: "amber" as const };
  return { label: "À venir", tone: "slate" as const };
}

export function InvoiceStatusBadge({ invoice }: { invoice: Pick<Invoice, "status" | "due_date"> }) {
  const { label, tone } = invoiceDisplayStatus(invoice);
  const styles = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  }[tone];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${styles}`}>{label}</span>;
}
