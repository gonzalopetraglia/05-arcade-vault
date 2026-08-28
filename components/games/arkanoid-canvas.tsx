"use client";

import { useCallback, useEffect, useRef } from "react";
import { ArkanoidEngine, type ArkanoidState } from "@/lib/games/arkanoid/engine";
import { H, W } from "@/lib/games/arkanoid/entities";

/** Teclas de juego: se les corta el scroll de la página mientras se juega. */
const GAME_KEYS = ["ArrowLeft", "ArrowRight"];

/**
 * Botón táctil: traduce pointerdown/pointerup/pointercancel a la misma entrada
 * de teclado que usa el motor, así que el dedo y la tecla son indistinguibles.
 * pointercancel y pointerleave se tratan como pointerup para que ninguna tecla
 * se quede pegada.
 */
function TouchButton({
  code,
  label,
  setKey,
  children,
}: {
  code: string;
  label: string;
  setKey: (code: string, down: boolean) => void;
  children: React.ReactNode;
}) {
  const release = () => setKey(code, false);
  return (
    <button
      type="button"
      className="touch-btn rot"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        setKey(code, true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
    >
      {children}
    </button>
  );
}

type Props = {
  onState: (s: ArkanoidState) => void;
  onGameOver: (finalScore: number) => void;
  /** Recibe el motor al montarse y `null` al desmontarse. */
  onEngineReady: (engine: ArkanoidEngine | null) => void;
  /** El juego se ha pausado solo (pestaña oculta o ventana sin foco). */
  onAutoPause: () => void;
};

export function ArkanoidCanvas({ onState, onGameOver, onEngineReady, onAutoPause }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ArkanoidEngine | null>(null);
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
    // los sprites se ven borrosos en pantallas Retina.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.getContext("2d")?.scale(dpr, dpr);

    const engine = new ArkanoidEngine(canvas, {
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
    // El factor es W / rect.width, no canvas.width / rect.width: canvas.width ya
    // lleva el devicePixelRatio multiplicado y doblaría la conversión.
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      engine.setPaddleX((e.clientX - rect.left) * (W / rect.width));
    };
    // El motor no topa dt, así que una pestaña oculta acumularía un salto enorme
    // y la pelota atravesaría la paleta.
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
    canvas.addEventListener("mousemove", onMouseMove);

    engine.start();
    engineRef.current = engine;
    cbs.current.onEngineReady(engine);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("mousemove", onMouseMove);
      // Sin esto, el doble montaje de React en desarrollo deja dos bucles
      // requestAnimationFrame corriendo a la vez y el juego va al doble.
      engine.destroy();
      engineRef.current = null;
      cbs.current.onEngineReady(null);
    };
  }, []);

  // El dedo entra por la misma puerta que la tecla: el motor no distingue.
  const setKey = useCallback((code: string, down: boolean) => {
    engineRef.current?.setKey(code, down);
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          aspectRatio: "4 / 3",
          background: "#000",
          touchAction: "none",
        }}
      />
      <div className="touch-pad left">
        <TouchButton code="ArrowLeft" label="Mover a la izquierda" setKey={setKey}>
          ◀
        </TouchButton>
      </div>
      <div className="touch-pad right">
        <TouchButton code="ArrowRight" label="Mover a la derecha" setKey={setKey}>
          ▶
        </TouchButton>
      </div>
    </div>
  );
}
