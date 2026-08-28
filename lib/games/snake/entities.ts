/**
 * Constantes del mundo y entidades de Snake.
 *
 * A diferencia de ASTEROIDES, TETRIS y ARKANOID, aquí no hay original que
 * portar: la mecánica se define en specs/09-juego-snake.md y el código se
 * escribe directamente en su forma final. El mundo es una grilla discreta; las
 * coordenadas de las celdas son columnas y filas, nunca píxeles.
 */

import type { FruitName } from "./sprites";
import { FRUIT_NAMES } from "./sprites";

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

/** Nivel y ritmo se derivan de la fruta comida; no se guardan por separado. */
export function levelFor(fruitsEaten: number): number {
  return Math.floor(fruitsEaten / FRUITS_PER_LEVEL) + 1;
}

export function tickMsFor(level: number): number {
  return Math.max(TICK_MIN, TICK_START - (level - 1) * TICK_STEP);
}
