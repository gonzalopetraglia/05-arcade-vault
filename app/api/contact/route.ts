import { Resend } from "resend";

import {
  buildContactEmail,
  validateContact,
  type ContactResponse,
} from "@/lib/contact-email";

function json(body: ContactResponse, status: number) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "INVALID" }, 400);
  }

  const payload = validateContact(body);
  if (payload === null) {
    return json({ ok: false, error: "INVALID" }, 400);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    console.error(
      "[contact] Faltan variables de entorno: " +
        [
          !apiKey && "RESEND_API_KEY",
          !to && "CONTACT_TO_EMAIL",
          !from && "CONTACT_FROM_EMAIL",
        ]
          .filter(Boolean)
          .join(", ")
    );
    return json({ ok: false, error: "NOT_CONFIGURED" }, 500);
  }

  const { subject, html, text } = buildContactEmail(payload);

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: payload.email,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[contact] Resend devolvió un error:", error);
      return json({ ok: false, error: "SEND_FAILED" }, 502);
    }
  } catch (cause) {
    console.error("[contact] Falló el envío con Resend:", cause);
    return json({ ok: false, error: "SEND_FAILED" }, 502);
  }

  return json({ ok: true }, 200);
}
