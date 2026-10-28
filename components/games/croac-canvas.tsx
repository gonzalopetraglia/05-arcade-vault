"use client";

import { useEffect, useRef } from "react";
import { CroacEngine, type CroacState } from "@/lib/games/croac/engine";
import { COLORS, H, W } from "@/lib/games/croac/entities";

/** Teclas de juego: se les corta el scroll de la página mientras se juega. */
const GAME_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];

type Props = {
  onState: (s: CroacState) => void;
  onGameOver: (finalScore: number) => void;
  /** Recibe el motor al montarse y `null` al desmontarse. */
  onEngineReady: (engine: CroacEngine | null) => void;
  /** El juego se ha pausado solo (pestaña oculta o ventana sin foco). */
  onAutoPause: () => void;
};

export function CroacCanvas({ onState, onGameOver, onEngineReady, onAutoPause }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // El efecto se monta una sola vez; los callbacks van por ref para que cambiar
  // de identidad en el padre no reinicie la partida.
  const cbs = useRef({ onState, onGameOver, onEngineReady, onAutoPause });
  useEffect(() => {
    cbs.current = { onState, onGameOver, onEngineReady, onAutoPause };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Búfer fijo de 800×600 multiplicado por la densidad de pantalla: sin esto
    // el dibujo se ve borroso en pantallas Retina.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.getContext("2d")?.scale(dpr, dpr);

    const engine = new CroacEngine(canvas, {
      onState: (s) => cbs.current.onState(s),
      onGameOver: (s) => cbs.current.onGameOver(s),
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
          background: COLORS.waterDeep,
          touchAction: "none",
        }}
      />
    </div>
  );
}
