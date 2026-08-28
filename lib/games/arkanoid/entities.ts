/**
 * Port of the world constants and entities of
 * references/started-games/04-arkanoid/game.js.
 *
 * Literal translation: same sizes, same speeds, same formulas. W and H replace
 * the canvas.width / canvas.height the original read from the DOM — the canvas
 * buffer is fixed and CSS stretches it. Do not rebalance anything here.
 */

import type { Level } from "./levels";

// ── Constantes del mundo ──────────────────────────────────────────────────────
export const W = 800;
export const H = 600;
export const PADDLE_SPEED = 400;
export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;
export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2; // 80
export const BLOCKS_ORIGIN_Y = 80;
export const START_LIVES = 3;
export const POINTS_PER_BLOCK = 10;
export const EXPLOSION_DURATION = 150; // ms

// ── Entidades ─────────────────────────────────────────────────────────────────
export type BlockColor = "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

export type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
};

export type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number;
};

export type Paddle = { x: number; y: number; w: number; h: number };

export type Ball = { x: number; y: number; w: number; h: number; vx: number; vy: number };

// ── Constructores ─────────────────────────────────────────────────────────────
/** `initPaddle()` del original: centrada en el área, a la altura fija PADDLE_Y. */
export function createPaddle(): Paddle {
  return { x: (W - PADDLE_W) / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
}

/**
 * `initBall()` del original: la pelota se repone centrada sobre la paleta, con
 * la velocidad base escalada por el multiplicador del nivel.
 */
export function createBall(paddle: Paddle, speed: number): Ball {
  return {
    x: paddle.x + (paddle.w - BALL_SIZE) / 2,
    y: paddle.y - BALL_SIZE,
    w: BALL_SIZE,
    h: BALL_SIZE,
    vx: BASE_BALL_VX * speed,
    vy: BASE_BALL_VY * speed,
  };
}

/** `loadLevel(n)` del original, solo la parte que construye la rejilla. */
export function buildBlocks(level: Level): Block[] {
  return level.blocks.map((b) => ({
    x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
    y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
    w: BLOCK_W,
    h: BLOCK_H,
    color: b.color,
    alive: true,
  }));
}

/** AABB pelota-bloque, idéntica a la del original. */
export function collideAABB(ball: Ball, block: Block): boolean {
  return (
    ball.x < block.x + block.w &&
    ball.x + ball.w > block.x &&
    ball.y < block.y + block.h &&
    ball.y + ball.h > block.y
  );
}
