"use client";

import { useRef, useState } from "react";

import type { ContactResponse } from "@/lib/contact-email";

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [sentName, setSentName] = useState("");
  const [shake, setShake] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cierra la puerta al doble envío de forma sincrónica: dos clics seguidos
  // corren antes del re-render, así que ambos leerían `status === "idle"`.
  const sending = useRef(false);

  const triggerShake = () => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    setShake(true);
    shakeTimer.current = setTimeout(() => setShake(false), 400);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending.current) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      message: form.message.trim(),
    };

    if (!payload.name || !payload.email || !payload.message) {
      triggerShake();
      return;
    }

    sending.current = true;
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ContactResponse;

      if (res.ok && data.ok) {
        setSentName(payload.name);
        setStatus("sent");
        return;
      }
    } catch {
      // La red falló: se trata igual que un error del servidor.
    } finally {
      sending.current = false;
    }

    setStatus("error");
  };

  const reset = () => {
    setForm({ name: "", email: "", message: "" });
    setSentName("");
    setStatus("idle");
  };

  const isSending = status === "sending";
  const showTerminal = status === "sent" || status === "error";

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      onSubmit={onSubmit}
      noValidate
    >
      {!showTerminal ? (
        <>
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
              maxLength={80}
              disabled={isSending}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
              maxLength={160}
              disabled={isSending}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-message">MENSAJE</label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
              maxLength={2000}
              disabled={isSending}
            />
          </div>
          <button
            className="btn xl press"
            type="submit"
            style={{ width: "100%" }}
            disabled={isSending}
          >
            {isSending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div
          className={
            "terminal-success" + (status === "error" ? " is-error" : "")
          }
          role="status"
          aria-live="polite"
        >
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          {status === "sent" ? (
            <div className="term-body">
              <div className="line">
                <span className="prompt">vault@arcade:~$</span> ./send_message
                --to=team
              </div>
              <div className="line dim">[OK] Conectando con servidor…</div>
              <div className="line dim">[OK] Validando contenido…</div>
              <div className="line dim">[OK] Transmitiendo paquete…</div>
              <div className="line success">
                &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS,{" "}
                {sentName.toUpperCase()}.<span className="caret">_</span>
              </div>
              <div style={{ marginTop: 18 }}>
                <button className="btn ghost" type="button" onClick={reset}>
                  ENVIAR OTRO MENSAJE
                </button>
              </div>
            </div>
          ) : (
            <div className="term-body">
              <div className="line">
                <span className="prompt">vault@arcade:~$</span> ./send_message
                --to=team
              </div>
              <div className="line dim">[OK] Validando contenido…</div>
              <div className="line">[FAIL] No se pudo enviar el mensaje.</div>
              <div className="line success">
                &gt; TU MENSAJE SIGUE AQUÍ. INTÉNTALO DE NUEVO.
                <span className="caret">_</span>
              </div>
              <div style={{ marginTop: 18 }}>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => setStatus("idle")}
                >
                  REINTENTAR
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
