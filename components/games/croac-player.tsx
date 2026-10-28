"use client";

import { useCallback, useRef, useState } from "react";
import { CroacCanvas } from "@/components/games/croac-canvas";
import { PlayerShell } from "@/components/player-shell";
import type { CroacEngine, CroacState } from "@/lib/games/croac/engine";
import { LIVES } from "@/lib/games/croac/entities";
import type { Game } from "@/lib/games";

const INITIAL: CroacState = { score: 0, lives: LIVES, level: 1, status: "playing" };

/**
 * Player de CROAC. Mismo reparto que en los otros juegos: React manda sobre el
 * motor (PAUSA, FIN y JUGAR DE NUEVO), y el motor es la única fuente de
 * puntuación, vidas y nivel. El HUD, el marco CRT, el mando táctil y el modal
 * de fin de partida los pone PlayerShell.
 */
export function CroacPlayer({ game }: { game: Game }) {
  const engineRef = useRef<CroacEngine | null>(null);
  const [hud, setHud] = useState<CroacState>(INITIAL);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);

  const onEngineReady = useCallback((engine: CroacEngine | null) => {
    engineRef.current = engine;
  }, []);

  const onState = useCallback((s: CroacState) => setHud(s), []);

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

  // El mando táctil entra por la misma puerta que el teclado; estable para
  // que el mando no reciba una función nueva en cada render.
  const setKey = useCallback((code: string, down: boolean) => {
    engineRef.current?.setKey(code, down);
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
      gamepad={{ setKey }}
    >
      <CroacCanvas
        onState={onState}
        onGameOver={onGameOver}
        onEngineReady={onEngineReady}
        onAutoPause={onAutoPause}
      />
    </PlayerShell>
  );
}
