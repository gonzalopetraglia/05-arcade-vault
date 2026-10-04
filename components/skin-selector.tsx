"use client";

import { useRef, type KeyboardEvent, type MouseEvent } from "react";
import { SKIN_IDS, SKIN_LABELS, type SkinId } from "@/lib/skins";

/**
 * Teclas que el selector se queda cuando tiene el foco. Los juegos escuchan el
 * teclado en `window`; sin cortar la propagación, elegir skin con las flechas
 * también giraría la nave, y la barra espaciadora dispararía.
 */
const OWN_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", " ", "Enter"];

type Props = {
  value: SkinId;
  onChange: (id: SkinId) => void;
};

/**
 * Conmutador de skin del player, compartido por todos los juegos. Solo conoce
 * los ids y sus nombres: la paleta la resuelve cada player.
 *
 * Es un radiogroup con foco itinerante (una sola parada de Tab, flechas para
 * moverse), el patrón que un lector de pantalla espera para "una de tres".
 */
export function SkinSelector({ value, onChange }: Props) {
  const refs = useRef<Partial<Record<SkinId, HTMLButtonElement | null>>>({});

  const select = (id: SkinId, focus: boolean) => {
    if (id !== value) onChange(id);
    if (focus) refs.current[id]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!OWN_KEYS.includes(e.key)) return;
    // stopPropagation del evento de React corta también el nativo antes de
    // llegar a `window`, que es donde escucha el motor.
    e.stopPropagation();
    const i = SKIN_IDS.indexOf(value);
    const last = SKIN_IDS.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = i === last ? 0 : i + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = i === 0 ? last : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next !== null) {
      e.preventDefault();
      select(SKIN_IDS[next], true);
    }
  };

  const onClick = (id: SkinId, e: MouseEvent<HTMLButtonElement>) => {
    select(id, false);
    // Clic con ratón o dedo (detail > 0): se suelta el foco para que flechas y
    // espacio vuelvan a ser del juego. Con teclado (detail 0) el foco se queda
    // donde el usuario lo puso.
    if (e.detail > 0) e.currentTarget.blur();
  };

  return (
    <div className="skin-selector">
      <span className="skin-selector-label" id="skin-selector-label">
        Skin
      </span>
      <div
        className="skin-selector-group"
        role="radiogroup"
        aria-labelledby="skin-selector-label"
        onKeyDown={onKeyDown}
        onKeyUp={(e) => {
          if (OWN_KEYS.includes(e.key)) e.stopPropagation();
        }}
      >
        {SKIN_IDS.map((id) => {
          const checked = id === value;
          return (
            <button
              key={id}
              ref={(el) => {
                refs.current[id] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              className={`skin-opt skin-opt-${id}`}
              onClick={(e) => onClick(id, e)}
            >
              <span className="skin-swatch" aria-hidden="true" />
              {SKIN_LABELS[id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
