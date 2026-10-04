/**
 * Paletas de ASTEROIDES: cada color que el motor pinta sale de aquí.
 *
 * CLÁSICO.dark reproduce al carácter los literales del port original (blanco
 * vectorial sobre negro, power-up cian, llama naranja), así que el juego por
 * defecto se ve igual que antes de las skins. Los ratios de contraste de cada
 * paleta están medidos con WCAG 2.x contra su `background`: piezas jugables
 * ≥ 3:1 y texto del canvas ≥ 4.5:1.
 */

import type { SkinSet } from "@/lib/skins";

export type AsteroidsPalette = {
  /** Relleno del canvas en cada frame y fondo CSS antes del primer frame. */
  background: string;
  ship: string;
  /** Llama del propulsor; admite alfa porque en el original es translúcida. */
  thrust: string;
  bullet: string;
  asteroid: string;
  /** Rombo del power-up y su rótulo "3x": se mide como texto. */
  powerUp: string;
  /** Hex sin alfa: la partícula le aplica su propia opacidad al apagarse. */
  particle: string;
  hudText: string;
  lifeIcon: string;
  /** Contador del triple disparo en el HUD del canvas. */
  hudAccent: string;
  overlayTitle: string;
  overlaySub: string;
  /**
   * `shadowBlur` de los trazos. No es un color, pero es la otra mitad de la
   * estética NEON y cambia con la skin igual que ellos; 0 lo apaga.
   */
  glowBlur: number;
};

export const SKINS: SkinSet<AsteroidsPalette> = {
  clasico: {
    // Papel y tinta: el mismo dibujo vectorial monocromo, invertido. El cian
    // del power-up se oscurece a petróleo porque #0ff sobre claro no llega a 2:1.
    light: {
      background: "#f2f1ea",
      ship: "#111111",
      thrust: "rgba(196, 72, 0, 0.9)",
      bullet: "#111111",
      asteroid: "#111111",
      powerUp: "#00707a",
      particle: "#111111",
      hudText: "#111111",
      lifeIcon: "#111111",
      hudAccent: "#00707a",
      overlayTitle: "#111111",
      overlaySub: "rgba(17,17,17,0.7)",
      glowBlur: 0,
    },
    // Literales exactos del motor antes de las skins: no "mejorar".
    dark: {
      background: "#000",
      ship: "#fff",
      thrust: "rgba(255, 130, 0, 0.85)",
      bullet: "#fff",
      asteroid: "#fff",
      powerUp: "#0ff",
      particle: "#ffffff",
      hudText: "#fff",
      lifeIcon: "#fff",
      hudAccent: "#0ff",
      overlayTitle: "#fff",
      overlaySub: "rgba(255,255,255,0.65)",
      glowBlur: 0,
    },
  },
  neon: {
    // Neón de día: tintas saturadas y profundas sobre lavanda pálida. El glow
    // se queda corto (8) porque en claro un halo grande ensucia más que brilla.
    light: {
      background: "#f4effc",
      ship: "#0050d8",
      thrust: "rgba(214, 80, 0, 0.9)",
      bullet: "#6a00d4",
      asteroid: "#c8007f",
      powerUp: "#007a43",
      particle: "#b34700",
      hudText: "#1a1033",
      lifeIcon: "#0050d8",
      hudAccent: "#007a43",
      overlayTitle: "#c8007f",
      overlaySub: "rgba(26,16,51,0.75)",
      glowBlur: 8,
    },
    // Tubo CRT: cada tipo de pieza con su tono de la marca (cian la nave,
    // magenta las rocas, amarillo las balas, verde el power-up), de modo que
    // se distinguen por color y no solo por forma.
    dark: {
      background: "#07040f",
      ship: "#00f5ff",
      thrust: "rgba(255, 140, 0, 0.9)",
      bullet: "#f5ff00",
      asteroid: "#ff2bd6",
      powerUp: "#39ff88",
      particle: "#ffb347",
      hudText: "#e6e9ff",
      lifeIcon: "#00f5ff",
      hudAccent: "#39ff88",
      overlayTitle: "#ff2bd6",
      overlaySub: "rgba(230,233,255,0.72)",
      glowBlur: 12,
    },
  },
  retro: {
    // CGA de baja intensidad sobre blanco: 5 colores, todo plano.
    light: {
      background: "#ffffff",
      ship: "#000000",
      thrust: "#aa5500",
      bullet: "#000000",
      asteroid: "#0000aa",
      powerUp: "#aa00aa",
      particle: "#0000aa",
      hudText: "#000000",
      lifeIcon: "#000000",
      hudAccent: "#aa00aa",
      overlayTitle: "#000000",
      overlaySub: "#0000aa",
      glowBlur: 0,
    },
    // CGA paleta 1 de alta intensidad: 5 colores, sin alfa ni glow.
    dark: {
      background: "#000000",
      ship: "#ffffff",
      thrust: "#ffff55",
      bullet: "#ffffff",
      asteroid: "#55ffff",
      powerUp: "#ff55ff",
      particle: "#55ffff",
      hudText: "#ffffff",
      lifeIcon: "#ffffff",
      hudAccent: "#ff55ff",
      overlayTitle: "#ffffff",
      overlaySub: "#55ffff",
      glowBlur: 0,
    },
  },
};

/**
 * Convierte un hex a `rgba(r,g,b,a)` con el mismo formato que usaba la
 * partícula original (`rgba(255,255,255,0.50)`), para que CLÁSICO no cambie
 * ni un carácter de lo que recibe el canvas.
 */
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
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}
