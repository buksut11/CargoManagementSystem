import "server-only";
import nodemailer from "nodemailer";
import { normalizeSomaliPhone } from "@/lib/phone";

// Outbound billing notifications: plain SMTP for email (works with any
// provider — Gmail, Outlook, Zoho, your own server) and the official WhatsApp
// Cloud API for WhatsApp. Either channel is optional: leave its env vars blank
// and it is simply skipped — the in-app notification list always works.

// ── Email (SMTP) ────────────────────────────────────────────────────────────

export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

// One transporter per server instance; created lazily so a build without SMTP
// env vars never touches nodemailer.
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? "587");
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // 465 is implicit TLS; 587/25 upgrade via STARTTLS.
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
        : undefined,
    });
  }
  return transporter;
}

// Sends one plain-text email to the given recipients. Returns true when the
// message was accepted by the SMTP server; false (never throws) otherwise so
// a mail outage cannot break the billing tick.
export async function sendBillingEmail(
  to: string[],
  subject: string,
  body: string,
): Promise<boolean> {
  if (!emailConfigured() || to.length === 0) return false;
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to: to.join(", "),
      subject,
      text: body,
    });
    return true;
  } catch (e) {
    console.error("billing email failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

// ── WhatsApp (Meta WhatsApp Cloud API) ──────────────────────────────────────
// Needs a Meta Business app with the WhatsApp product: WHATSAPP_ACCESS_TOKEN
// (a system-user token) and WHATSAPP_PHONE_NUMBER_ID (the sender number's id).
//
// Free-form text messages only reach users who wrote to you in the last 24 h;
// for reliable proactive reminders create a pre-approved TEMPLATE with two
// body parameters ({{1}} = title, {{2}} = body) and set WHATSAPP_TEMPLATE_NAME
// (+ WHATSAPP_TEMPLATE_LANG, default "en"). With a template name set, every
// notification is sent through it; without one, plain text is attempted.

export function whatsappConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
  );
}

// The org's contact phone, as stored (any local format), to E.164 digits for
// the API. Somali numbers reuse the gateways' normaliser; anything already in
// international digits passes through.
function whatsappRecipient(phone: string | null): string | null {
  if (!phone) return null;
  const somali = normalizeSomaliPhone(phone);
  if (somali) return somali;
  const digits = phone.replace(/\D/g, "").replace(/^00/, "");
  return digits.length >= 10 ? digits : null;
}

export async function sendBillingWhatsApp(
  phone: string | null,
  title: string,
  body: string,
): Promise<boolean> {
  const to = whatsappRecipient(phone);
  if (!whatsappConfigured() || !to) return false;

  const template = process.env.WHATSAPP_TEMPLATE_NAME;
  const payload = template
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: title },
                { type: "text", text: body },
              ],
            },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: `${title}\n\n${body}` },
      };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      console.error("billing WhatsApp failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("billing WhatsApp failed:", e instanceof Error ? e.message : e);
    return false;
  }
}
