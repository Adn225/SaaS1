import Link from "next/link";
import type { Metadata } from "next";
import { FlashMessages } from "@/components/Alert";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { importCsvAction } from "../actions";

export const metadata: Metadata = { title: "Importer des factures" };

const EXAMPLE = `numero;client;email;telephone;montant;echeance;date_facture
F-2026-001;Dupont SARL;compta@dupont.fr;0102030405;1 250,00;15/12/2026;15/11/2026
F-2026-002;Martin Conseil;factures@martin.fr;;480,00;20/12/2026;20/11/2026`;

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const params = await searchParams;
  return (
    <>
      <PageHeader title="Importer des factures (CSV)" actions={<Link href="/factures" className="btn-secondary">Retour</Link>} />
      <FlashMessages searchParams={params} />

      <div className="grid gap-6 lg:grid-cols-2">
        <form action={importCsvAction} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="csv">Fichier CSV</label>
            <input id="csv" name="csv" type="file" accept=".csv,text/csv" required className="input" />
          </div>
          <p className="text-sm text-slate-500">
            Les clients inconnus sont créés automatiquement (reconnus par leur email). Les numéros de facture déjà
            présents sont ignorés.
          </p>
          <SubmitButton pendingText="Import en cours…">Importer</SubmitButton>
        </form>

        <div className="card p-6">
          <h2 className="font-semibold text-slate-900">Format attendu</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Séparateur point-virgule (export Excel) ou virgule</li>
            <li>Colonnes obligatoires : <code>numero, client, email, montant, echeance</code></li>
            <li>Colonnes facultatives : <code>telephone, date_facture</code></li>
            <li>Dates au format JJ/MM/AAAA, montants TTC (ex. 1 250,00)</li>
          </ul>
          <pre className="mt-4 overflow-x-auto rounded-md bg-slate-900 p-4 text-xs text-slate-100">{EXAMPLE}</pre>
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent("﻿" + EXAMPLE)}`}
            download="modele-factures-relancia.csv"
            className="btn-secondary mt-4"
          >
            Télécharger le modèle
          </a>
        </div>
      </div>
    </>
  );
}
