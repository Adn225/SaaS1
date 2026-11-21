import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SidebarNav } from "@/components/Sidebar";
import { requireUser } from "@/lib/supabase/server";
import { isSubscribed, trialDaysLeft } from "@/lib/subscription";
import { signOut } from "@/app/auth/actions";

/** Mise en page de l'espace connecté : barre latérale + bandeau d'essai. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  const subscribed = isSubscribed(profile);
  const daysLeft = trialDaysLeft(profile);

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white p-4 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:border-r md:border-b-0">
        <div className="mb-4 md:mb-8">
          <Logo href="/tableau-de-bord" />
        </div>
        <SidebarNav />
        <div className="mt-4 hidden border-t border-slate-200 pt-4 md:mt-auto md:block">
          <p className="truncate text-sm font-medium text-slate-900">{profile.company_name || "Mon entreprise"}</p>
          <p className="truncate text-xs text-slate-500">{profile.email}</p>
          <form action={signOut} className="mt-3">
            <button className="text-sm text-slate-500 hover:text-slate-900">Se déconnecter</button>
          </form>
        </div>
      </aside>

      <div className="flex-1">
        {!subscribed && (
          <div className={`px-6 py-2 text-center text-sm ${daysLeft > 0 ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-700"}`}>
            {daysLeft > 0
              ? `Essai gratuit : ${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}. `
              : "Votre essai gratuit est terminé : les relances automatiques sont suspendues. "}
            <Link href="/abonnement" className="font-semibold underline">S&apos;abonner pour 19 €/mois</Link>
          </div>
        )}
        <main className="mx-auto max-w-6xl p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
