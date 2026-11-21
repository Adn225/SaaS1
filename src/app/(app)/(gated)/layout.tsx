import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { hasAccess } from "@/lib/subscription";

/** Pages réservées aux comptes en essai ou abonnés : sinon, redirection vers l'abonnement. */
export default async function GatedLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  if (!hasAccess(profile)) redirect("/abonnement?expire=1");
  return <>{children}</>;
}
