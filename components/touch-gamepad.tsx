"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

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
  // Si la tecla está pulsada por este botón: evita soltarla dos veces
  // (al salir y luego al levantar el dedo).
  const held = useRef(false);
  const release = () => {
    if (!held.current) return;
    held.current = false;
    setKey(code, false);
  };
  return (
    <button
      type="button"
      className={off ? `${className} is-off` : className}
      aria-label={label}
      aria-disabled={off || undefined}
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (off) return;
        held.current = true;
        setKey(code, true);
      }}
      // El dedo captura el puntero y Chrome no deja liberarlo: `pointerleave`
      // no llega hasta levantarlo. Se mira a mano si el dedo sigue encima,
      // para que arrastrar fuera suelte la tecla.
      onPointerMove={(e: PointerEvent<HTMLButtonElement>) => {
        if (!held.current) return;
        const r = e.currentTarget.getBoundingClientRect();
        const inside =
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom;
        if (!inside) release();
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
