import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { todayInParis } from "@/lib/dates";
import { formalNoticeData } from "@/lib/reminders/engine";
import { generateFormalNoticePdf } from "@/lib/pdf/mise-en-demeure";
import type { Client, Invoice, Profile } from "@/lib/types";

/** Génère et affiche la mise en demeure d'une facture (aperçu ou envoi manuel par courrier). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const [{ data: profile }, { data: invoice }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase.from("invoices").select("*, client:clients(*)").eq("id", id).maybeSingle<Invoice & { client: Client }>(),
  ]);
  if (!profile || !invoice) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });

  const pdf = await generateFormalNoticePdf(formalNoticeData(profile, invoice, todayInParis()));
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="mise-en-demeure-${invoice.number.replace(/[^\w-]/g, "_")}.pdf"`,
    },
  });
}
