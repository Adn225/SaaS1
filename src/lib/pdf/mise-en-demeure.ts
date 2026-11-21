/**
 * Génération du PDF de mise en demeure de payer (pdf-lib, aucune dépendance native :
 * fonctionne sur Vercel). Le texte respecte les usages français :
 *  - art. 1344 du Code civil (mise en demeure),
 *  - art. L441-10 du Code de commerce (pénalités de retard),
 *  - art. D441-5 du Code de commerce (indemnité forfaitaire de 40 €).
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatDate, formatEuro, pdfSafe } from "../format.ts";

export type FormalNoticeData = {
  sender: { companyName: string; address: string | null; siret: string | null; email: string; signature: string };
  recipient: { name: string; address: string | null; email: string };
  invoice: { number: string; amount: number; issueDate: string | null; dueDate: string };
  penaltyRate: string;
  date: string; // AAAA-MM-JJ, date d'émission de la mise en demeure
};

export const RECOVERY_FEE = 40;

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 60;

/** Coupe un texte en lignes qui tiennent dans la largeur donnée. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function generateFormalNoticePdf(data: FormalNoticeData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(pdfSafe(`Mise en demeure - facture ${data.invoice.number}`));
  pdf.setAuthor(pdfSafe(data.sender.companyName));
  pdf.setLanguage("fr-FR");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = pdf.addPage([A4.width, A4.height]);
  let y = A4.height - MARGIN;
  const width = A4.width - MARGIN * 2;

  /** Écrit un bloc de texte et passe à la page suivante si nécessaire. */
  const write = (text: string, opts: { font?: PDFFont; size?: number; x?: number; gap?: number; maxWidth?: number } = {}) => {
    const font = opts.font ?? regular;
    const size = opts.size ?? 10.5;
    const x = opts.x ?? MARGIN;
    const lineHeight = size * 1.45;
    for (const line of wrap(pdfSafe(text), font, size, opts.maxWidth ?? width - (x - MARGIN))) {
      if (y < MARGIN + lineHeight) {
        page = pdf.addPage([A4.width, A4.height]);
        y = A4.height - MARGIN;
      }
      page.drawText(line, { x, y, size, font, color: rgb(0.1, 0.1, 0.12) });
      y -= lineHeight;
    }
    y -= opts.gap ?? 0;
  };

  const { sender, recipient, invoice } = data;
  const total = invoice.amount + RECOVERY_FEE;

  // --- Expéditeur (en haut à gauche) ---
  const top = y;
  write(sender.companyName, { font: bold, size: 11 });
  if (sender.address) write(sender.address);
  if (sender.siret) write(`SIRET : ${sender.siret}`);
  write(sender.email);

  // --- Destinataire (à droite) ---
  const afterSender = y;
  y = top - 90;
  const rightX = A4.width / 2 + 20;
  write(recipient.name, { font: bold, size: 11, x: rightX });
  if (recipient.address) write(recipient.address, { x: rightX });
  write(recipient.email, { x: rightX });
  y = Math.min(y, afterSender) - 20;

  write(`Le ${formatDate(data.date)}`, { x: rightX, gap: 18 });

  write("Envoi par courrier électronique — copie possible par lettre recommandée avec accusé de réception", {
    size: 9,
    gap: 6,
  });
  write(`Objet : Mise en demeure de payer — facture n° ${invoice.number}`, { font: bold, size: 11.5, gap: 16 });

  write("Madame, Monsieur,", { gap: 8 });
  write(
    `Sauf erreur de notre part, nous restons à ce jour dans l'attente du règlement de la facture n° ${invoice.number}` +
      (invoice.issueDate ? ` émise le ${formatDate(invoice.issueDate)}` : "") +
      `, d'un montant de ${formatEuro(invoice.amount)} TTC, arrivée à échéance le ${formatDate(invoice.dueDate)}.`,
    { gap: 8 },
  );
  write("Malgré nos précédentes relances, cette somme demeure impayée.", { gap: 8 });
  write(
    "Par la présente, nous vous mettons en demeure, conformément à l'article 1344 du Code civil, de nous régler " +
      "sous un délai de HUIT (8) JOURS à compter de la réception de ce courrier les sommes suivantes :",
    { gap: 10 },
  );

  // --- Récapitulatif des sommes dues ---
  const rows: [string, string][] = [
    [`Principal (facture n° ${invoice.number})`, formatEuro(invoice.amount)],
    ["Indemnité forfaitaire pour frais de recouvrement (art. D441-5 C. com.)", formatEuro(RECOVERY_FEE)],
    ["Total exigible (hors pénalités de retard)", formatEuro(total)],
  ];
  rows.forEach(([label, value], i) => {
    const isTotal = i === rows.length - 1;
    const font = isTotal ? bold : regular;
    page.drawText(pdfSafe(label), { x: MARGIN + 10, y, size: 10.5, font });
    const v = pdfSafe(value);
    page.drawText(v, { x: A4.width - MARGIN - 10 - font.widthOfTextAtSize(v, 10.5), y, size: 10.5, font });
    y -= 18;
  });
  y -= 8;

  write(
    `Nous vous rappelons qu'en application de l'article L441-10 du Code de commerce, des pénalités de retard ` +
      `sont exigibles de plein droit dès le jour suivant la date d'échéance, calculées au taux de ${data.penaltyRate}, ` +
      `sans qu'un rappel soit nécessaire. Ces pénalités s'ajoutent aux sommes ci-dessus et restent à parfaire au jour du paiement effectif.`,
    { gap: 8 },
  );
  write(
    "À défaut de règlement dans le délai imparti, nous nous réservons le droit d'engager, sans autre préavis, " +
      "toute procédure judiciaire de recouvrement (notamment une procédure d'injonction de payer), dont les frais " +
      "resteront à votre charge.",
    { gap: 8 },
  );
  write(
    "Si votre règlement a été effectué entre-temps, nous vous prions de ne pas tenir compte de la présente.",
    { gap: 8 },
  );
  write("Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.", { gap: 24 });
  write(sender.signature || sender.companyName, { font: bold });

  return pdf.save();
}
