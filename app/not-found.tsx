import Link from "next/link";

export default function NotFound() {
  return (
    <section
      className="fade-in"
      style={{
        maxWidth: 1320,
        margin: "0 auto",
        padding: "96px 32px",
        textAlign: "center",
      }}
    >
      <div
        className="mono"
        style={{ fontSize: 11, letterSpacing: "0.24em", color: "var(--ink-faint)", marginBottom: 24 }}
      >
        ERROR 404 · SEÑAL PERDIDA
      </div>

      <h1
        className="pixel neon-magenta flicker"
        style={{ fontSize: "clamp(28px, 7vw, 64px)", margin: 0, letterSpacing: "0.06em" }}
      >
        GAME OVER
      </h1>

      <p
        className="pixel"
        style={{
          fontSize: 11,
          letterSpacing: "0.16em",
          color: "var(--ink-dim)",
          margin: "24px 0 0",
        }}
      >
        ESE CARTUCHO NO ESTÁ EN EL VAULT{" "}
        <span style={{ animation: "blink 1.2s steps(1,end) infinite" }}>_</span>
      </p>

      <div style={{ marginTop: 40 }}>
        <Link className="btn magenta lg" href="/games">
          VOLVER AL VAULT
        </Link>
      </div>
    </section>
  );
}
