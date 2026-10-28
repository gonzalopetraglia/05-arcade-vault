/**
 * Capas pre-renderizadas de CROAC (SPEC 13). Lo que no cambia de un frame a
 * otro se dibuja una vez en un canvas offscreen y el motor lo copia con un
 * solo `drawImage` por frame.
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
  drawFrog,
  setGlow,
} from "./entities";
import type { CroacPalette } from "./skins";

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
 * Fondo por zonas: agua oscura con nenúfares arriba, río, orilla del medio,
 * asfalto con líneas discontinuas entre carriles y orilla de salida, más las
 * ranas que ya ocupan un nenúfar. Solo cambia al ocupar un nenúfar, al empezar
 * ronda o al cambiar de paleta: el motor lo rehace entonces y nada más.
 */
export function buildBackground(
  occupied: readonly boolean[],
  colors: CroacPalette,
  dpr: number,
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
