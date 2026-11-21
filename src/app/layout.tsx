import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Relancia — Relance automatique des factures impayées", template: "%s · Relancia" },
  description:
    "Relancia relance automatiquement vos factures impayées : rappels courtois, relances fermes et mise en demeure, pour TPE, PME et indépendants.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
