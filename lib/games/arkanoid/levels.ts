/**
 * Port of references/started-games/04-arkanoid/levels.js.
 *
 * Los cinco generadores del original, traducidos literalmente: muro lleno,
 * pirámide, tablero de ajedrez, huecos y marco con cruz. Mismas tablas de
 * colores, mismos pyStart / pyEnd / gaps4 y las mismas velocidades. No tocar:
 * cambiar una fila o un multiplicador rebalancea el juego.
 */

import { BLOCK_COLS, BLOCK_ROWS, type BlockColor } from "./entities";

export type LevelBlock = { col: number; row: number; color: BlockColor };
export type Level = { speed: number; blocks: LevelBlock[] };

const rowColors1: BlockColor[] = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
const rowColors2: BlockColor[] = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
const rowColors4: BlockColor[] = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];

// Nivel 1 — muro lleno.
const l1: LevelBlock[] = [];
for (let row = 0; row < BLOCK_ROWS; row++)
  for (let col = 0; col < BLOCK_COLS; col++) l1.push({ col, row, color: rowColors1[row] });

// Nivel 2 — pirámide.
const l2: LevelBlock[] = [];
const pyStart = [4, 3, 2, 1, 0, 0];
const pyEnd = [5, 6, 7, 8, 9, 9];
for (let row = 0; row < BLOCK_ROWS; row++)
  for (let col = pyStart[row]; col <= pyEnd[row]; col++)
    l2.push({ col, row, color: rowColors2[row] });

// Nivel 3 — tablero de ajedrez.
const l3: LevelBlock[] = [];
for (let row = 0; row < BLOCK_ROWS; row++)
  for (let col = 0; col < BLOCK_COLS; col++)
    if ((col + row) % 2 === 0) l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

// Nivel 4 — huecos.
const gaps4 = [
  [2, 5, 8],
  [0, 4, 7, 9],
  [1, 3, 6],
  [2, 5, 8, 9],
  [0, 4, 7],
  [1, 3, 6, 9],
];
const l4: LevelBlock[] = [];
for (let row = 0; row < BLOCK_ROWS; row++)
  for (let col = 0; col < BLOCK_COLS; col++)
    if (!gaps4[row].includes(col)) l4.push({ col, row, color: rowColors4[row] });

// Nivel 5 — marco con cruz.
const l5: LevelBlock[] = [];
for (let row = 0; row < BLOCK_ROWS; row++)
  for (let col = 0; col < BLOCK_COLS; col++) {
    const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
    const isCross = col === 4 || row === 2;
    if (isFrame || isCross) l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
  }

export const LEVELS: Level[] = [
  { speed: 1.0, blocks: l1 },
  { speed: 1.1, blocks: l2 },
  { speed: 1.21, blocks: l3 },
  { speed: 1.33, blocks: l4 },
  { speed: 1.46, blocks: l5 },
];
