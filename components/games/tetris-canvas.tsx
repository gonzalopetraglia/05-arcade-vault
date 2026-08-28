"use client";

import { useCallback, useEffect, useRef } from "react";
import { TetrisEngine, type TetrisState } from "@/lib/games/tetris/engine";
import { H, NEXT_H, NEXT_W, W } from "@/lib/games/tetris/entities";

/** Teclas de juego: se les corta el scroll de la página mientras se juega. */
const GAME_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyX"];

/**
 * Botón táctil: traduce pointerdown/pointerup/pointercancel a la misma entrada
 * de teclado que usa el motor, así que el dedo hereda el DAS de las teclas.
 * pointercancel y pointerleave se tratan como pointerup para que ninguna tecla
 * se quede pegada.
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
  onState: (s: TetrisState) => void;
  onGameOver: (finalScore: number) => void;
  /** Recibe el motor al montarse y `null` al desmontarse. */
  onEngineReady: (engine: TetrisEngine | null) => void;
  /** El juego se ha pausado solo (pestaña oculta o ventana sin foco). */
  onAutoPause: () => void;
};

export function TetrisCanvas({ onState, onGameOver, onEngineReady, onAutoPause }: Props) {
  const boardRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TetrisEngine | null>(null);
  // El efecto se monta una sola vez; los callbacks van por ref para que
  // cambiar de identidad en el padre no reinicie la partida.
  const cbs = useRef({ onState, onGameOver, onEngineReady, onAutoPause });
  useEffect(() => {
    cbs.current = { onState, onGameOver, onEngineReady, onAutoPause };
  });

  useEffect(() => {
    const board = boardRef.current;
    const next = nextRef.current;
    if (!board || !next) return;

    // Búferes fijos (300×600 y 120×120) multiplicados por la densidad de
    // pantalla: sin esto los bloques se ven borrosos en pantallas Retina.
    const dpr = window.devicePixelRatio || 1;
    board.width = W * dpr;
    board.height = H * dpr;
    board.getContext("2d")?.scale(dpr, dpr);
    next.width = NEXT_W * dpr;
    next.height = NEXT_H * dpr;
    next.getContext("2d")?.scale(dpr, dpr);

    const engine = new TetrisEngine(board, next, {
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
    // El motor no topa dt, así que una pestaña oculta acumularía un dropAccum
    // gigante y soltaría varias piezas de golpe al volver.
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
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* El tablero es 1:2 y la pantalla del CRT es 4:3: se ajusta por altura y
          se centra en horizontal, para no deformar el mundo de 300×600. */}
      <div style={{ position: "relative", height: "100%", aspectRatio: "1 / 2" }}>
        <canvas
          ref={boardRef}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            background: "#000",
            touchAction: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "1.5%",
            right: "3%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              font: "600 9px/1 monospace",
              letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            SIGUIENTE
          </span>
          <canvas
            ref={nextRef}
            style={{
              display: "block",
              width: "72px",
              maxWidth: "26vw",
              aspectRatio: "1 / 1",
              background: "rgba(0,0,0,0.65)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          />
        </div>
      </div>
      <div className="touch-pad left">
        <TouchButton
          code="ArrowLeft"
          label="Mover a la izquierda"
          className="touch-btn rot"
          setKey={setKey}
        >
          ◀
        </TouchButton>
        <TouchButton
          code="ArrowRight"
          label="Mover a la derecha"
          className="touch-btn rot"
          setKey={setKey}
        >
          ▶
        </TouchButton>
        <TouchButton
          code="ArrowDown"
          label="Bajada suave"
          className="touch-btn rot"
          setKey={setKey}
        >
          ▼
        </TouchButton>
      </div>
      <div className="touch-pad right">
        <TouchButton code="ArrowUp" label="Rotar" className="touch-btn" setKey={setKey}>
          ROTAR
        </TouchButton>
        <TouchButton code="Space" label="Caída dura" className="touch-btn" setKey={setKey}>
          SOLTAR
        </TouchButton>
      </div>
    </div>
  );
}
