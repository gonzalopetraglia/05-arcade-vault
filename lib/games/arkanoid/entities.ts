/**
 * Port of the world constants and entities of
 * references/started-games/04-arkanoid/game.js.
 *
 * Literal translation: same sizes, same speeds, same formulas. W and H replace
 * the canvas.width / canvas.height the original read from the DOM — the canvas
 * buffer is fixed and CSS stretches it.
 */

export type BlockColor = "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;

export const EXPLOSION_DURATION = 150; // ms
