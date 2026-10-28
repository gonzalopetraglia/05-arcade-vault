/**
 * Paletas de CROAC: cada color que el motor pinta sale de aquí.
 *
 * CLÁSICO.dark reproduce al carácter el antiguo `COLORS` de entities.ts, así
 * que el juego por defecto se ve igual que antes de las skins. Los ratios están
 * medidos con WCAG 2.x: piezas y rana ≥ 3:1 contra la zona en la que viven
 * (agua, asfalto u orilla) y decorado entre 1.2:1 y 2:1. No hay texto en el
 * canvas: el HUD es de React.
 *
 * No hay sprites: todo son formas planas, así que cambiar de skin es solo
 * cambiar estos valores.
 */

import type { SkinSet } from "@/lib/skins";

export type CroacPalette = {
  /** Río; también el agua bajo troncos y hojas. */
  water: string;
  /** Fila de los nenúfares y fondo CSS del canvas antes del primer frame. */
  waterDeep: string;
  /** Ondas fijas del río: decorado tenue. */
  ripple: string;
  asphalt: string;
  /** Líneas discontinuas entre carriles: decorado tenue. */
  laneMark: string;
  /** Orillas seguras (la del medio y la de salida). */
  grass: string;
  grassEdge: string;
  car: string;
  /** Coches alternos del mismo carril, para que no parezcan un tren. */
  carAlt: string;
  truck: string;
  window: string;
  log: string;
  logGrain: string;
  leaf: string;
  /** Aviso antes de hundirse: tiene que cambiar mucho respecto a `leaf`. */
  leafWarn: string;
  /** Contorno tenue de la hoja hundida. */
  leafSunk: string;
  lily: string;
  frog: string;
  frogBelly: string;
  frogEye: string;
  frogPupil: string;
  frogDead: string;
  /**
   * `shadowBlur` de rana, vehículos, hojas y nenúfares. No es un color, pero es
   * la otra mitad de la estética NEON y cambia con la skin igual que ellos;
   * 0 lo apaga.
   */
  glowBlur: number;
};

export const SKINS: SkinSet<CroacPalette> = {
  clasico: {
    // Los mismos tonos de día: agua y asfalto claros, piezas oscurecidas hasta
    // pasar 3:1. La hoja de aviso vira a ámbar oscuro en vez de aclararse,
    // porque una hoja pálida sobre agua pálida desaparecería.
    // Críticos: carAlt/asfalto 3.51 · hoja/agua 3.38 · coche/carAlt 1.53 ·
    // hoja/aviso 1.55 · rana/tronco 1.78.
    light: {
      water: "#cfe4f5",
      waterDeep: "#b7d5ee",
      ripple: "#9ec3e3",
      asphalt: "#dedde6",
      laneMark: "#aeadbd",
      grass: "#cfeac7",
      grassEdge: "#a3d496",
      car: "#b0003a",
      carAlt: "#9a6a00",
      truck: "#4a1800",
      window: "#e6f6ff",
      log: "#7a4a24",
      logGrain: "#b3845a",
      leaf: "#1f8a3a",
      leafWarn: "#8a4a00",
      leafSunk: "#8fb8d6",
      lily: "#1c7a34",
      frog: "#143800",
      frogBelly: "#a8e07a",
      frogEye: "#ffffff",
      frogPupil: "#0a0a0a",
      frogDead: "#4a5540",
      glowBlur: 0,
    },
    // Literales exactos del motor antes de las skins: no "mejorar". Hereda
    // pares bajo umbral del original: tronco/agua 1.56 (lo leen la forma y las
    // vetas), rana muerta/agua 2.52, coche/camión 1.46 (tono y forma), rana
    // sobre hoja de aviso 1.03 (la separan vientre y ojos) y líneas de carril
    // 10.32:1, más marcadas que un decorado.
    dark: {
      water: "#0b3a66",
      waterDeep: "#06243f",
      ripple: "#1d5a8f",
      asphalt: "#1c1c24",
      laneMark: "#c9c9d6",
      grass: "#1f6b2a",
      grassEdge: "#2f8f3c",
      car: "#ff3b6b",
      carAlt: "#ffd23f",
      truck: "#ff8a1f",
      window: "#9fe3ff",
      log: "#7a4a24",
      logGrain: "#5a3418",
      leaf: "#37c45a",
      leafWarn: "#a6f0b8",
      leafSunk: "#2a6f88",
      lily: "#2fae4a",
      frog: "#7cff4f",
      frogBelly: "#c8ff9e",
      frogEye: "#ffffff",
      frogPupil: "#0a0a0a",
      frogDead: "#6b7a5c",
      glowBlur: 0,
    },
  },
  neon: {
    // Neón de día: fondos lavanda casi blancos y piezas en tintas saturadas
    // profundas. Glow corto, porque en claro un halo grande ensucia.
    // Críticos: hoja/agua 3.31 · coche/camión 1.57 · tronco/hoja 1.79 ·
    // hoja/aviso 1.80 · rana/aviso 1.89.
    light: {
      water: "#eceeff",
      waterDeep: "#dfe2ff",
      ripple: "#c3c8f5",
      asphalt: "#f3eef8",
      laneMark: "#d3c3e6",
      grass: "#e2f7e8",
      grassEdge: "#b5e3c3",
      car: "#d6008a",
      carAlt: "#1a0090",
      truck: "#962e00",
      window: "#e9fbff",
      log: "#7a2ad0",
      logGrain: "#c9a8ff",
      leaf: "#009478",
      leafWarn: "#b0006a",
      leafSunk: "#b9c0f0",
      lily: "#00806a",
      frog: "#0a3a00",
      frogBelly: "#8fe36a",
      frogEye: "#ffffff",
      frogPupil: "#0a0010",
      frogDead: "#5a4a6a",
      glowBlur: 6,
    },
    // Tubo CRT: negro con un punto de violeta, tráfico magenta/amarillo/naranja,
    // troncos violeta y una rana lima que es lo más brillante del río. La hoja
    // de aviso se apaga (un tubo que parpadea) en vez de encenderse, para no
    // confundirse con la rana. El color base ya pasa 3:1 sin contar el glow.
    // Críticos: tronco/agua 3.72 · aviso/agua 3.69 · coche/camión 1.72.
    dark: {
      water: "#070a22",
      waterDeep: "#04030f",
      ripple: "#1c2458",
      asphalt: "#0b0712",
      laneMark: "#2e2244",
      grass: "#071a10",
      grassEdge: "#123d22",
      car: "#d400ff",
      carAlt: "#ffe600",
      truck: "#ff8c1a",
      window: "#00f5ff",
      log: "#8a3df0",
      logGrain: "#5a2a99",
      leaf: "#00b894",
      leafWarn: "#007a63",
      leafSunk: "#173a4a",
      lily: "#00d68f",
      frog: "#b6ff1a",
      frogBelly: "#efffc2",
      frogEye: "#ffffff",
      frogPupil: "#04030f",
      frogDead: "#8a7aa0",
      glowBlur: 14,
    },
  },
  retro: {
    // Game Boy en negativo: seis tonos planos, el más claro de fondo. Agua y
    // asfalto comparten color: las zonas se leen por ondas y líneas de carril.
    // Críticos: hoja y carAlt 3.52 · coche/carAlt, tronco/hoja y hoja/aviso
    // 1.80. Rana y camión comparten tono: los separan forma, vientre y ojos.
    light: {
      water: "#e0f8d0",
      waterDeep: "#e0f8d0",
      ripple: "#b4d09c",
      asphalt: "#e0f8d0",
      laneMark: "#b4d09c",
      grass: "#b4d09c",
      grassEdge: "#e0f8d0",
      car: "#306230",
      carAlt: "#6a8a14",
      truck: "#0f380f",
      window: "#e0f8d0",
      log: "#306230",
      logGrain: "#b4d09c",
      leaf: "#6a8a14",
      leafWarn: "#306230",
      leafSunk: "#b4d09c",
      lily: "#6a8a14",
      frog: "#0f380f",
      frogBelly: "#8bac0f",
      frogEye: "#e0f8d0",
      frogPupil: "#0f380f",
      frogDead: "#306230",
      glowBlur: 0,
    },
    // Game Boy DMG ampliada a seis tonos planos, sin alfa ni glow.
    // Críticos: tronco, camión y rana muerta 3.28 · coche/camión, tronco/hoja y
    // hoja/aviso 1.53 (el aviso se oscurece).
    dark: {
      water: "#0f380f",
      waterDeep: "#0f380f",
      ripple: "#306230",
      asphalt: "#0f380f",
      laneMark: "#306230",
      grass: "#306230",
      grassEdge: "#0f380f",
      car: "#8bac0f",
      carAlt: "#d0d058",
      truck: "#5a8c2a",
      window: "#0f380f",
      log: "#5a8c2a",
      logGrain: "#0f380f",
      leaf: "#8bac0f",
      leafWarn: "#5a8c2a",
      leafSunk: "#306230",
      lily: "#8bac0f",
      frog: "#e0f8d0",
      frogBelly: "#8bac0f",
      frogEye: "#e0f8d0",
      frogPupil: "#0f380f",
      frogDead: "#5a8c2a",
      glowBlur: 0,
    },
  },
};
