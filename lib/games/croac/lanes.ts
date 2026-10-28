/**
 * Carriles de CROAC: carretera (filas 6–10) y río (filas 1–4).
 *
 * Cada carril es un bucle cerrado de piezas que avanzan a velocidad constante.
 * El patrón se repite hasta cubrir el ancho visible más la pieza más larga, y
 * las posiciones van en módulo de la longitud total del bucle: así una pieza
 * que sale por un lado reaparece por el otro sin que los huecos cambien nunca.
 */

import { CELL, SPEED_MAX, SPEED_STEP, W, setGlow } from "./entities";
import type { CroacPalette } from "./skins";
import { drawSprite, type SpriteSet } from "./sprites";

type LaneKind = "road" | "river";
type PieceKind = "car" | "truck" | "log" | "leaf";

export type LaneDef = {
  row: number;
  kind: LaneKind;
  dir: 1 | -1;
  speed: number; // px/s a nivel 1
  pieces: { kind: PieceKind; len: number; gap: number }[]; // patrón, en celdas
};

// `x` en píxeles (borde izquierdo); `len` en celdas, como en el patrón.
export type Piece = { kind: PieceKind; x: number; len: number; phase?: number };

export const LANES: LaneDef[] = [
  { row: 10, kind: "road", dir: -1, speed: 60, pieces: [{ kind: "car", len: 1, gap: 3 }] },
  { row: 9, kind: "road", dir: 1, speed: 80, pieces: [{ kind: "car", len: 1, gap: 4 }] },
  { row: 8, kind: "road", dir: -1, speed: 50, pieces: [{ kind: "truck", len: 2, gap: 4 }] },
  { row: 7, kind: "road", dir: 1, speed: 110, pieces: [{ kind: "car", len: 1, gap: 5 }] },
  { row: 6, kind: "road", dir: -1, speed: 70, pieces: [{ kind: "truck", len: 3, gap: 5 }] },
  { row: 4, kind: "river", dir: 1, speed: 50, pieces: [{ kind: "log", len: 3, gap: 3 }] },
  { row: 3, kind: "river", dir: -1, speed: 60, pieces: [{ kind: "leaf", len: 2, gap: 3 }] },
  { row: 2, kind: "river", dir: 1, speed: 80, pieces: [{ kind: "log", len: 4, gap: 3 }] },
  { row: 1, kind: "river", dir: -1, speed: 55, pieces: [{ kind: "leaf", len: 3, gap: 2 }] },
];

// ── Ciclo de las hojas (segundos) ─────────────────────────────────────────────
const LEAF_FLOAT = 4;
const LEAF_WARN = 0.6;
const LEAF_SUNK = 1.2;
const LEAF_CYCLE = LEAF_FLOAT + LEAF_WARN + LEAF_SUNK;

/** Multiplicador de velocidad del nivel, con tope en SPEED_MAX. */
export function speedFor(def: LaneDef, level: number): number {
  return def.speed * Math.min(SPEED_MAX, 1 + SPEED_STEP * (level - 1));
}

/** Longitud de la pieza más larga del patrón, en píxeles. */
function maxLenPx(def: LaneDef): number {
  return Math.max(...def.pieces.map((p) => p.len)) * CELL;
}

/** Cuántas veces se repite el patrón y cuánto mide el bucle, en píxeles. */
function loopOf(def: LaneDef): { reps: number; length: number } {
  const unit = def.pieces.reduce((sum, p) => sum + p.len + p.gap, 0) * CELL;
  const reps = Math.ceil((W + maxLenPx(def)) / unit);
  return { reps, length: reps * unit };
}

/**
 * Lleva x al intervalo [-maxLen, length - maxLen): la pieza más larga puede
 * asomar por la izquierda mientras el resto del bucle espera fuera por la
 * derecha.
 */
function wrap(x: number, def: LaneDef, length: number): number {
  const m = maxLenPx(def);
  return ((((x + m) % length) + length) % length) - m;
}

/**
 * Expande el patrón de un carril en sus piezas. Las hojas reciben fases
 * repartidas a lo largo del ciclo para que no se hundan todas a la vez. El
 * nivel no cambia la disposición —los huecos nunca se encogen—, solo la
 * velocidad, que aplica stepLane.
 */
export function buildLane(def: LaneDef, level: number): Piece[] {
  void level;
  const { reps, length } = loopOf(def);
  const pieces: Piece[] = [];
  // Desfase por fila para que carriles vecinos no arranquen alineados.
  let x = (def.row * 2 * CELL) % length;
  for (let r = 0; r < reps; r++) {
    for (const p of def.pieces) {
      pieces.push({ kind: p.kind, x: wrap(x, def, length), len: p.len });
      x += (p.len + p.gap) * CELL;
    }
  }
  const leaves = pieces.filter((p) => p.kind === "leaf");
  leaves.forEach((p, i) => {
    p.phase = (i * LEAF_CYCLE) / leaves.length;
  });
  return pieces;
}

/** Avanza las piezas dt segundos y las envuelve en el bucle. */
export function stepLane(pieces: Piece[], def: LaneDef, level: number, dt: number): void {
  const { length } = loopOf(def);
  const dx = def.dir * speedFor(def, level) * dt;
  for (const p of pieces) p.x = wrap(p.x + dx, def, length);
}

type LeafState = "float" | "warn" | "sunk";

/** Fase de una hoja en el instante t (segundos de juego). */
function leafState(piece: Piece, t: number): LeafState {
  const c = (t + (piece.phase ?? 0)) % LEAF_CYCLE;
  if (c < LEAF_FLOAT) return "float";
  if (c < LEAF_FLOAT + LEAF_WARN) return "warn";
  return "sunk";
}

/** Una hoja hundida no sostiene a la rana; troncos y vehículos nunca se hunden. */
export function isSunk(piece: Piece, t: number): boolean {
  return piece.kind === "leaf" && leafState(piece, t) === "sunk";
}

// ── Dibujo ────────────────────────────────────────────────────────────────────
const PAD = 5; // px de margen vertical de cada pieza dentro de su fila

/**
 * Las piezas de un carril, copiadas de los sprites de la paleta activa. El
 * fondo de la fila es la capa de buildBackground. Las hojas hundidas no tienen
 * glow: su contorno se traza aquí directamente.
 */
export function drawLane(
  ctx: CanvasRenderingContext2D,
  pieces: Piece[],
  def: LaneDef,
  sprites: SpriteSet,
  colors: CroacPalette,
  t: number,
): void {
  const y = def.row * CELL;
  pieces.forEach((p, i) => {
    // Las que están del todo fuera del canvas no se pintan.
    if (p.x >= W || p.x + p.len * CELL <= 0) return;
    switch (p.kind) {
      case "car":
        drawSprite(ctx, (i % 2 === 0 ? sprites.car : sprites.carAlt)[def.dir], p.x, y);
        break;
      case "truck":
        drawSprite(ctx, sprites.truck[p.len][def.dir], p.x, y);
        break;
      case "log":
        drawSprite(ctx, sprites.log[p.len], p.x, y);
        break;
      case "leaf": {
        const state = leafState(p, t);
        for (let c = 0; c < p.len; c++) {
          const x = p.x + c * CELL;
          if (state === "sunk") strokeSunkLeaf(ctx, x, y, colors);
          else drawSprite(ctx, sprites.leaf[state], x, y);
        }
        break;
      }
    }
  });
}

// ── Pintado de sprites ────────────────────────────────────────────────────────
// Solo los llama buildSprites, con el origen en la esquina de la caja de la
// pieza: son los únicos sitios de los carriles donde se enciende el glow.

/** Coche de `len` celdas, con la ventanilla hacia el sentido de la marcha. */
export function paintCar(
  ctx: CanvasRenderingContext2D,
  len: number,
  dir: 1 | -1,
  body: string,
  colors: CroacPalette,
): void {
  const w = len * CELL - PAD * 2;
  const h = CELL - PAD * 2 - 4;
  const x = PAD;
  const top = PAD + 2;
  ctx.fillStyle = body;
  setGlow(ctx, body, colors.glowBlur);
  ctx.beginPath();
  ctx.roundRect(x, top, w, h, 8);
  ctx.fill();
  setGlow(ctx, body, 0);
  const ww = w * 0.3;
  const wx = dir === 1 ? x + w - ww - 6 : x + 6;
  ctx.fillStyle = colors.window;
  ctx.beginPath();
  ctx.roundRect(wx, top + 6, ww, h - 12, 3);
  ctx.fill();
}

/** Camión de `len` celdas: remolque y cabina separados por una rendija. */
export function paintTruck(
  ctx: CanvasRenderingContext2D,
  len: number,
  dir: 1 | -1,
  colors: CroacPalette,
): void {
  const w = len * CELL - PAD * 2;
  const h = CELL - PAD * 2;
  const x = PAD;
  const top = PAD;
  const cab = CELL * 0.6;
  // La cabina va delante.
  const cabX = dir === 1 ? x + w - cab : x;
  const trailerX = dir === 1 ? x : x + cab + 3;
  ctx.fillStyle = colors.truck;
  setGlow(ctx, colors.truck, colors.glowBlur);
  ctx.beginPath();
  ctx.roundRect(trailerX, top, w - cab - 3, h, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cabX, top + 3, cab, h - 6, 6);
  ctx.fill();
  setGlow(ctx, colors.truck, 0);
  ctx.fillStyle = colors.window;
  ctx.beginPath();
  ctx.roundRect(dir === 1 ? cabX + cab - 12 : cabX + 4, top + 9, 8, h - 18, 2);
  ctx.fill();
}

/** Tronco de `len` celdas con vetas: dos líneas largas y un nudo por celda. */
export function paintLog(ctx: CanvasRenderingContext2D, len: number, colors: CroacPalette): void {
  const w = len * CELL - 4;
  const h = CELL - PAD * 2;
  const x = 2;
  const top = PAD;
  ctx.fillStyle = colors.log;
  setGlow(ctx, colors.log, colors.glowBlur);
  ctx.beginPath();
  ctx.roundRect(x, top, w, h, h / 2);
  ctx.fill();
  setGlow(ctx, colors.log, 0);
  ctx.strokeStyle = colors.logGrain;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 12, top + h * 0.35);
  ctx.lineTo(x + w - 18, top + h * 0.35);
  ctx.moveTo(x + 20, top + h * 0.68);
  ctx.lineTo(x + w - 10, top + h * 0.68);
  ctx.stroke();
  for (let c = 0; c < len; c++) {
    ctx.beginPath();
    ctx.arc(x + c * CELL + CELL / 2, top + h / 2, 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Una hoja (una celda): círculo con una muesca en cuña hacia el centro. */
function leafPath(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const r = CELL / 2 - PAD;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, -Math.PI / 2 + 0.35, -Math.PI / 2 - 0.35 + Math.PI * 2);
  ctx.closePath();
}

/** Hoja a flote o avisando, rellena y con glow. */
export function paintLeaf(ctx: CanvasRenderingContext2D, fill: string, colors: CroacPalette): void {
  leafPath(ctx, CELL / 2, CELL / 2);
  ctx.fillStyle = fill;
  setGlow(ctx, fill, colors.glowBlur);
  ctx.fill();
  setGlow(ctx, fill, 0);
}

/** Hoja hundida: solo el contorno, sin glow, así que se traza en el bucle. */
function strokeSunkLeaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colors: CroacPalette,
): void {
  leafPath(ctx, x + CELL / 2, y + CELL / 2);
  ctx.strokeStyle = colors.leafSunk;
  ctx.lineWidth = 2;
  ctx.stroke();
}
