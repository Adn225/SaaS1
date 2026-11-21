import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FlashMessages } from "@/components/Alert";
import { PageHeader } from "@/components/PageHeader";
import { ClientFields } from "@/components/ClientFields";
import { SubmitButton } from "@/components/SubmitButton";
import { formatEuro } from "@/lib/format";
import type { Client } from "@/lib/types";
import { createClientAction } from "./actions";

export const metadata: Metadata = { title: "Clients" };

type Row = Client & { invoices: { amount: number; status: string }[] };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ erreur?: string; succes?: string }> }) {
  const params = await searchParams;
  const { supabase } = await requireUser();
  const { data: clients } = await supabase
    .from("clients")
    .select("*, invoices(amount, status)")
    .order("name")
    .returns<Row[]>();

  return (
    <>
      <PageHeader title="Clients" description="Les destinataires de vos relances." />
      <FlashMessages searchParams={params} />

      <details className="card mb-6 p-5" open={!clients?.length}>
        <summary className="cursor-pointer font-medium text-slate-900">+ Ajouter un client</summary>
        <form action={createClientAction} className="mt-4 space-y-4">
          <ClientFields />
          <SubmitButton>Ajouter le client</SubmitButton>
        </form>
      </details>

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="table-th">Nom</th>
              <th className="table-th">Email</th>
              <th className="table-th">Téléphone</th>
              <th className="table-th text-right">Impayé</th>
              <th className="table-th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!clients?.length && (
              <tr><td colSpan={5} className="table-td py-10 text-center text-slate-500">Aucun client pour le moment.</td></tr>
            )}
            {clients?.map((c) => {
              const unpaid = c.invoices.filter((i) => i.status === "unpaid").reduce((t, i) => t + Number(i.amount), 0);
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="table-td font-medium text-slate-900">{c.name}</td>
                  <td className="table-td">{c.email}</td>
                  <td className="table-td">{c.phone ?? "—"}</td>
                  <td className="table-td text-right">{unpaid ? formatEuro(unpaid) : "—"}</td>
                  <td className="table-td text-right">
                    <Link href={`/clients/${c.id}`} className="text-brand-600 hover:underline">Modifier</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
