import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { formatOffset } from "@/lib/format";
import { FlashMessages } from "@/components/Alert";
import { PageHeader } from "@/components/PageHeader";
import { StepFields } from "@/components/StepFields";
import { SubmitButton } from "@/components/SubmitButton";
import { TEMPLATE_VARIABLES } from "@/lib/reminders/templates";
import type { ReminderStep } from "@/lib/types";
import { createStepAction, deleteStepAction, updateStepAction } from "./actions";

export const metadata: Metadata = { title: "Scénario de relance" };

export default async function ScenarioPage({ searchParams }: { searchParams: Promise<{ erreur?: string; succes?: string }> }) {
  const params = await searchParams;
  const { supabase } = await requireUser();
  const { data: steps } = await supabase.from("reminder_steps").select("*").order("offset_days").returns<ReminderStep[]>();

  return (
    <>
      <PageHeader
        title="Scénario de relance"
        description="Les emails sont envoyés automatiquement chaque matin selon ces étapes, jusqu'au paiement de la facture."
      />
      <FlashMessages searchParams={params} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {steps?.map((step) => (
            <details key={step.id} id={`etape-${step.id}`} className="card">
              <summary className="flex cursor-pointer items-center justify-between px-5 py-4">
                <span>
                  <span className="mr-3 inline-block w-14 font-bold text-brand-600">{formatOffset(step.offset_days)}</span>
                  <span className="font-medium text-slate-900">{step.label}</span>
                  {step.kind === "formal_notice" && <span className="ml-2 text-xs text-slate-500">+ PDF</span>}
                </span>
                <span className={`text-xs font-medium ${step.enabled ? "text-emerald-700" : "text-slate-400"}`}>
                  {step.enabled ? "Active" : "Désactivée"}
                </span>
              </summary>
              <div className="border-t border-slate-200 p-5">
                <form action={updateStepAction.bind(null, step.id)} className="space-y-4">
                  <StepFields step={step} />
                  <SubmitButton>Enregistrer l&apos;étape</SubmitButton>
                </form>
                <form action={deleteStepAction.bind(null, step.id)} className="mt-3">
                  <SubmitButton className="btn-danger" pendingText="…" confirm="Supprimer cette étape du scénario ?">
                    Supprimer l&apos;étape
                  </SubmitButton>
                </form>
              </div>
            </details>
          ))}

          <details className="card">
            <summary className="cursor-pointer px-5 py-4 font-medium text-slate-900">+ Ajouter une étape</summary>
            <form action={createStepAction} className="space-y-4 border-t border-slate-200 p-5">
              <StepFields />
              <SubmitButton>Ajouter l&apos;étape</SubmitButton>
            </form>
          </details>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-slate-900">Variables disponibles</h2>
            <p className="mt-1 text-sm text-slate-500">Elles sont remplacées automatiquement dans l&apos;objet et le message.</p>
            <ul className="mt-3 space-y-2 text-sm">
              {TEMPLATE_VARIABLES.map((v) => (
                <li key={v.key}>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-brand-700">{`{{${v.key}}}`}</code>
                  <span className="ml-2 text-slate-600">{v.description}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5 text-sm text-slate-600">
            <h2 className="font-semibold text-slate-900">Mentions légales</h2>
            <p className="mt-2">
              Entre professionnels, tout retard de paiement entraîne de plein droit des pénalités de retard (art. L441-10 du
              Code de commerce) et une indemnité forfaitaire de 40 € pour frais de recouvrement (art. D441-5). Ces mentions
              figurent dans les modèles par défaut.
            </p>
            <p className="mt-2">
              Pour un client particulier, ces pénalités ne s&apos;appliquent pas : adaptez alors vos messages.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
