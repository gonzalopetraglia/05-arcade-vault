/**
 * Port of references/started-games/03-tetris/game.js.
 *
 * Literal translation: same piece matrices, same colours, same formulas. The
 * original kept `board`, `current` and the rest as file globals and read them
 * from every function; here every function takes what it needs as a parameter,
 * so the module holds no mutable state and the engine owns the game. Do not
 * rebalance anything: the eight pieces (the nut `N` included), the line scores
 * and the 30px block size are the original's.
 */

export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const W = COLS * BLOCK; // 300
export const H = ROWS * BLOCK; // 600

export const NEXT_W = 120;
export const NEXT_H = 120;
export const NEXT_BLOCK = 30;

export const LINE_SCORES = [0, 100, 300, 500, 800];

/**
 * El original leía este color con
 * `getComputedStyle(document.body).getPropertyValue('--grid-line')`. Aquí es una
 * constante: el motor dibuja sin tocar el DOM. Es el valor del tema oscuro del
 * original (`--grid-line: #22222e`), que es el fondo en el que vive la pantalla
 * del CRT del Vault.
 */
export const GRID_LINE = "#22222e";

export const COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
];

export const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

export type Board = number[][]; // ROWS × COLS, 0 = vacío, 1..8 = índice de color
export type Piece = { type: number; shape: number[][]; x: number; y: number };

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

export function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type]!.map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

export function collide(board: Board, shape: number[][], ox: number, oy: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

export function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

/** Fila final de la pieza si cayera recto desde donde está. */
export function ghostY(board: Board, piece: Piece): number {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}

/** Muta el tablero quitando las filas completas y devuelve cuántas quitó. */
export function clearLines(board: Board): number {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return cleared;
}

// ── Dibujo ────────────────────────────────────────────────────────────────────

/** Un bloque de la rejilla, con el realce blanco al 12 % del original. */
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha?: number,
): void {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  if (!color) return;
  ctx.globalAlpha = alpha ?? 1;
  ctx.fillStyle = color;
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  ctx.globalAlpha = 1;
}

export function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}
