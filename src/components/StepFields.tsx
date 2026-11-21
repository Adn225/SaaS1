import type { ReminderStep } from "@/lib/types";

/** Champs d'édition d'une étape du scénario. */
export function StepFields({ step }: { step?: ReminderStep }) {
  const p = step?.id ?? "new";
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className="label" htmlFor={`offset-${p}`}>Jour (vs échéance)</label>
          <input id={`offset-${p}`} name="offset_days" type="number" min={-60} max={365} required defaultValue={step?.offset_days ?? 30} className="input" />
          <p className="mt-1 text-xs text-slate-500">-3 = 3 jours avant, 10 = 10 jours après</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor={`label-${p}`}>Nom de l&apos;étape</label>
          <input id={`label-${p}`} name="label" required defaultValue={step?.label} className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`kind-${p}`}>Type</label>
          <select id={`kind-${p}`} name="kind" defaultValue={step?.kind ?? "reminder"} className="input">
            <option value="reminder">Email de relance</option>
            <option value="formal_notice">Mise en demeure (PDF joint)</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`subject-${p}`}>Objet de l&apos;email</label>
        <input id={`subject-${p}`} name="subject" required defaultValue={step?.subject} className="input" />
      </div>
      <div>
        <label className="label" htmlFor={`body-${p}`}>Message</label>
        <textarea id={`body-${p}`} name="body" required rows={10} defaultValue={step?.body} className="input font-mono text-xs leading-relaxed" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="enabled" defaultChecked={step?.enabled ?? true} />
        Étape active
      </label>
    </div>
  );
}
