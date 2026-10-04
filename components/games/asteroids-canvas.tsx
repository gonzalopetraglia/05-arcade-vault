"use client";

import { useCallback, useEffect, useRef } from "react";
import { AsteroidsEngine, type AsteroidsState } from "@/lib/games/asteroids/engine";
import { H, W } from "@/lib/games/asteroids/entities";
import type { AsteroidsPalette } from "@/lib/games/asteroids/skins";

/** Teclas de juego: se les corta el scroll de la página mientras se juega. */
const GAME_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];

/**
 * Botón táctil: traduce pointerdown/pointerup/pointercancel a la misma entrada
 * de teclado que usa el motor. pointercancel y pointerleave se tratan como
 * pointerup para que ninguna tecla se quede pegada.
 */
function TouchButton({
  code,
  label,
  className,
  setKey,
  children,
}: {
  code: string;
  label: string;
  className: string;
  setKey: (code: string, down: boolean) => void;
  children: React.ReactNode;
}) {
  const release = () => setKey(code, false);
  return (
    <button
      type="button"
      className={className}
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
  onState: (s: AsteroidsState) => void;
  onGameOver: (finalScore: number) => void;
  /** Recibe el motor al montarse y `null` al desmontarse. */
  onEngineReady: (engine: AsteroidsEngine | null) => void;
  /** El juego se ha pausado solo (pestaña oculta o ventana sin foco). */
  onAutoPause: () => void;
  /**
   * Paleta de la skin activa. Aquí solo se usa para crear el motor y para el
   * fondo CSS previo al primer frame; los cambios posteriores los aplica el
   * player con `engine.setPalette`, sin remontar el canvas.
   */
  palette: AsteroidsPalette;
};

export function AsteroidsCanvas({
  onState,
  onGameOver,
  onEngineReady,
  onAutoPause,
  palette,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);
  // El efecto se monta una sola vez; los callbacks van por ref para que
  // cambiar de identidad en el padre no reinicie la partida.
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
    // el trazo vectorial de 1,5 px se ve borroso en pantallas Retina.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.getContext("2d")?.scale(dpr, dpr);

    const engine = new AsteroidsEngine(canvas, {
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
    // El tope de dt evita la espiral de la muerte, pero no evita morir
    // mientras se mira otra pestaña.
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
          background: palette.background,
          touchAction: "none",
        }}
      />
      <div className="touch-pad left">
        <TouchButton
          code="ArrowLeft"
          label="Rotar a la izquierda"
          className="touch-btn rot"
          setKey={setKey}
        >
          ◀
        </TouchButton>
        <TouchButton
          code="ArrowRight"
          label="Rotar a la derecha"
          className="touch-btn rot"
          setKey={setKey}
        >
          ▶
        </TouchButton>
      </div>
      <div className="touch-pad right">
        <TouchButton code="ArrowUp" label="Propulsar" className="touch-btn" setKey={setKey}>
          PROPULSAR
        </TouchButton>
        <TouchButton code="Space" label="Disparar" className="touch-btn" setKey={setKey}>
          DISPARAR
        </TouchButton>
      </div>
    </div>
  );
}
