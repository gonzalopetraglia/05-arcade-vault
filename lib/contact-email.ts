export type ContactPayload = { name: string; email: string; message: string };

export type ContactResponse =
  | { ok: true }
  | { ok: false; error: "INVALID" | "SEND_FAILED" | "NOT_CONFIGURED" };

const NAME_MAX = 80;
const EMAIL_MAX = 160;
const MESSAGE_MAX = 2000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function inRange(value: string, max: number): boolean {
  return value.length >= 1 && value.length <= max;
}

export function validateContact(input: unknown): ContactPayload | null {
  if (typeof input !== "object" || input === null) return null;

  const { name, email, message } = input as Record<string, unknown>;

  const cleanName = readString(name);
  const cleanEmail = readString(email);
  const cleanMessage = readString(message);

  if (cleanName === null || !inRange(cleanName, NAME_MAX)) return null;
  if (cleanEmail === null || !inRange(cleanEmail, EMAIL_MAX)) return null;
  if (!EMAIL_RE.test(cleanEmail)) return null;
  if (cleanMessage === null || !inRange(cleanMessage, MESSAGE_MAX)) return null;

  return { name: cleanName, email: cleanEmail, message: cleanMessage };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildContactEmail(payload: ContactPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `[Arcade Vault] Mensaje de ${payload.name}`;

  const safeName = escapeHtml(payload.name);
  const safeEmail = escapeHtml(payload.email);
  const safeMessage = escapeHtml(payload.message).replace(/\r?\n/g, "<br>");

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#0a0a0f;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#e6e6f0;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;border:1px solid #262636;background:#12121a;">
      <tr>
        <td style="padding:20px 24px;border-bottom:1px solid #262636;">
          <div style="font-size:12px;letter-spacing:0.18em;color:#00f5ff;">ARCADE VAULT // CONTACTO</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 8px;font-size:13px;color:#8a8aa3;">NOMBRE</p>
          <p style="margin:0 0 20px;font-size:15px;color:#e6e6f0;">${safeName}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#8a8aa3;">CORREO</p>
          <p style="margin:0 0 20px;font-size:15px;color:#e6e6f0;">
            <a href="mailto:${safeEmail}" style="color:#00f5ff;">${safeEmail}</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#8a8aa3;">MENSAJE</p>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#e6e6f0;">${safeMessage}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px;border-top:1px solid #262636;font-size:12px;color:#5a5a70;">
          Responde a este correo para contestar directamente al remitente.
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "ARCADE VAULT // CONTACTO",
    "",
    `NOMBRE: ${payload.name}`,
    `CORREO: ${payload.email}`,
    "",
    "MENSAJE:",
    payload.message,
    "",
    "Responde a este correo para contestar directamente al remitente.",
  ].join("\n");

  return { subject, html, text };
}
