/**
 * Paletas de SNAKE: cada color que el motor pinta sale de aquí.
 *
 * CLÁSICO.dark reproduce al carácter los literales previos a las skins (verde
 * del tema #00ff88 sobre negro, cabeza verde claro, rejilla al 8 %), así que el
 * juego por defecto se ve igual que antes. Los ratios están medidos con WCAG
 * 2.x contra su `background`: serpiente y fruta ≥ 3:1, rejilla entre 1.2:1 y
 * 2:1 (salvo CLÁSICO.dark, que conserva su rejilla original de 1.10:1).
 *
 * Las frutas son recortes PNG del atlas y no se tintan: son pequeñas, muy
 * saturadas y se leen igual sobre cualquier fondo. `fruitFallback` solo se usa
 * si el atlas no carga.
 */

import type { SkinSet } from "@/lib/skins";

export type SnakePalette = {
  /** Relleno del canvas en cada frame y fondo CSS antes del primer frame. */
  background: string;
  /** Líneas de la rejilla; admite alfa porque es decorado tenue. */
  grid: string;
  snakeBody: string;
  /** Distinta del cuerpo para que se lea hacia dónde va la serpiente. */
  snakeHead: string;
  /** Círculo que sustituye a la fruta cuando el atlas no carga. */
  fruitFallback: string;
  /**
   * `shadowBlur` de la serpiente. No es un color, pero es la otra mitad de la
   * estética NEON y cambia con la skin igual que ellos; 0 lo apaga.
   */
  glowBlur: number;
};

export const SKINS: SkinSet<SnakePalette> = {
  clasico: {
    // El mismo verde del tema oscurecido hasta pasar 3:1 sobre papel; la
    // cabeza se invierte (más oscura que el cuerpo) para seguir destacando.
    light: {
      background: "#f2f1ea", // ← lum 0.877
      grid: "rgba(0, 110, 60, 0.16)", // 1.26:1
      snakeBody: "#00804a", // 4.43:1
      snakeHead: "#003d22", // 10.97:1 · cabeza/cuerpo 2.48:1
      fruitFallback: "#00804a",
      glowBlur: 0,
    },
    // Literales exactos del motor antes de las skins: no "mejorar".
    dark: {
      background: "#000",
      grid: "rgba(0, 255, 136, 0.08)", // 1.10:1, la del original
      snakeBody: "#00ff88", // 15.66:1
      snakeHead: "#b6ffd9", // 18.29:1 · cabeza/cuerpo 1.17:1, por brillo
      fruitFallback: "#00ff88",
      glowBlur: 0,
    },
  },
  neon: {
    // Neón de día: magenta profundo con cabeza violeta casi negra y rejilla
    // lila. Glow corto, porque en claro un halo grande ensucia más que brilla.
    light: {
      background: "#f4effc",
      grid: "rgba(106, 0, 212, 0.14)", // 1.30:1
      snakeBody: "#c8007f", // 4.94:1
      snakeHead: "#3d0066", // 13.38:1 · cabeza/cuerpo 2.71:1
      fruitFallback: "#0050d8", // 5.93:1
      glowBlur: 6,
    },
    // Tubo CRT: serpiente verde fósforo con cabeza casi blanca (el punto más
    // caliente del haz) y rejilla cian, sobre un negro con un punto de violeta.
    dark: {
      background: "#07040f",
      grid: "rgba(0, 245, 255, 0.14)", // 1.29:1
      snakeBody: "#00d26a", // 10.09:1
      snakeHead: "#eafff4", // 19.46:1 · cabeza/cuerpo 1.93:1
      fruitFallback: "#ff2bd6", // 6.36:1
      glowBlur: 14,
    },
  },
  retro: {
    // Game Boy en negativo: los mismos cuatro verdes, del más claro al fondo.
    light: {
      background: "#e0f8d0",
      grid: "#b4d09c", // 1.49:1
      snakeBody: "#306230", // 6.35:1
      snakeHead: "#0f380f", // 11.62:1 · cabeza/cuerpo 1.83:1
      fruitFallback: "#0f380f",
      glowBlur: 0,
    },
    // Game Boy DMG: cuatro verdes planos, sin alfa ni glow.
    dark: {
      background: "#0f380f",
      grid: "#306230", // 1.83:1
      snakeBody: "#8bac0f", // 5.03:1
      snakeHead: "#e0f8d0", // 11.62:1 · cabeza/cuerpo 2.31:1
      fruitFallback: "#e0f8d0",
      glowBlur: 0,
    },
  },
};
