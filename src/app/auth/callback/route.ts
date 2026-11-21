import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Lien de confirmation d'email : échange le code contre une session puis redirige. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/tableau-de-bord`);
  }
  return NextResponse.redirect(
    `${origin}/connexion?erreur=${encodeURIComponent("Lien invalide ou expiré. Connectez-vous ou recréez un compte.")}`,
  );
}
