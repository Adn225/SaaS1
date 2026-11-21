import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Profile } from "@/lib/types";

/**
 * Client Supabase côté serveur (Server Components, Server Actions, Route Handlers).
 * Il agit au nom de l'utilisateur connecté : les règles RLS s'appliquent.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appelé depuis un Server Component : le middleware se charge du rafraîchissement.
          }
        },
      },
    },
  );
}

/**
 * Retourne l'utilisateur connecté et son profil, ou redirige vers la connexion.
 * Mis en cache pour la durée d'une requête (appelé par plusieurs layouts/pages).
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) redirect("/connexion?erreur=profil");

  return { supabase, user, profile };
});
