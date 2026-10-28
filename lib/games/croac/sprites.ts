/**
 * Capas pre-renderizadas de CROAC (SPEC 13). Lo que no cambia de un frame a
 * otro se dibuja una vez en un canvas offscreen y el motor lo copia con
 * `drawImage`: el fondo entero y un sprite por pieza, con el glow NEON ya
 * horneado. `shadowBlur` es la operación más cara del canvas 2D; aquí se paga
 * una vez por paleta en lugar de una por pieza y frame.
 */

import {
  CELL,
  GOAL_COLS,
  H,
  ROW_BANK,
  ROW_GOALS,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
  ROW_START,
  W,
  HOP_SCALE,
  drawFrog,
  frogPos,
  setGlow,
  type Frog,
} from "./entities";
import { LANES, paintCar, paintLeaf, paintLog, paintTruck } from "./lanes";
import type { CroacPalette } from "./skins";

/**
 * Canvas offscreen con un dibujo ya hecho, glow incluido. `w`×`h` es la caja
 * de la pieza en px lógicos (la que tendría dibujada a mano) y `ox`/`oy` el
 * margen alrededor, que deja sitio al halo para que no se recorte.
 */
export type Sprite = { canvas: HTMLCanvasElement; ox: number; oy: number; w: number; h: number };

type ByDir = Record<1 | -1, Sprite>;

/**
 * Uno por combinación pieza/color/tamaño/estado que se pinte con glow. Coches
 * y camiones van por sentido (la ventanilla y la cabina miran hacia la marcha)
 * y camiones y troncos por `len`, porque en LANES hay más de un largo.
 */
export type SpriteSet = {
  frog: Sprite;
  car: ByDir;
  carAlt: ByDir;
  truck: Record<number, ByDir>;
  log: Record<number, Sprite>;
  leaf: Record<"float" | "warn", Sprite>;
  lily: Sprite;
};

/** Canvas offscreen de W×H lógicos a la resolución real del búfer. */
function offscreen(
  w: number,
  h: number,
  dpr: number,
): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D offscreen");
  ctx.scale(dpr, dpr);
  return { canvas, ctx };
}

/**
 * Pinta `paint` en un sprite de w×h lógicos. El margen va de sobra para el
 * halo: `shadowBlur` es una gaussiana de sigma blur/2 y se ve hasta ~3 sigma.
 */
function sprite(
  w: number,
  h: number,
  colors: CroacPalette,
  dpr: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): Sprite {
  const m = Math.ceil(colors.glowBlur * 1.5) + 2;
  const { canvas, ctx } = offscreen(w + 2 * m, h + 2 * m, dpr);
  ctx.translate(m, m);
  paint(ctx);
  return { canvas, ox: m, oy: m, w, h };
}

/**
 * Copia un sprite con su caja en (x, y). Con `scale` crece desde el centro de
 * la caja, que es como crecía la rana dibujada a mano durante el salto.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  s: Sprite,
  x: number,
  y: number,
  scale = 1,
): void {
  const fw = (s.w + 2 * s.ox) * scale;
  const fh = (s.h + 2 * s.oy) * scale;
  ctx.drawImage(s.canvas, x + s.w / 2 - fw / 2, y + s.h / 2 - fh / 2, fw, fh);
}

/** La rana viva: el sprite en su posición, más grande en lo alto del salto. */
export function drawFrogSprite(ctx: CanvasRenderingContext2D, frog: Frog, s: Sprite): void {
  const { x, y } = frogPos(frog);
  // Parábola de 0 a 1 a 0: el tamaño máximo cae a mitad del salto.
  const lift = frog.hop ? Math.sin(frog.hop.t * Math.PI) : 0;
  drawSprite(ctx, s, x, y, 1 + HOP_SCALE * lift);
}

/** Todos los sprites de una paleta. Se rehacen solo al cambiar de paleta. */
export function buildSprites(colors: CroacPalette, dpr: number): SpriteSet {
  const at = (w: number, paint: (ctx: CanvasRenderingContext2D) => void) =>
    sprite(w, CELL, colors, dpr, paint);
  const byDir = (
    w: number,
    paint: (ctx: CanvasRenderingContext2D, dir: 1 | -1) => void,
  ): ByDir => ({
    1: at(w, (ctx) => paint(ctx, 1)),
    [-1]: at(w, (ctx) => paint(ctx, -1)),
  });
  const lens = (kind: "truck" | "log") => [
    ...new Set(LANES.flatMap((def) => def.pieces.filter((p) => p.kind === kind).map((p) => p.len))),
  ];

  const truck: Record<number, ByDir> = {};
  for (const len of lens("truck")) {
    truck[len] = byDir(len * CELL, (ctx, dir) => paintTruck(ctx, len, dir, colors));
  }
  const log: Record<number, Sprite> = {};
  for (const len of lens("log")) log[len] = at(len * CELL, (ctx) => paintLog(ctx, len, colors));

  return {
    frog: at(CELL, (ctx) => drawFrog(ctx, { x: 0, row: 0, hop: null, bestRow: 0 }, colors)),
    car: byDir(CELL, (ctx, dir) => paintCar(ctx, 1, dir, colors.car, colors)),
    carAlt: byDir(CELL, (ctx, dir) => paintCar(ctx, 1, dir, colors.carAlt, colors)),
    truck,
    log,
    leaf: {
      float: at(CELL, (ctx) => paintLeaf(ctx, colors.leaf, colors)),
      warn: at(CELL, (ctx) => paintLeaf(ctx, colors.leafWarn, colors)),
    },
    lily: at(CELL, (ctx) => {
      const c = CELL / 2;
      ctx.fillStyle = colors.lily;
      setGlow(ctx, colors.lily, colors.glowBlur);
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, CELL / 2 - 3, 0.3, Math.PI * 2 - 0.3);
      ctx.closePath();
      ctx.fill();
      setGlow(ctx, colors.lily, 0);
    }),
  };
}

/**
 * Fondo por zonas: agua oscura con nenúfares arriba, río, orilla del medio,
 * asfalto con líneas discontinuas entre carriles y orilla de salida, más las
 * ranas que ya ocupan un nenúfar. Solo cambia al ocupar un nenúfar, al empezar
 * ronda o al cambiar de paleta: el motor lo rehace entonces y nada más.
 * Nenúfares y ranas salen de los sprites: este fondo se rehace desde el bucle
 * (al ocupar un nenúfar) y ahí no se usa `shadowBlur`.
 */
export function buildBackground(
  occupied: readonly boolean[],
  colors: CroacPalette,
  dpr: number,
  sprites: SpriteSet,
): HTMLCanvasElement {
  const { canvas, ctx } = offscreen(W, H, dpr);
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
    drawSprite(ctx, sprites.lily, col * CELL, ROW_GOALS * CELL);
    if (occupied[i]) drawSprite(ctx, sprites.frog, col * CELL, ROW_GOALS * CELL);
  });

  return canvas;
}

function drawGrass(ctx: CanvasRenderingContext2D, row: number, colors: CroacPalette): void {
  const y = row * CELL;
  ctx.fillStyle = colors.grass;
  ctx.fillRect(0, y, W, CELL);
  ctx.fillStyle = colors.grassEdge;
  ctx.fillRect(0, y, W, 4);
  ctx.fillRect(0, y + CELL - 4, W, 4);
}
