import "server-only";
import { Resend } from "resend";

/** Client Resend pour l'envoi des emails de relance. */
export const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
