import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client « service role » : contourne RLS. À utiliser UNIQUEMENT côté serveur,
 * pour la tâche planifiée et le webhook Stripe (aucun utilisateur connecté).
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
