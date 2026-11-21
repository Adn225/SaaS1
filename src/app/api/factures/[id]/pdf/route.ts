import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Télécharge le PDF d'une facture via une URL signée valable 60 secondes. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  // RLS garantit que la facture appartient à l'utilisateur
  const { data: invoice } = await supabase.from("invoices").select("pdf_path").eq("id", id).maybeSingle<{ pdf_path: string | null }>();
  if (!invoice?.pdf_path) return NextResponse.json({ error: "PDF introuvable" }, { status: 404 });

  const { data } = await supabase.storage.from("invoices").createSignedUrl(invoice.pdf_path, 60);
  if (!data) return NextResponse.json({ error: "PDF introuvable" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
