"use client";

import { useCallback, useRef, useState } from "react";
import { TetrisCanvas } from "@/components/games/tetris-canvas";
import { PlayerShell } from "@/components/player-shell";
import type { TetrisEngine, TetrisState } from "@/lib/games/tetris/engine";
import type { Game } from "@/lib/games";

const INITIAL: TetrisState = { score: 0, lines: 0, level: 1, status: "playing" };

/**
 * Player de TETRIS. Mismo reparto que ASTEROIDES: React manda sobre el motor
 * (PAUSA, FIN y JUGAR DE NUEVO) y el motor es la única fuente de puntuación y
 * nivel.
 *
 * En Tetris no hay vidas, así que el HUD del shell recibe `lives={1}` fijo y las
 * líneas se dibujan dentro del canvas: renombrar VIDAS a LÍNEAS obligaría a
 * tocar PlayerShell, que comparten los diez juegos del catálogo.
 */
export function TetrisPlayer({ game }: { game: Game }) {
  const engineRef = useRef<TetrisEngine | null>(null);
  const [hud, setHud] = useState<TetrisState>(INITIAL);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);

  const onEngineReady = useCallback((engine: TetrisEngine | null) => {
    engineRef.current = engine;
  }, []);

  const onState = useCallback((s: TetrisState) => setHud(s), []);

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
      lives={1}
      level={hud.level}
      paused={paused}
      over={over}
      onTogglePause={onTogglePause}
      onEnd={onEnd}
      onRestart={onRestart}
    >
      <TetrisCanvas
        onState={onState}
        onGameOver={onGameOver}
        onEngineReady={onEngineReady}
        onAutoPause={onAutoPause}
      />
    </PlayerShell>
  );
}
