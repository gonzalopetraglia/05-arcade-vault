"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useSession } from "@/components/session-provider";
import type { Game } from "@/lib/games";

type Props = {
  game: Game;
  score: number;
  lives: number;
  level: number;
  paused: boolean;
  over: boolean;
  onTogglePause: () => void;
  onEnd: () => void;
  onRestart: () => void;
  /** Lo que se ve dentro de la pantalla del CRT. */
  children: ReactNode;
};

/**
 * Envoltorio común a todos los players: cabecera de HUD, marco CRT, botones,
 * cartel de pausa y modal de fin de partida con guardado. Cada juego pone
 * dentro su pantalla y le pasa sus valores; el shell nunca calcula la
 * puntuación ni el nivel por su cuenta.
 */
export function PlayerShell({
  game,
  score,
  lives,
  level,
  paused,
  over,
  onTogglePause,
  onEnd,
  onRestart,
  children,
}: Props) {
  const { user, saveScore } = useSession();
  const [saved, setSaved] = useState(false);
  // null means "not edited yet": fall back to the session name, which only
  // becomes known after the provider hydrates from localStorage.
  const [typedName, setTypedName] = useState<string | null>(null);

  const name = typedName ?? user?.name ?? "INVITADO";

  const restart = () => {
    setSaved(false);
    onRestart();
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={onTogglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={onEnd}>
            FIN
          </button>
          <Link className="btn ghost" href={`/games/${game.id}`}>
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {children}
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setTypedName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                />
                <button
                  className="btn yellow"
                  onClick={() => {
                    saveScore({ game: game.id, score, name });
                    setSaved(true);
                  }}
                >
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link className="btn magenta" href="/games">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
