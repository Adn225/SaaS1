"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/tableau-de-bord", label: "Tableau de bord" },
  { href: "/factures", label: "Factures" },
  { href: "/clients", label: "Clients" },
  { href: "/scenario", label: "Scénario de relance" },
  { href: "/parametres", label: "Paramètres" },
  { href: "/abonnement", label: "Abonnement" },
];

/** Navigation principale de l'espace connecté. */
export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap ${
              active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
