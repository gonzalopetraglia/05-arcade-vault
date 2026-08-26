import type { Metadata } from "next";

import { ContactForm } from "@/components/about/contact-form";
import { HighlightIcon } from "@/components/about/highlight-icon";
import { RevealSection } from "@/components/home/reveal-section";
import {
  ABOUT_HIGHLIGHTS,
  ABOUT_MISSION,
  ABOUT_TIPS,
} from "@/lib/about-content";

export const metadata: Metadata = {
  title: "Acerca de — Arcade Vault",
};

const DIVIDER_PIXELS = 24;

export default function AboutPage() {
  return (
    <div className="about fade-in">
      {/* ABOUT */}
      <section className="about-hero">
        <div className="kicker pixel neon-yellow">▸ ACERCA DE</div>
        <h1 className="about-title">ACERCA DE ARCADE VAULT</h1>
        <p className="about-mission">{ABOUT_MISSION}</p>

        <div className="highlight-row">
          {ABOUT_HIGHLIGHTS.map((h, i) => (
            <div
              key={h.icon}
              className={"highlight " + h.color}
              style={{ transitionDelay: i * 80 + "ms" }}
            >
              <HighlightIcon kind={h.icon} />
              <div className="hl-text pixel">{h.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* divider banner */}
      <RevealSection className="about-divider">
        <div className="div-bar" aria-hidden="true"></div>
        <div className="div-pixels" aria-hidden="true">
          {Array.from({ length: DIVIDER_PIXELS }).map((_, i) => (
            <span key={i} style={{ animationDelay: i * 80 + "ms" }}></span>
          ))}
        </div>
        <div className="div-bar" aria-hidden="true"></div>
      </RevealSection>

      {/* CONTACT */}
      <RevealSection className="about-contact">
        <div className="contact-grid">
          <div className="contact-intro">
            <div className="kicker pixel neon-cyan">▸ CONTACTO</div>
            <h2 className="contact-title">CONTÁCTANOS</h2>
            <p className="contact-sub">
              ¿Tienes alguna sugerencia, quieres proponer un juego, o
              simplemente quieres saludar? Escríbenos.
            </p>
            <div className="contact-tips">
              {ABOUT_TIPS.map((t) => (
                <div className="tip" key={t.text}>
                  <span
                    className={
                      "tip-led" +
                      (t.led === "yellow" ? " y" : t.led === "magenta" ? " m" : "")
                    }
                  ></span>
                  {t.text}
                </div>
              ))}
            </div>
          </div>

          <ContactForm />
        </div>
      </RevealSection>
    </div>
  );
}
