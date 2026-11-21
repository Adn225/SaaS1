"use server";
/** Actions serveur : création, modification et suppression de clients. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";

const enc = encodeURIComponent;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readClient(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
  };
}

function validate(c: ReturnType<typeof readClient>): string | null {
  if (!c.name) return "Le nom du client est obligatoire.";
  if (!EMAIL_RE.test(c.email)) return "L'adresse email du client est invalide.";
  return null;
}

export async function createClientAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const client = readClient(formData);
  const invalid = validate(client);
  if (invalid) redirect(`/clients?erreur=${enc(invalid)}`);

  const { error } = await supabase.from("clients").insert({ ...client, user_id: user.id });
  if (error) {
    const msg = error.code === "23505" ? "Un client avec cette adresse email existe déjà." : "Impossible d'ajouter le client.";
    redirect(`/clients?erreur=${enc(msg)}`);
  }
  revalidatePath("/clients");
  redirect(`/clients?succes=${enc(`Client « ${client.name} » ajouté.`)}`);
}

export async function updateClientAction(id: string, formData: FormData) {
  const { supabase } = await requireUser();
  const client = readClient(formData);
  const invalid = validate(client);
  if (invalid) redirect(`/clients/${id}?erreur=${enc(invalid)}`);

  const { error } = await supabase.from("clients").update(client).eq("id", id);
  if (error) redirect(`/clients/${id}?erreur=${enc("Impossible d'enregistrer les modifications.")}`);
  revalidatePath("/clients");
  redirect(`/clients?succes=${enc("Client mis à jour.")}`);
}

export async function deleteClientAction(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) {
    const msg =
      error.code === "23503"
        ? "Ce client a des factures : supprimez-les d'abord."
        : "Impossible de supprimer le client.";
    redirect(`/clients/${id}?erreur=${enc(msg)}`);
  }
  revalidatePath("/clients");
  redirect(`/clients?succes=${enc("Client supprimé.")}`);
}
