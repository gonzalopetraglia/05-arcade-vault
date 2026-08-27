"use client";

import { useEffect, useState } from "react";
import { PlayerShell } from "@/components/player-shell";
import type { Game } from "@/lib/games";

/**
 * Simulacro de los ocho juegos que todavía no están portados: la puntuación
 * sube sola y la arena son cuatro div animados por CSS. Solo ASTEROIDES tiene
 * motor de verdad (components/games/asteroids-player.tsx).
 */
export function GamePlayer({ game }: { game: Game }) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);

  const level = Math.floor(score / 2500) + 1;

  const restart = () => {
    setScore(0);
    setLives(3);
    setPaused(false);
    setOver(false);
  };

  useEffect(() => {
    if (over || paused) return;
    const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
    return () => clearInterval(t);
  }, [over, paused]);

  return (
    <PlayerShell
      game={game}
      score={score}
      lives={lives}
      level={level}
      paused={paused}
      over={over}
      onTogglePause={() => setPaused((p) => !p)}
      onEnd={() => setOver(true)}
      onRestart={restart}
    >
      <div className="game-arena">
        <div className="grid-floor"></div>
        <div className="enemy e1"></div>
        <div className="enemy e2"></div>
        <div className="enemy e3"></div>
        <div className="player-ship"></div>
      </div>
    </PlayerShell>
  );
}
