import { test } from "node:test";
import assert from "node:assert/strict";
import { pickStepToSend, type StepLike } from "../src/lib/reminders/schedule.ts";

const steps: (StepLike & { name: string })[] = [
  { name: "J-3", offset_days: -3, kind: "reminder", enabled: true },
  { name: "J+3", offset_days: 3, kind: "reminder", enabled: true },
  { name: "J+10", offset_days: 10, kind: "reminder", enabled: true },
  { name: "J+20", offset_days: 20, kind: "formal_notice", enabled: true },
];
const pick = (days: number, sent: number[] = []) => pickStepToSend(steps, days, sent)?.name ?? null;

test("rien avant J-3", () => assert.equal(pick(-5), null));
test("J-3 envoyé avant l'échéance", () => assert.equal(pick(-3), "J-3"));
test("J-3 pas renvoyé", () => assert.equal(pick(-2, [-3]), null));
test("rien le jour J si J-3 déjà envoyé", () => assert.equal(pick(0, [-3]), null));
test("J+3 envoyé", () => assert.equal(pick(3, [-3]), "J+3"));
test("cron manqué : J+3 rattrapé à J+5", () => assert.equal(pick(5, [-3]), "J+3"));
test("J+10 envoyé", () => assert.equal(pick(10, [-3, 3]), "J+10"));
test("mise en demeure à J+20", () => assert.equal(pick(20, [-3, 3, 10]), "J+20"));
test("plus rien après la mise en demeure", () => assert.equal(pick(40, [-3, 3, 10, 20]), null));
test("facture saisie en retard : pas de rafale, étape la plus avancée", () => assert.equal(pick(12), "J+10"));
test("jamais de mise en demeure en premier contact", () => assert.equal(pick(25), "J+10"));
test("le J-3 n'est plus envoyé une fois l'échéance passée", () => assert.equal(pick(1), null));
test("étape désactivée ignorée", () => {
  const s = steps.map((x) => (x.name === "J+10" ? { ...x, enabled: false } : x));
  assert.equal(pickStepToSend(s, 12, [3])?.name ?? null, null);
});
