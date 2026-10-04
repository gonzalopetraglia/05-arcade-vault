/**
 * Paletas de ARKANOID: cada color que el motor pinta sale de aquí.
 *
 * ARKANOID pinta casi todo con el spritesheet, así que una skin decide también
 * *cómo* se dibujan ladrillos, paleta y pelota:
 *   - `sprite`: el PNG intacto, como el original. Es CLÁSICO, y en oscuro
 *     reproduce al carácter lo que el juego pintaba antes de las skins.
 *   - `flat`: rectángulos y círculos con los colores de la paleta, en las
 *     mismas cajas (mismas hitboxes). Es NEON y RETRO: tintar el PNG con
 *     `ctx.filter` no llega a Safari, y un sprite tintado no se puede medir.
 *
 * Ratios medidos con WCAG 2.x contra `background`: piezas jugables ≥ 3:1.
 * En modo `sprite` lo que se mide es el contorno negro que el propio sprite
 * trae dibujado (ver notas de CLÁSICO).
 */

import type { SkinSet } from "@/lib/skins";
import type { BlockColor } from "./entities";

export type ArkanoidPalette = {
  /** Relleno del canvas en cada frame y fondo CSS antes del primer frame. */
  background: string;
  /** `sprite` pinta el spritesheet; `flat`, formas planas con esta paleta. */
  render: "sprite" | "flat";
  /**
   * Un color por tipo de ladrillo. En `sprite` describen el tono medio de
   * cada sprite (sirven para medir, el PNG manda); en `flat` son el trazo.
   */
  blocks: Record<BlockColor, string>;
  /**
   * Opacidad del interior del ladrillo en `flat`. NEON lo deja translúcido y
   * enciende el borde; RETRO lo rellena entero porque no admite mezclas.
   */
  blockFillAlpha: number;
  /** Junta entre ladrillos en `flat`: separa dos vecinos del mismo color. */
  blockEdge: string;
  paddle: string;
  /** Topes de los extremos de la paleta, como los remates rojos del sprite. */
  paddleCap: string;
  ball: string;
  /** `shadowBlur` de las formas planas; 0 lo apaga (y no aplica a `sprite`). */
  glowBlur: number;
};

export const SKINS: SkinSet<ArkanoidPalette> = {
  clasico: {
    // El mismo spritesheet sobre papel. Los sprites traen un contorno negro de
    // 1 px que es lo que los recorta contra el fondo claro (≥ 15:1); los
    // rellenos amarillo y turquesa, por sí solos, quedan por debajo de 3:1.
    light: {
      background: "#efede6",
      render: "sprite",
      blocks: {
        red: "#a42b3f",
        yellow: "#b69b45",
        cyan: "#49ab8d",
        magenta: "#5c2ec6",
        hotpink: "#d06525",
        green: "#498ed5",
        gray: "#40404c",
      },
      blockFillAlpha: 1,
      blockEdge: "#000000",
      paddle: "#aa979b",
      paddleCap: "#c8323c",
      ball: "#9897a0",
      glowBlur: 0,
    },
    // Literal exacto del motor antes de las skins (`#000` y sprites): no
    // "mejorar". El ladrillo gris del nivel 2 ya era oscuro sobre negro en el
    // original; se ve por sus brillos y su contorno.
    dark: {
      background: "#000",
      render: "sprite",
      blocks: {
        red: "#a42b3f",
        yellow: "#b69b45",
        cyan: "#49ab8d",
        magenta: "#5c2ec6",
        hotpink: "#d06525",
        green: "#498ed5",
        gray: "#40404c",
      },
      blockFillAlpha: 1,
      blockEdge: "#000000",
      paddle: "#aa979b",
      paddleCap: "#c8323c",
      ball: "#9897a0",
      glowBlur: 0,
    },
  },
  neon: {
    // Neón de día: tintas profundas sobre lavanda pálida, interior lavado y
    // borde lleno. Glow corto: en claro un halo grande ensucia más que brilla.
    light: {
      background: "#f4effc",
      render: "flat",
      blocks: {
        red: "#c8102e",
        yellow: "#8a6200",
        cyan: "#00708a",
        magenta: "#7a1fd0",
        hotpink: "#c4126e",
        green: "#00803a",
        gray: "#4a5068",
      },
      blockFillAlpha: 0.22,
      blockEdge: "#f4effc",
      paddle: "#0050d8",
      paddleCap: "#c4126e",
      ball: "#1a0a2e",
      glowBlur: 6,
    },
    // Tubo CRT: cada fila con su tubo de color. El borde ya pasa 3:1 sin el
    // glow; el halo solo añade la estética.
    dark: {
      background: "#06030c",
      render: "flat",
      blocks: {
        red: "#ff3b5c",
        yellow: "#ffe94d",
        cyan: "#22f2ff",
        magenta: "#b45cff",
        hotpink: "#ff4fb8",
        green: "#39ff88",
        gray: "#9aa3c0",
      },
      blockFillAlpha: 0.28,
      blockEdge: "#06030c",
      paddle: "#22f2ff",
      paddleCap: "#ff4fb8",
      ball: "#ffffff",
      glowBlur: 12,
    },
  },
  retro: {
    // Game Boy en su pantalla verde clara: 5 colores, todo plano. Los siete
    // tipos de ladrillo caen en 4 tonos repartidos para que dos filas vecinas
    // de cualquier nivel nunca compartan tono (yellow, cyan, magenta y hotpink
    // son vecinos dos a dos en algún nivel, por eso hacen falta 4). Entre dos
    // tonos consecutivos hay ≥ 1.6:1, y el más tenue roza el 3:1 (3.11).
    light: {
      background: "#dfeeb8",
      render: "flat",
      blocks: {
        yellow: "#0e1607",
        cyan: "#2c4414",
        green: "#2c4414",
        magenta: "#44691e",
        red: "#44691e",
        hotpink: "#5d902a",
        gray: "#5d902a",
      },
      blockFillAlpha: 1,
      blockEdge: "#dfeeb8",
      paddle: "#0e1607",
      paddleCap: "#44691e",
      ball: "#0e1607",
      glowBlur: 0,
    },
    // La misma pantalla apagada: fondo casi negro y tonos que suben hacia el
    // verde pálido. Mismo reparto de tonos por tipo que en claro.
    dark: {
      background: "#0c160c",
      render: "flat",
      blocks: {
        yellow: "#cdf0a0",
        cyan: "#8ec560",
        green: "#8ec560",
        magenta: "#6c9549",
        red: "#6c9549",
        hotpink: "#4e6c35",
        gray: "#4e6c35",
      },
      blockFillAlpha: 1,
      blockEdge: "#0c160c",
      paddle: "#cdf0a0",
      paddleCap: "#6c9549",
      ball: "#cdf0a0",
      glowBlur: 0,
    },
  },
};

/** `#rrggbb` o `#rgb` a `rgba(...)`, para el interior translúcido de NEON. */
export function withAlpha(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
