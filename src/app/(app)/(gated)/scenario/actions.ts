"use server";
/** Actions serveur : modification du scénario de relance. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";

const enc = encodeURIComponent;

function readStep(formData: FormData) {
  return {
    offset_days: Number.parseInt(String(formData.get("offset_days") ?? ""), 10),
    kind: formData.get("kind") === "formal_notice" ? "formal_notice" : "reminder",
    label: String(formData.get("label") ?? "").trim(),
    subject: String(formData.get("subject") ?? "").trim(),
    body: String(formData.get("body") ?? "").replace(/\r\n/g, "\n").trim(),
    enabled: formData.get("enabled") === "on",
  };
}

function validate(s: ReturnType<typeof readStep>): string | null {
  if (!Number.isInteger(s.offset_days) || s.offset_days < -60 || s.offset_days > 365)
    return "Le décalage doit être un nombre de jours entre -60 et 365.";
  if (!s.label || !s.subject || !s.body) return "Le nom, l'objet et le message sont obligatoires.";
  return null;
}

function errorMessage(code?: string) {
  return code === "23505" ? "Une autre étape existe déjà à ce jour." : "Impossible d'enregistrer l'étape.";
}

export async function updateStepAction(id: string, formData: FormData) {
  const { supabase } = await requireUser();
  const step = readStep(formData);
  const invalid = validate(step);
  if (invalid) redirect(`/scenario?erreur=${enc(invalid)}#etape-${id}`);
  const { error } = await supabase.from("reminder_steps").update(step).eq("id", id);
  if (error) redirect(`/scenario?erreur=${enc(errorMessage(error.code))}`);
  revalidatePath("/scenario");
  redirect(`/scenario?succes=${enc(`Étape « ${step.label} » enregistrée.`)}`);
}

export async function createStepAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const step = readStep(formData);
  const invalid = validate(step);
  if (invalid) redirect(`/scenario?erreur=${enc(invalid)}`);
  const { error } = await supabase.from("reminder_steps").insert({ ...step, user_id: user.id });
  if (error) redirect(`/scenario?erreur=${enc(errorMessage(error.code))}`);
  revalidatePath("/scenario");
  redirect(`/scenario?succes=${enc("Étape ajoutée au scénario.")}`);
}

export async function deleteStepAction(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("reminder_steps").delete().eq("id", id);
  revalidatePath("/scenario");
  redirect(`/scenario?succes=${enc("Étape supprimée.")}`);
}
