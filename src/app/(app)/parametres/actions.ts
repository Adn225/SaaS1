"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";

/** Enregistre les informations de l'entreprise (utilisées dans les emails et la mise en demeure). */
export async function updateProfileAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const field = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const { error } = await supabase
    .from("profiles")
    .update({
      company_name: field("company_name"),
      siret: field("siret"),
      address: field("address"),
      signature: field("signature"),
      late_penalty_rate: field("late_penalty_rate") ?? "trois fois le taux d'intérêt légal",
    })
    .eq("id", user.id);
  const msg = error ? "erreur=" + encodeURIComponent("Impossible d'enregistrer.") : "succes=" + encodeURIComponent("Paramètres enregistrés.");
  revalidatePath("/", "layout");
  redirect(`/parametres?${msg}`);
}
