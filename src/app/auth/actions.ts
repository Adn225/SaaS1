"use server";
/** Actions d'authentification (email + mot de passe via Supabase Auth). */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const enc = encodeURIComponent;

/** Traduit les erreurs Supabase les plus courantes en français. */
function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Email ou mot de passe incorrect.";
  if (/email not confirmed/i.test(message)) return "Veuillez confirmer votre adresse email (lien reçu par email).";
  if (/already registered|already exists/i.test(message)) return "Un compte existe déjà avec cette adresse email.";
  if (/password should be at least/i.test(message)) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (/rate limit/i.test(message)) return "Trop de tentatives. Merci de réessayer dans quelques minutes.";
  return "Une erreur est survenue. Merci de réessayer.";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/connexion?erreur=${enc(translateAuthError(error.message))}`);
  redirect("/tableau-de-bord");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("company_name") ?? "").trim();

  if (password.length < 8) redirect(`/inscription?erreur=${enc("Le mot de passe doit contenir au moins 8 caractères.")}`);
  if (!formData.get("cgu")) redirect(`/inscription?erreur=${enc("Merci d'accepter les conditions d'utilisation.")}`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: { company_name: companyName }, // repris par le trigger handle_new_user
    },
  });
  if (error) redirect(`/inscription?erreur=${enc(translateAuthError(error.message))}`);

  // Si la confirmation d'email est désactivée dans Supabase, l'utilisateur est déjà connecté.
  if (data.session) redirect("/tableau-de-bord?succes=" + enc("Bienvenue sur Relancia ! Votre essai gratuit de 14 jours commence."));
  redirect(`/connexion?succes=${enc("Compte créé ! Cliquez sur le lien reçu par email pour l'activer, puis connectez-vous.")}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
