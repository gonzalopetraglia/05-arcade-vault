"use client";

import type { PointerEvent, ReactNode } from "react";

/** Lo que un player le dice al mando. Las teclas son fijas; solo cambian las etiquetas. */
export type GamepadConfig = {
  /** Misma firma que `engine.setKey`: el dedo entra por la puerta de la tecla. */
  setKey: (code: string, down: boolean) => void;
  /** Etiqueta del botón A (emite "Space"). Sin etiqueta, A se ve atenuado y no emite. */
  a?: string;
  /** Etiqueta del botón B (emite "KeyX"). Sin etiqueta, B se ve atenuado y no emite. */
  b?: string;
};

function PadButton({
  code,
  label,
  className,
  setKey,
  off = false,
  children,
}: {
  code: string;
  label: string;
  className: string;
  setKey: GamepadConfig["setKey"];
  off?: boolean;
  children: ReactNode;
}) {
  const release = () => {
    if (!off) setKey(code, false);
  };
  return (
    <button
      type="button"
      className={off ? `${className} is-off` : className}
      aria-label={label}
      aria-disabled={off || undefined}
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        // El dedo captura el puntero por defecto y entonces `pointerleave` no
        // llega hasta levantarlo: se libera para que arrastrar fuera suelte
        // la tecla. `pointerup`/`pointercancel` siguen cubriendo el resto.
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        if (!off) setKey(code, true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      // Una pulsación larga abriría el menú contextual del navegador.
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

/**
 * Mando táctil común a todos los juegos: cruceta y dos botones de acción.
 * Emite los mismos códigos de tecla que el teclado, así que los motores no
 * saben si la pulsación viene de un dedo. Dos grupos (cruceta y acciones)
 * para que el CSS pueda separarlos a los lados en horizontal.
 */
export function TouchGamepad({ config }: { config: GamepadConfig }) {
  const { setKey, a, b } = config;
  return (
    <div className="touch-gamepad">
      <div className="gamepad-dpad">
        <PadButton code="ArrowUp" label="Arriba" className="pad-btn up" setKey={setKey}>
          <span className="pad-arrow" aria-hidden />
        </PadButton>
        <PadButton code="ArrowLeft" label="Izquierda" className="pad-btn left" setKey={setKey}>
          <span className="pad-arrow" aria-hidden />
        </PadButton>
        <PadButton code="ArrowRight" label="Derecha" className="pad-btn right" setKey={setKey}>
          <span className="pad-arrow" aria-hidden />
        </PadButton>
        <PadButton code="ArrowDown" label="Abajo" className="pad-btn down" setKey={setKey}>
          <span className="pad-arrow" aria-hidden />
        </PadButton>
      </div>
      <div className="gamepad-actions">
        <PadButton
          code="KeyX"
          label={b ? `B: ${b}` : "B: sin uso"}
          className="act-btn b"
          setKey={setKey}
          off={!b}
        >
          <span className="act-key">B</span>
          {b && <span className="act-label">{b}</span>}
        </PadButton>
        <PadButton
          code="Space"
          label={a ? `A: ${a}` : "A: sin uso"}
          className="act-btn a"
          setKey={setKey}
          off={!a}
        >
          <span className="act-key">A</span>
          {a && <span className="act-label">{a}</span>}
        </PadButton>
      </div>
    </div>
  );
}
