import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { FlashMessages } from "@/components/Alert";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { updateProfileAction } from "./actions";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ erreur?: string; succes?: string }> }) {
  const params = await searchParams;
  const { profile } = await requireUser();

  return (
    <>
      <PageHeader title="Paramètres" description="Ces informations apparaissent dans vos relances et vos mises en demeure." />
      <FlashMessages searchParams={params} />

      <form action={updateProfileAction} className="card max-w-3xl space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="company_name">Raison sociale</label>
            <input id="company_name" name="company_name" defaultValue={profile.company_name ?? ""} className="input" />
            <p className="mt-1 text-xs text-slate-500">Nom d&apos;expéditeur des emails.</p>
          </div>
          <div>
            <label className="label" htmlFor="siret">SIRET</label>
            <input id="siret" name="siret" defaultValue={profile.siret ?? ""} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="address">Adresse postale</label>
          <textarea id="address" name="address" rows={2} defaultValue={profile.address ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="signature">Signature des emails</label>
          <textarea id="signature" name="signature" rows={3} defaultValue={profile.signature ?? ""} className="input" placeholder={"Marie Dupont\nGérante — Dupont Conseil\n06 12 34 56 78"} />
        </div>
        <div>
          <label className="label" htmlFor="late_penalty_rate">Taux des pénalités de retard</label>
          <input id="late_penalty_rate" name="late_penalty_rate" defaultValue={profile.late_penalty_rate} className="input" />
          <p className="mt-1 text-xs text-slate-500">
            Reprenez le taux figurant dans vos CGV ou sur vos factures. À défaut, le Code de commerce prévoit le taux de
            refinancement de la BCE majoré de 10 points ; il ne peut être inférieur à trois fois le taux d&apos;intérêt légal.
          </p>
        </div>
        <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          Les réponses de vos clients aux relances arrivent directement sur <strong>{profile.email}</strong>.
        </div>
        <SubmitButton>Enregistrer</SubmitButton>
      </form>
    </>
  );
}
