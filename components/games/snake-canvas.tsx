"use client";

import { useEffect, useRef } from "react";
import { SnakeEngine, type SnakeState } from "@/lib/games/snake/engine";
import { H, W } from "@/lib/games/snake/entities";
import type { SnakePalette } from "@/lib/games/snake/skins";

/** Teclas de juego: se les corta el scroll de la página mientras se juega. */
const GAME_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];

type Props = {
  onState: (s: SnakeState) => void;
  onGameOver: (finalScore: number) => void;
  /** Recibe el motor al montarse y `null` al desmontarse. */
  onEngineReady: (engine: SnakeEngine | null) => void;
  /** El juego se ha pausado solo (pestaña oculta o ventana sin foco). */
  onAutoPause: () => void;
  /**
   * Paleta de la skin activa. Aquí solo se usa para crear el motor y para el
   * fondo CSS previo al primer frame; los cambios posteriores los aplica el
   * player con `engine.setPalette`, sin remontar el canvas.
   */
  palette: SnakePalette;
};

export function SnakeCanvas({ onState, onGameOver, onEngineReady, onAutoPause, palette }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnakeEngine | null>(null);
  // El efecto se monta una sola vez; los callbacks van por ref para que cambiar
  // de identidad en el padre no reinicie la partida.
  const cbs = useRef({ onState, onGameOver, onEngineReady, onAutoPause });
  useEffect(() => {
    cbs.current = { onState, onGameOver, onEngineReady, onAutoPause };
  });
  // Por ref por el mismo motivo: el motor nace con la paleta del momento y no
  // debe recrearse (perdiendo la partida) cuando cambia la skin.
  const initialPalette = useRef(palette);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Búfer fijo de 800×600 multiplicado por la densidad de pantalla: sin esto
    // los sprites se ven borrosos en pantallas Retina.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.getContext("2d")?.scale(dpr, dpr);

    const engine = new SnakeEngine(canvas, {
      onState: (s) => cbs.current.onState(s),
      onGameOver: (s) => cbs.current.onGameOver(s),
      palette: initialPalette.current,
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (GAME_KEYS.includes(e.code)) e.preventDefault();
      engine.setKey(e.code, true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (GAME_KEYS.includes(e.code)) e.preventDefault();
      engine.setKey(e.code, false);
    };
    // dt está topado a 100 ms, pero una pestaña oculta seguiría avanzando tics
    // sin que nadie mire: se pausa y el shell lo refleja en el HUD.
    const onVisibility = () => {
      if (document.hidden) {
        engine.pause();
        cbs.current.onAutoPause();
      }
    };
    const onBlur = () => {
      engine.pause();
      cbs.current.onAutoPause();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);

    engine.start();
    engineRef.current = engine;
    cbs.current.onEngineReady(engine);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      // Sin esto, el doble montaje de React en desarrollo deja dos bucles
      // requestAnimationFrame corriendo a la vez y el juego va al doble.
      engine.destroy();
      engineRef.current = null;
      cbs.current.onEngineReady(null);
    };
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          aspectRatio: "4 / 3",
          background: palette.background,
          touchAction: "none",
        }}
      />
    </div>
  );
}
