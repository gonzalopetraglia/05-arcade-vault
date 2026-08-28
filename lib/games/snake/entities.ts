/**
 * Constantes del mundo y entidades de Snake.
 *
 * A diferencia de ASTEROIDES, TETRIS y ARKANOID, aquí no hay original que
 * portar: la mecánica se define en specs/09-juego-snake.md y el código se
 * escribe directamente en su forma final. El mundo es una grilla discreta; las
 * coordenadas de las celdas son columnas y filas, nunca píxeles.
 */

import type { FruitName } from "./sprites";
import { FRUIT_NAMES, FRUITS } from "./sprites";

// ── Constantes del mundo ──────────────────────────────────────────────────────
export const CELL = 40; // píxeles por celda
export const COLS = 20;
export const ROWS = 15;
export const W = COLS * CELL; // 800
export const H = ROWS * CELL; // 600

export const START_LEN = 3; // celdas de la serpiente al empezar
export const LIVES = 3;
export const FRUIT_POINTS = 10;

export const TICK_START = 150; // ms por celda al empezar
export const TICK_STEP = 10; // ms que se recortan por subida de nivel
export const TICK_MIN = 70; // suelo de velocidad
export const FRUITS_PER_LEVEL = 5;
export const DEATH_PAUSE = 1000; // ms de status "dead" antes de revivir

// ── Entidades ─────────────────────────────────────────────────────────────────
export type Cell = { x: number; y: number }; // coordenadas de grilla, no píxeles
export type Dir = "up" | "down" | "left" | "right";

export type Fruit = { cell: Cell; sprite: FruitName };

const DELTAS: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** La dirección contraria, para descartar el giro de 180°. */
export function opposite(dir: Dir): Dir {
  switch (dir) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}

/**
 * La serpiente: un array de celdas donde el índice 0 es la cabeza. `pending`
 * son las celdas que aún tiene que crecer; mientras queden, `step()` no recorta
 * la cola.
 */
export class SnakeBody {
  cells: Cell[];
  dir: Dir;
  private pending = 0;

  constructor(cells: Cell[], dir: Dir) {
    this.cells = cells;
    this.dir = dir;
  }

  /** Estado inicial: START_LEN celdas en el centro, mirando a la derecha. */
  static spawn(): SnakeBody {
    const cy = Math.floor(ROWS / 2);
    const headX = Math.floor(COLS / 2);
    const cells: Cell[] = [];
    for (let i = 0; i < START_LEN; i++) {
      cells.push({ x: headX - i, y: cy });
    }
    return new SnakeBody(cells, "right");
  }

  get head(): Cell {
    return this.cells[0];
  }

  /** Encola n celdas de crecimiento; se consumen en los siguientes step(). */
  grow(n: number): void {
    this.pending += n;
  }

  /** Avanza una celda en la dirección actual. */
  step(): void {
    const d = DELTAS[this.dir];
    const head = this.head;
    this.cells.unshift({ x: head.x + d.x, y: head.y + d.y });
    if (this.pending > 0) this.pending--;
    else this.cells.pop();
  }

  hitsWall(): boolean {
    const { x, y } = this.head;
    return x < 0 || y < 0 || x >= COLS || y >= ROWS;
  }

  hitsSelf(): boolean {
    const { x, y } = this.head;
    return this.cells.some((c, i) => i > 0 && c.x === x && c.y === y);
  }

  occupies(cell: Cell): boolean {
    return this.cells.some((c) => c.x === cell.x && c.y === cell.y);
  }
}

/**
 * Elige una celda libre al azar y le asigna un sprite del atlas. Devuelve null
 * cuando la serpiente ocupa toda la grilla: no queda sitio y la partida se
 * acaba como victoria.
 */
export function spawnFruit(occupied: Cell[]): Fruit | null {
  const taken = new Set(occupied.map((c) => `${c.x},${c.y}`));
  const free: Cell[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;

  return {
    cell: free[Math.floor(Math.random() * free.length)],
    sprite: FRUIT_NAMES[Math.floor(Math.random() * FRUIT_NAMES.length)],
  };
}

// ── Dibujo ────────────────────────────────────────────────────────────────────
// Los colores salen del tema: --green es #00ff88. El canvas no puede leer
// variables CSS sin un getComputedStyle por frame, así que los literales viven
// aquí; si el tema cambia, cambian también estas dos constantes.
const SNAKE_BODY = "#00ff88";
const SNAKE_HEAD = "#b6ffd9";
const GRID_LINE = "rgba(0, 255, 136, 0.08)";
const CELL_GAP = 2; // px de separación entre celdas de la serpiente
const FRUIT_H = 36; // alto fijo de la fruta; el ancho sale de sw / sh

/** Fondo negro y rejilla tenue de COLS x ROWS. */
export function drawBoard(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < COLS; x++) {
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, H);
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(W, y * CELL + 0.5);
  }
  ctx.stroke();
}

/** La serpiente, celda a celda: cabeza en verde claro, cuerpo en verde del tema. */
export function drawSnake(ctx: CanvasRenderingContext2D, snake: SnakeBody): void {
  const size = CELL - CELL_GAP * 2;
  const radius = Math.floor(size / 4);

  snake.cells.forEach((c, i) => {
    ctx.fillStyle = i === 0 ? SNAKE_HEAD : SNAKE_BODY;
    ctx.beginPath();
    ctx.roundRect(c.x * CELL + CELL_GAP, c.y * CELL + CELL_GAP, size, size, radius);
    ctx.fill();
  });
}

/**
 * La fruta, escalada a FRUIT_H de alto conservando la proporción del recorte y
 * centrada en su celda. Sin imagen —la carga falló— se pinta un círculo verde
 * para que la partida siga siendo jugable.
 */
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  fruit: Fruit,
): void {
  const cx = fruit.cell.x * CELL + CELL / 2;
  const cy = fruit.cell.y * CELL + CELL / 2;

  if (!img) {
    ctx.fillStyle = SNAKE_BODY;
    ctx.beginPath();
    ctx.arc(cx, cy, FRUIT_H / 3, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const frame = FRUITS[fruit.sprite];
  const h = FRUIT_H;
  const w = (frame.sw / frame.sh) * h;
  ctx.drawImage(img, frame.sx, frame.sy, frame.sw, frame.sh, cx - w / 2, cy - h / 2, w, h);
}

/** Nivel y ritmo se derivan de la fruta comida; no se guardan por separado. */
export function levelFor(fruitsEaten: number): number {
  return Math.floor(fruitsEaten / FRUITS_PER_LEVEL) + 1;
}

export function tickMsFor(level: number): number {
  return Math.max(TICK_MIN, TICK_START - (level - 1) * TICK_STEP);
}
