"use server";
/** Actions serveur sur les factures : création, import CSV, paiement, suppression. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { isIsoDate } from "@/lib/dates";
import { parseAmount, parseInvoicesCsv } from "@/lib/csv";

const enc = encodeURIComponent;
const MAX_PDF_SIZE = 5 * 1024 * 1024;

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

/** Envoie le PDF dans le bucket privé « invoices » (dossier = id utilisateur). */
async function uploadPdf(supabase: Supabase, userId: string, invoiceId: string, file: File): Promise<string | null> {
  const path = `${userId}/${invoiceId}.pdf`;
  const { error } = await supabase.storage.from("invoices").upload(path, file, { contentType: "application/pdf", upsert: true });
  return error ? null : path;
}

function readPdf(formData: FormData): { file: File | null; error?: string } {
  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) return { file: null };
  if (file.type !== "application/pdf") return { file: null, error: "Le fichier joint doit être un PDF." };
  if (file.size > MAX_PDF_SIZE) return { file: null, error: "Le PDF ne doit pas dépasser 5 Mo." };
  return { file };
}

export async function createInvoiceAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const back = (msg: string) => redirect(`/factures/nouvelle?erreur=${enc(msg)}`);

  const number = String(formData.get("number") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "");
  const amount = parseAmount(String(formData.get("amount") ?? ""));
  const dueDate = String(formData.get("due_date") ?? "");
  const issueDate = String(formData.get("issue_date") ?? "") || null;
  const pdf = readPdf(formData);

  if (!number) back("Le numéro de facture est obligatoire.");
  if (!clientId) back("Choisissez un client.");
  if (amount === null) back("Le montant est invalide.");
  if (!isIsoDate(dueDate)) back("La date d'échéance est invalide.");
  if (issueDate && !isIsoDate(issueDate)) back("La date de facture est invalide.");
  if (pdf.error) back(pdf.error);

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({ user_id: user.id, client_id: clientId, number, amount, due_date: dueDate, issue_date: issueDate })
    .select("id")
    .single<{ id: string }>();
  if (error || !invoice) {
    back(error?.code === "23505" ? `La facture n° ${number} existe déjà.` : "Impossible d'enregistrer la facture.");
    return;
  }

  if (pdf.file) {
    const path = await uploadPdf(supabase, user.id, invoice.id, pdf.file);
    if (path) await supabase.from("invoices").update({ pdf_path: path }).eq("id", invoice.id);
  }

  revalidatePath("/factures");
  redirect(`/factures/${invoice.id}?succes=${enc("Facture enregistrée. Les relances suivront le scénario automatiquement.")}`);
}

/** Import CSV : crée les clients manquants (par email) puis les factures. */
export async function importCsvAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) redirect(`/factures/import?erreur=${enc("Choisissez un fichier CSV.")}`);

  const { rows, errors } = parseInvoicesCsv(await (file as File).text());
  if (rows.length === 0) {
    redirect(`/factures/import?erreur=${enc(errors.slice(0, 5).join(" · ") || "Aucune ligne valide dans le fichier.")}`);
  }

  // 1. Clients : on réutilise ceux qui existent déjà (même email)
  const { data: existing } = await supabase.from("clients").select("id, email").returns<{ id: string; email: string }[]>();
  const clientIds = new Map((existing ?? []).map((c) => [c.email.toLowerCase(), c.id]));

  const newClients = new Map<string, { user_id: string; name: string; email: string; phone: string | null }>();
  for (const r of rows) {
    if (!clientIds.has(r.clientEmail) && !newClients.has(r.clientEmail)) {
      newClients.set(r.clientEmail, { user_id: user.id, name: r.clientName, email: r.clientEmail, phone: r.clientPhone });
    }
  }
  if (newClients.size) {
    const { data: created, error } = await supabase
      .from("clients")
      .insert([...newClients.values()])
      .select("id, email")
      .returns<{ id: string; email: string }[]>();
    if (error) redirect(`/factures/import?erreur=${enc("Erreur lors de la création des clients.")}`);
    created?.forEach((c) => clientIds.set(c.email.toLowerCase(), c.id));
  }

  // 2. Factures : on ignore les numéros déjà présents
  const { data: existingInvoices } = await supabase.from("invoices").select("number").returns<{ number: string }[]>();
  const knownNumbers = new Set((existingInvoices ?? []).map((i) => i.number));
  const skipped: string[] = [];
  const toInsert = rows
    .filter((r) => {
      if (knownNumbers.has(r.number)) {
        skipped.push(r.number);
        return false;
      }
      knownNumbers.add(r.number);
      return true;
    })
    .map((r) => ({
      user_id: user.id,
      client_id: clientIds.get(r.clientEmail)!,
      number: r.number,
      amount: r.amount,
      due_date: r.dueDate,
      issue_date: r.issueDate,
    }));

  if (toInsert.length) {
    const { error } = await supabase.from("invoices").insert(toInsert);
    if (error) redirect(`/factures/import?erreur=${enc("Erreur lors de l'import des factures.")}`);
  }

  revalidatePath("/factures");
  const parts = [`${toInsert.length} facture(s) importée(s)`];
  if (newClients.size) parts.push(`${newClients.size} client(s) créé(s)`);
  if (skipped.length) parts.push(`${skipped.length} doublon(s) ignoré(s)`);
  if (errors.length) parts.push(`${errors.length} ligne(s) en erreur`);
  redirect(`/factures?succes=${enc(parts.join(", ") + ".")}`);
}

/** « Marquer comme payée » : la facture sort du scénario, plus aucune relance n'est envoyée. */
export async function markPaidAction(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/factures");
  revalidatePath("/tableau-de-bord");
  redirect(`/factures/${id}?succes=${enc("Facture marquée comme payée. Les relances sont arrêtées.")}`);
}

export async function markUnpaidAction(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("invoices").update({ status: "unpaid", paid_at: null }).eq("id", id);
  revalidatePath("/factures");
  redirect(`/factures/${id}?succes=${enc("Facture repassée en impayée. Les relances reprennent.")}`);
}

/** Met en pause / reprend les relances (ex. litige ou échéancier négocié avec le client). */
export async function togglePauseAction(id: string, paused: boolean) {
  const { supabase } = await requireUser();
  await supabase.from("invoices").update({ reminders_paused: paused }).eq("id", id);
  revalidatePath(`/factures/${id}`);
  redirect(`/factures/${id}?succes=${enc(paused ? "Relances mises en pause." : "Relances réactivées.")}`);
}

export async function attachPdfAction(id: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const pdf = readPdf(formData);
  if (!pdf.file) redirect(`/factures/${id}?erreur=${enc(pdf.error ?? "Choisissez un fichier PDF.")}`);
  const path = await uploadPdf(supabase, user.id, id, pdf.file!);
  if (!path) redirect(`/factures/${id}?erreur=${enc("Échec de l'envoi du PDF.")}`);
  await supabase.from("invoices").update({ pdf_path: path }).eq("id", id);
  redirect(`/factures/${id}?succes=${enc("PDF joint à la facture.")}`);
}

export async function deleteInvoiceAction(id: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("invoices").select("pdf_path").eq("id", id).single<{ pdf_path: string | null }>();
  if (data?.pdf_path) await supabase.storage.from("invoices").remove([data.pdf_path]);
  await supabase.from("invoices").delete().eq("id", id);
  revalidatePath("/factures");
  redirect(`/factures?succes=${enc("Facture supprimée.")}`);
}
