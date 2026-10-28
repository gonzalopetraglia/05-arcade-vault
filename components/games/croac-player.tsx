"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CroacCanvas } from "@/components/games/croac-canvas";
import { PlayerShell, type HudHandle } from "@/components/player-shell";
import type { CroacEngine, CroacState } from "@/lib/games/croac/engine";
import { SKINS } from "@/lib/games/croac/skins";
import type { Game } from "@/lib/games";
import { useSkin } from "@/lib/use-skin";

/**
 * Player de CROAC. Mismo reparto que en los otros juegos: React manda sobre el
 * motor (PAUSA, FIN y JUGAR DE NUEVO), y el motor es la única fuente de
 * puntuación, vidas y nivel. El HUD, el marco CRT, el mando táctil y el modal
 * de fin de partida los pone PlayerShell.
 *
 * Regla de estado (SPEC 13): `useState` solo para lo que se pinta aquí
 * (`paused`, `finalScore`). Puntuación, vidas y nivel van directos al HUD por
 * `hudRef`, así un punto no re-renderiza este player ni nada de lo que cuelga
 * de él; y ningún callback cambia de identidad durante la partida.
 */
export function CroacPlayer({ game }: { game: Game }) {
  const engineRef = useRef<CroacEngine | null>(null);
  const hudRef = useRef<HudHandle>(null);
  const [paused, setPausedState] = useState(false);
  // Copia de `paused` para que onTogglePause la lea sin depender de ella.
  const pausedRef = useRef(false);
  // null mientras se juega; el número es la puntuación que enseña el modal.
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const { skin, setSkin, scheme } = useSkin(game.id);
  const palette = SKINS[skin][scheme];

  // Skin o tema del sitio cambian en caliente: el motor solo cambia de
  // colores, sin reiniciar la partida ni tocar puntuación, vidas o nivel.
  useEffect(() => {
    engineRef.current?.setPalette(palette);
  }, [palette]);

  const onEngineReady = useCallback((engine: CroacEngine | null) => {
    engineRef.current = engine;
  }, []);

  const setPaused = useCallback((next: boolean) => {
    pausedRef.current = next;
    setPausedState(next);
  }, []);

  const onState = useCallback((s: CroacState) => {
    hudRef.current?.set({ score: s.score, lives: s.lives, level: s.level });
  }, []);

  const onGameOver = useCallback((score: number) => setFinalScore(score), []);

  const onAutoPause = useCallback(() => setPaused(true), [setPaused]);

  const onTogglePause = useCallback(() => {
    const engine = engineRef.current;
    if (pausedRef.current) engine?.resume();
    else engine?.pause();
    setPaused(!pausedRef.current);
  }, [setPaused]);

  const onEnd = useCallback(() => {
    engineRef.current?.forceGameOver();
  }, []);

  const onRestart = useCallback(() => {
    setFinalScore(null);
    setPaused(false);
    engineRef.current?.restart();
  }, [setPaused]);

  // El mando táctil entra por la misma puerta que el teclado; estable para
  // que el mando no reciba una función nueva en cada render.
  const setKey = useCallback((code: string, down: boolean) => {
    engineRef.current?.setKey(code, down);
  }, []);
  const gamepad = useMemo(() => ({ setKey }), [setKey]);

  return (
    <PlayerShell
      game={game}
      hudRef={hudRef}
      finalScore={finalScore ?? undefined}
      paused={paused}
      over={finalScore !== null}
      onTogglePause={onTogglePause}
      onEnd={onEnd}
      onRestart={onRestart}
      gamepad={gamepad}
      skin={skin}
      onSkinChange={setSkin}
    >
      <CroacCanvas
        onState={onState}
        onGameOver={onGameOver}
        onEngineReady={onEngineReady}
        onAutoPause={onAutoPause}
        palette={palette}
      />
    </PlayerShell>
  );
}
