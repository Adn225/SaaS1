/**
 * Tâche planifiée quotidienne (Vercel Cron, voir vercel.json) : envoie les relances du jour.
 * Vercel appelle cette route avec l'en-tête « Authorization: Bearer <CRON_SECRET> ».
 * Test manuel : curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/relances
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDailyReminders } from "@/lib/reminders/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // secondes

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const summary = await runDailyReminders(createAdminClient());
    console.log("Relances du jour", summary);
    return NextResponse.json(summary);
  } catch (e) {
    console.error("Échec de la tâche de relance", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
