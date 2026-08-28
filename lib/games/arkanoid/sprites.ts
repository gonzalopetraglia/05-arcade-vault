/**
 * Port of references/started-games/04-arkanoid/assets/spritesheet.js.
 *
 * Same atlas coordinates as the original, down to the last pixel. The two
 * structural changes are the ones the port forces: the callback queue becomes a
 * module-level cached promise, and the draw helpers take the image as a
 * parameter instead of reading a module global. The offscreen canvas the
 * original built on load is kept — it is what the promise resolves with.
 */

import type { BlockColor } from "./entities";

// La constante vive junto al resto del mundo, pero se reexporta aquí porque es
// el ritmo de la animación de explosión que definen EXPLOSION_FRAMES.
export { EXPLOSION_DURATION } from "./entities";

export type Frame = { sx: number; sy: number; sw: number; sh: number };

export const SPRITES: {
  paddle: Frame;
  ball: Frame;
  blocks: Record<BlockColor, Frame>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};

export const EXPLOSION_FRAMES: Record<BlockColor, [Frame, Frame, Frame, Frame]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  // El original reutiliza los fotogramas rojos para gray.
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

export const SPRITESHEET_SRC = "/games/arkanoid/spritesheet-breakout.png";

let spritesheetPromise: Promise<CanvasImageSource> | null = null;

/**
 * Carga el spritesheet una sola vez por sesión. La promesa se cachea a nivel de
 * módulo, así que varias partidas seguidas reutilizan la misma imagen.
 */
export function loadSpritesheet(): Promise<CanvasImageSource> {
  if (spritesheetPromise) return spritesheetPromise;

  spritesheetPromise = new Promise<CanvasImageSource>((resolve, reject) => {
    const rawImg = new Image();
    rawImg.onload = () => {
      const oc = document.createElement("canvas");
      oc.width = rawImg.width;
      oc.height = rawImg.height;
      const octx = oc.getContext("2d");
      if (!octx) {
        reject(new Error("No 2d context for the offscreen spritesheet canvas"));
        return;
      }
      octx.drawImage(rawImg, 0, 0);
      resolve(oc);
    };
    rawImg.onerror = () => {
      // Una carga fallida no debe envenenar la caché: el siguiente intento
      // vuelve a pedir la imagen.
      spritesheetPromise = null;
      reject(new Error("Failed to load spritesheet"));
    };
    rawImg.src = SPRITESHEET_SRC;
  });

  return spritesheetPromise;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource | null,
  frame: Frame,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (!img) return;
  ctx.drawImage(img, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource | null,
  frame: Frame,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  drawFrame(ctx, img, frame, x, y, w, h);
}
