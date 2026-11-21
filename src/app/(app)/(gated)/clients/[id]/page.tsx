import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { FlashMessages } from "@/components/Alert";
import { PageHeader } from "@/components/PageHeader";
import { ClientFields } from "@/components/ClientFields";
import { SubmitButton } from "@/components/SubmitButton";
import type { Client } from "@/lib/types";
import { deleteClientAction, updateClientAction } from "../actions";

export default async function EditClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string; succes?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const { supabase } = await requireUser();
  const { data: client } = await supabase.from("clients").select("*").eq("id", id).maybeSingle<Client>();
  if (!client) notFound();

  return (
    <>
      <PageHeader title={client.name} description="Modifier les coordonnées du client." actions={<Link href="/clients" className="btn-secondary">Retour</Link>} />
      <FlashMessages searchParams={flash} />
      <form action={updateClientAction.bind(null, id)} className="card space-y-4 p-6">
        <ClientFields client={client} />
        <SubmitButton>Enregistrer</SubmitButton>
      </form>
      <form action={deleteClientAction.bind(null, id)} className="mt-6">
        <SubmitButton className="btn-danger" pendingText="Suppression…" confirm="Supprimer définitivement ce client ?">
          Supprimer le client
        </SubmitButton>
      </form>
    </>
  );
}
