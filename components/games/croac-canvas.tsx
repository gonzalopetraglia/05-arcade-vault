"use client";

import { useEffect, useRef } from "react";
import { CroacEngine, type CroacState } from "@/lib/games/croac/engine";
import { H, W } from "@/lib/games/croac/entities";
import type { CroacPalette } from "@/lib/games/croac/skins";

/**
 * Tope de densidad del búfer. A ojo no se distingue 2 de 3 en un canvas de
 * 800×600 escalado, y con dpr 3 serían 2,25× más píxeles por frame.
 */
const MAX_DPR = 2;

/** Teclas de juego: se les corta el scroll de la página mientras se juega. */
const GAME_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];

type Props = {
  onState: (s: CroacState) => void;
  onGameOver: (finalScore: number) => void;
  /** Recibe el motor al montarse y `null` al desmontarse. */
  onEngineReady: (engine: CroacEngine | null) => void;
  /** El juego se ha pausado solo (pestaña oculta o ventana sin foco). */
  onAutoPause: () => void;
  /**
   * Paleta de la skin activa. Aquí solo se usa para crear el motor y para el
   * fondo CSS previo al primer frame; los cambios posteriores los aplica el
   * player con `engine.setPalette`, sin remontar el canvas.
   */
  palette: CroacPalette;
};

export function CroacCanvas({ onState, onGameOver, onEngineReady, onAutoPause, palette }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    // el dibujo se ve borroso en pantallas Retina.
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    // Opaco: el fondo del juego cubre siempre todo el canvas, y el navegador se
    // ahorra componer transparencia. El motor recibe este mismo contexto.
    canvas.getContext("2d", { alpha: false })?.scale(dpr, dpr);

    const engine = new CroacEngine(canvas, {
      onState: (s) => cbs.current.onState(s),
      onGameOver: (s) => cbs.current.onGameOver(s),
      palette: initialPalette.current,
      dpr,
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (GAME_KEYS.includes(e.code)) e.preventDefault();
      engine.setKey(e.code, true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (GAME_KEYS.includes(e.code)) e.preventDefault();
      engine.setKey(e.code, false);
    };
    // dt está topado a 0,1 s, pero una pestaña oculta seguiría moviendo el
    // tráfico sin que nadie mire: se pausa y el shell lo refleja en el HUD.
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
    cbs.current.onEngineReady(engine);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      // Sin esto, el doble montaje de React en desarrollo deja dos bucles
      // requestAnimationFrame corriendo a la vez y el juego va al doble.
      engine.destroy();
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
          background: palette.waterDeep,
          touchAction: "none",
        }}
      />
    </div>
  );
}
