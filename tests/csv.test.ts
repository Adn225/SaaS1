import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAmount, parseFrenchDate, parseInvoicesCsv } from "../src/lib/csv.ts";

test("montants français", () => {
  assert.equal(parseAmount("1 234,56 €"), 1234.56);
  assert.equal(parseAmount("1.234,50"), 1234.5);
  assert.equal(parseAmount("99.9"), 99.9);
  assert.equal(parseAmount("abc"), null);
  assert.equal(parseAmount("-5"), null);
});

test("dates", () => {
  assert.equal(parseFrenchDate("05/01/2027"), "2027-01-05");
  assert.equal(parseFrenchDate("2027-01-05"), "2027-01-05");
  assert.equal(parseFrenchDate("31/02/2027"), null);
});

test("CSV Excel français avec point-virgule", () => {
  const csv = "﻿Numéro;Client;Email;Téléphone;Montant TTC;Échéance\nF-001;Dupont SARL;Compta@Dupont.fr;0102030405;1 200,00;15/12/2026\nF-002;Martin;pas-un-email;;50;15/12/2026\n";
  const { rows, errors } = parseInvoicesCsv(csv);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    line: 2, number: "F-001", clientName: "Dupont SARL", clientEmail: "compta@dupont.fr",
    clientPhone: "0102030405", amount: 1200, dueDate: "2026-12-15", issueDate: null,
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Ligne 3 : email invalide/);
});

test("colonnes manquantes", () => {
  const { errors } = parseInvoicesCsv("a,b\n1,2\n");
  assert.match(errors[0], /Colonnes manquantes/);
});
