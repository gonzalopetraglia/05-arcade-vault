"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AsteroidsCanvas } from "@/components/games/asteroids-canvas";
import { PlayerShell } from "@/components/player-shell";
import type { AsteroidsEngine, AsteroidsState } from "@/lib/games/asteroids/engine";
import { SKINS } from "@/lib/games/asteroids/skins";
import type { Game } from "@/lib/games";
import { useSkin } from "@/lib/use-skin";

const INITIAL: AsteroidsState = { score: 0, lives: 3, level: 1, status: "playing" };

/**
 * Player de ASTEROIDES: el único juego con motor de verdad. React manda sobre
 * el motor (PAUSA, FIN y JUGAR DE NUEVO), y el motor es la única fuente de
 * puntuación, vidas y nivel: aquí no se calcula ninguno de los tres.
 */
export function AsteroidsPlayer({ game }: { game: Game }) {
  const engineRef = useRef<AsteroidsEngine | null>(null);
  const [hud, setHud] = useState<AsteroidsState>(INITIAL);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const { skin, setSkin, scheme } = useSkin(game.id);
  const palette = SKINS[skin][scheme];

  // Skin o esquema del sistema cambian en caliente: el motor solo cambia de
  // colores, sin reiniciar la partida ni tocar puntuación, vidas o nivel.
  useEffect(() => {
    engineRef.current?.setPalette(palette);
  }, [palette]);

  const onEngineReady = useCallback((engine: AsteroidsEngine | null) => {
    engineRef.current = engine;
  }, []);

  const onState = useCallback((s: AsteroidsState) => setHud(s), []);

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
      skin={skin}
      onSkinChange={setSkin}
    >
      <AsteroidsCanvas
        onState={onState}
        onGameOver={onGameOver}
        onEngineReady={onEngineReady}
        onAutoPause={onAutoPause}
        palette={palette}
      />
    </PlayerShell>
  );
}
