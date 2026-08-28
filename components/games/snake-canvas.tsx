"use client";

import { useCallback, useEffect, useRef } from "react";
import { SnakeEngine, type SnakeState } from "@/lib/games/snake/engine";
import { H, W } from "@/lib/games/snake/entities";

/** Teclas de juego: se les corta el scroll de la página mientras se juega. */
const GAME_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];

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
  onState: (s: SnakeState) => void;
  onGameOver: (finalScore: number) => void;
  /** Recibe el motor al montarse y `null` al desmontarse. */
  onEngineReady: (engine: SnakeEngine | null) => void;
  /** El juego se ha pausado solo (pestaña oculta o ventana sin foco). */
  onAutoPause: () => void;
};

export function SnakeCanvas({ onState, onGameOver, onEngineReady, onAutoPause }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnakeEngine | null>(null);
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

    const engine = new SnakeEngine(canvas, {
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
      {/* Cruceta repartida en los dos pads que ya existen: horizontales a la
          izquierda, verticales a la derecha. Ninguna clase CSS nueva. */}
      <div className="touch-pad left">
        <TouchButton code="ArrowLeft" label="Girar a la izquierda" setKey={setKey}>
          ◀
        </TouchButton>
        <TouchButton code="ArrowRight" label="Girar a la derecha" setKey={setKey}>
          ▶
        </TouchButton>
      </div>
      <div className="touch-pad right">
        <TouchButton code="ArrowUp" label="Girar hacia arriba" setKey={setKey}>
          ▲
        </TouchButton>
        <TouchButton code="ArrowDown" label="Girar hacia abajo" setKey={setKey}>
          ▼
        </TouchButton>
      </div>
    </div>
  );
}
