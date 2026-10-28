/**
 * Constantes del mundo y entidades de CROAC.
 *
 * Como SNAKE, no hay original que portar: la mecánica se define en
 * specs/12-juego-croac.md. La rana salta por celdas, pero su `x` es continuo en
 * píxeles porque el río la arrastra; `row` siempre es una fila entera.
 */

import type { CroacPalette } from "./skins";

// ── Constantes del mundo ──────────────────────────────────────────────────────
export const CELL = 50; // píxeles por celda
export const COLS = 16;
export const ROWS = 12;
export const W = COLS * CELL; // 800
export const H = ROWS * CELL; // 600

// Filas (0 = arriba).
export const ROW_GOALS = 0; // nenúfares
export const ROW_RIVER_TOP = 1; // río: filas 1–4
export const ROW_RIVER_BOT = 4;
export const ROW_BANK = 5; // orilla del medio, segura
export const ROW_ROAD_TOP = 6; // carretera: filas 6–10
export const ROW_ROAD_BOT = 10;
export const ROW_START = 11; // orilla de salida, segura

export const GOAL_COLS = [1, 4, 8, 11, 14] as const; // un nenúfar por celda
export const START_COL = 7;

export const LIVES = 3;
export const POINTS_ROW = 10; // por cada fila nueva alcanzada en este intento
export const POINTS_GOAL = 100; // por nenúfar ocupado
export const POINTS_ROUND = 500; // por llenar los cinco

export const HOP_MS = 120; // duración del salto de una celda
export const DEATH_PAUSE = 1000; // ms de status "dead" antes de revivir
export const SPEED_STEP = 0.15; // +15 % de velocidad por nivel
export const SPEED_MAX = 2; // tope: el doble de la velocidad base

// ── Colores ───────────────────────────────────────────────────────────────────
// Ningún color vive aquí: cada función de dibujo recibe la paleta de la skin
// activa (lib/games/croac/skins.ts) por parámetro, y así cambiar de skin no
// toca el estado de la partida.

// ── Rana ──────────────────────────────────────────────────────────────────────
export type Dir = "up" | "down" | "left" | "right";
export type DeathKind = "squash" | "sink"; // atropellada o ahogada

export type Frog = {
  x: number; // borde izquierdo en píxeles; continuo, porque el río la arrastra
  row: number; // fila entera
  hop: { from: { x: number; row: number }; to: { x: number; row: number }; t: number } | null;
  bestRow: number; // fila más alta alcanzada en este intento (para POINTS_ROW)
};

export function spawnFrog(): Frog {
  return { x: START_COL * CELL, row: ROW_START, hop: null, bestRow: ROW_START };
}

/**
 * Posición en píxeles de la esquina superior izquierda de la rana. Durante el
 * salto se interpola entre origen y destino; `hop.t` va de 0 a 1.
 */
export function frogPos(frog: Frog): { x: number; y: number } {
  if (!frog.hop) return { x: frog.x, y: frog.row * CELL };
  const { from, to, t } = frog.hop;
  return {
    x: from.x + (to.x - from.x) * t,
    y: (from.row + (to.row - from.row) * t) * CELL,
  };
}

// ── Dibujo ────────────────────────────────────────────────────────────────────
/**
 * Halo de la skin NEON. Se enciende antes de cada relleno que debe brillar y se
 * apaga justo después: `shadowBlur` es estado del contexto y, olvidado puesto,
 * haría brillar también el fondo del frame siguiente (y costaría rendimiento).
 */
export function setGlow(ctx: CanvasRenderingContext2D, color: string, blur: number): void {
  ctx.shadowBlur = blur;
  ctx.shadowColor = blur > 0 ? color : "transparent";
}

const HOP_SCALE = 0.12; // cuánto crece la rana en el punto alto del salto

/**
 * Fondo por zonas: agua oscura con nenúfares arriba, río, orilla del medio,
 * asfalto con líneas discontinuas entre carriles y orilla de salida. Las piezas
 * de cada carril las pinta drawLane encima.
 */
export function drawWorld(
  ctx: CanvasRenderingContext2D,
  occupied: readonly boolean[],
  colors: CroacPalette,
): void {
  ctx.fillStyle = colors.waterDeep;
  ctx.fillRect(0, ROW_GOALS * CELL, W, CELL);

  const riverY = ROW_RIVER_TOP * CELL;
  const riverH = (ROW_RIVER_BOT - ROW_RIVER_TOP + 1) * CELL;
  ctx.fillStyle = colors.water;
  ctx.fillRect(0, riverY, W, riverH);
  // Ondas fijas: cortas, desfasadas por fila para que no formen columnas.
  ctx.strokeStyle = colors.ripple;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let row = ROW_RIVER_TOP; row <= ROW_RIVER_BOT; row++) {
    for (let x = (row % 2) * 60 + 20; x < W; x += 120) {
      const y = row * CELL + CELL * 0.5;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 10, y - 5, x + 20, y);
    }
  }
  ctx.stroke();

  drawGrass(ctx, ROW_BANK, colors);
  drawGrass(ctx, ROW_START, colors);

  const roadY = ROW_ROAD_TOP * CELL;
  const roadH = (ROW_ROAD_BOT - ROW_ROAD_TOP + 1) * CELL;
  ctx.fillStyle = colors.asphalt;
  ctx.fillRect(0, roadY, W, roadH);
  ctx.strokeStyle = colors.laneMark;
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 20]);
  ctx.beginPath();
  for (let row = ROW_ROAD_TOP + 1; row <= ROW_ROAD_BOT; row++) {
    ctx.moveTo(0, row * CELL);
    ctx.lineTo(W, row * CELL);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  GOAL_COLS.forEach((col, i) => {
    const cx = col * CELL + CELL / 2;
    const cy = ROW_GOALS * CELL + CELL / 2;
    ctx.fillStyle = colors.lily;
    setGlow(ctx, colors.lily, colors.glowBlur);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, CELL / 2 - 3, 0.3, Math.PI * 2 - 0.3);
    ctx.closePath();
    ctx.fill();
    setGlow(ctx, colors.lily, 0);
    if (occupied[i]) {
      drawFrog(ctx, { x: col * CELL, row: ROW_GOALS, hop: null, bestRow: ROW_GOALS }, colors);
    }
  });
}

function drawGrass(ctx: CanvasRenderingContext2D, row: number, colors: CroacPalette): void {
  const y = row * CELL;
  ctx.fillStyle = colors.grass;
  ctx.fillRect(0, y, W, CELL);
  ctx.fillStyle = colors.grassEdge;
  ctx.fillRect(0, y, W, 4);
  ctx.fillRect(0, y + CELL - 4, W, 4);
}

/**
 * La rana: una elipse con vientre y dos ojos. En el aire se pinta un poco más
 * grande para que el salto se lea sin sombra ni sprite.
 */
export function drawFrog(ctx: CanvasRenderingContext2D, frog: Frog, colors: CroacPalette): void {
  const { x, y } = frogPos(frog);
  const cx = x + CELL / 2;
  const cy = y + CELL / 2;
  // Parábola de 0 a 1 a 0: el tamaño máximo cae a mitad del salto.
  const lift = frog.hop ? Math.sin(frog.hop.t * Math.PI) : 0;
  const s = 1 + HOP_SCALE * lift;
  const rx = CELL * 0.34 * s;
  const ry = CELL * 0.38 * s;

  ctx.fillStyle = colors.frog;
  setGlow(ctx, colors.frog, colors.glowBlur);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // Solo el cuerpo brilla: con glow en vientre y ojos la cara se emborrona.
  setGlow(ctx, colors.frog, 0);

  ctx.fillStyle = colors.frogBelly;
  ctx.beginPath();
  ctx.ellipse(cx, cy + ry * 0.25, rx * 0.55, ry * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const eyeR = CELL * 0.1 * s;
  const eyeDx = rx * 0.55;
  const eyeY = cy - ry * 0.7;
  for (const dx of [-eyeDx, eyeDx]) {
    ctx.fillStyle = colors.frogEye;
    ctx.beginPath();
    ctx.arc(cx + dx, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.frogPupil;
    ctx.beginPath();
    ctx.arc(cx + dx, eyeY - eyeR * 0.2, eyeR * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * La rana muerta: aplastada en la carretera (una elipse ancha y baja) o
 * hundida en el agua (anillos concéntricos donde estaba).
 */
export function drawDeadFrog(
  ctx: CanvasRenderingContext2D,
  frog: Frog,
  kind: DeathKind,
  colors: CroacPalette,
): void {
  const { x, y } = frogPos(frog);
  const cx = x + CELL / 2;
  const cy = y + CELL / 2;

  if (kind === "squash") {
    ctx.fillStyle = colors.frogDead;
    ctx.beginPath();
    ctx.ellipse(cx, cy, CELL * 0.44, CELL * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.strokeStyle = colors.frogDead;
  ctx.lineWidth = 2;
  for (const r of [0.12, 0.24, 0.36]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, CELL * r, CELL * r * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}
