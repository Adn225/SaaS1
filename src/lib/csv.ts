/**
 * Import CSV des factures.
 *
 * Colonnes attendues (en-têtes insensibles à la casse et aux accents) :
 *   numero ; client ; email ; telephone ; montant ; echeance ; date_facture
 * Séparateur « ; » (Excel français) ou « , ». Dates JJ/MM/AAAA ou AAAA-MM-JJ.
 * Montants « 1 234,56 » ou « 1234.56 ».
 */
import Papa from "papaparse";

export type CsvInvoiceRow = {
  line: number;
  number: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  amount: number;
  dueDate: string;
  issueDate: string | null;
};

export type CsvParseResult = { rows: CsvInvoiceRow[]; errors: string[] };

/** Normalise un en-tête : minuscules, sans accents ni espaces. */
function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

const HEADER_ALIASES: Record<string, keyof Omit<CsvInvoiceRow, "line">> = {
  numero: "number", numerofacture: "number", facture: "number", nfacture: "number",
  client: "clientName", nom: "clientName", nomclient: "clientName",
  email: "clientEmail", emailclient: "clientEmail", mail: "clientEmail", courriel: "clientEmail",
  telephone: "clientPhone", tel: "clientPhone",
  montant: "amount", montantttc: "amount", total: "amount",
  echeance: "dueDate", dateecheance: "dueDate",
  datefacture: "issueDate", dateemission: "issueDate", date: "issueDate",
};

/** « 1 234,56 € » -> 1234.56 */
export function parseAmount(raw: string): number | null {
  let s = raw.replace(/[€\s  ]/g, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

/** « 19/11/2026 » ou « 2026-11-19 » -> « 2026-11-19 » */
export function parseFrenchDate(raw: string): string | null {
  const s = raw.trim();
  let y: string, m: string, d: string;
  const fr = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (fr) [, d, m, y] = fr;
  else if (iso) [, y, m, d] = iso;
  else return null;
  const out = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const date = new Date(`${out}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === out ? out : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseInvoicesCsv(content: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(content.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    delimitersToGuess: [";", ",", "\t"],
    transformHeader: (h) => HEADER_ALIASES[normalizeHeader(h)] ?? normalizeHeader(h),
  });

  const rows: CsvInvoiceRow[] = [];
  const errors: string[] = [];
  const required = ["number", "clientName", "clientEmail", "amount", "dueDate"];
  const missing = required.filter((f) => !parsed.meta.fields?.includes(f));
  if (missing.length) {
    return { rows, errors: ["Colonnes manquantes. En-têtes attendus : numero ; client ; email ; montant ; echeance"] };
  }

  parsed.data.forEach((r, i) => {
    const line = i + 2; // +1 pour l'en-tête, +1 car les lignes commencent à 1
    const number = (r.number ?? "").trim();
    const clientName = (r.clientName ?? "").trim();
    const clientEmail = (r.clientEmail ?? "").trim().toLowerCase();
    const amount = parseAmount(r.amount ?? "");
    const dueDate = parseFrenchDate(r.dueDate ?? "");
    const issueDate = r.issueDate ? parseFrenchDate(r.issueDate) : null;

    const problems: string[] = [];
    if (!number) problems.push("numéro manquant");
    if (!clientName) problems.push("client manquant");
    if (!EMAIL_RE.test(clientEmail)) problems.push("email invalide");
    if (amount === null) problems.push("montant invalide");
    if (!dueDate) problems.push("date d'échéance invalide");

    if (problems.length) errors.push(`Ligne ${line} : ${problems.join(", ")}`);
    else
      rows.push({
        line,
        number,
        clientName,
        clientEmail,
        clientPhone: r.clientPhone?.trim() || null,
        amount: amount!,
        dueDate: dueDate!,
        issueDate,
      });
  });

  return { rows, errors };
}
