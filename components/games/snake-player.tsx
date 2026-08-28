"use client";

import { useCallback, useRef, useState } from "react";
import { SnakeCanvas } from "@/components/games/snake-canvas";
import { PlayerShell } from "@/components/player-shell";
import type { SnakeEngine, SnakeState } from "@/lib/games/snake/engine";
import { LIVES } from "@/lib/games/snake/entities";
import type { Game } from "@/lib/games";

const INITIAL: SnakeState = { score: 0, lives: LIVES, level: 1, status: "playing" };

/**
 * Player de SNAKE. Mismo reparto que en ASTEROIDES, TETRIS y ARKANOID: React
 * manda sobre el motor (PAUSA, FIN y JUGAR DE NUEVO), y el motor es la única
 * fuente de puntuación, vidas y nivel. El HUD, el marco CRT y el modal de fin de
 * partida los pone PlayerShell.
 */
export function SnakePlayer({ game }: { game: Game }) {
  const engineRef = useRef<SnakeEngine | null>(null);
  const [hud, setHud] = useState<SnakeState>(INITIAL);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);

  const onEngineReady = useCallback((engine: SnakeEngine | null) => {
    engineRef.current = engine;
  }, []);

  const onState = useCallback((s: SnakeState) => setHud(s), []);

  const onGameOver = useCallback(() => setOver(true), []);

  const onAutoPause = useCallback(() => setPaused(true), []);

  const onTogglePause = useCallback(() => {
    const engine = engineRef.current;
    if (paused) engine?.resume();
    else engine?.pause();
    setPaused(!paused);
  }, [paused]);

  const onEnd = useCallback(() => {
    engineRef.current?.forceGameOver();
  }, []);

  const onRestart = useCallback(() => {
    setOver(false);
    setPaused(false);
    engineRef.current?.restart();
  }, []);

  return (
    <PlayerShell
      game={game}
      score={hud.score}
      lives={hud.lives}
      level={hud.level}
      paused={paused}
      over={over}
      onTogglePause={onTogglePause}
      onEnd={onEnd}
      onRestart={onRestart}
    >
      <SnakeCanvas
        onState={onState}
        onGameOver={onGameOver}
        onEngineReady={onEngineReady}
        onAutoPause={onAutoPause}
      />
    </PlayerShell>
  );
}
