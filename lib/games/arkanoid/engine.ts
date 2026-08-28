/**
 * Port of the game loop and game state of
 * references/started-games/04-arkanoid/game.js into an instance with an
 * explicit lifecycle, so React can mount it, drive it and tear it down.
 *
 * Changes from the original, and only these:
 *   - the globals (paddle, ball, blocks, explosions, lives, score, gameState,
 *     currentLevel, isPaused, keys, lastTime) become instance fields.
 *   - the loop keeps the requestAnimationFrame id so pause() and destroy() can
 *     cancel it; resume() clears lastTime so the first dt after a pause is 0 and
 *     the ball does not teleport through the paddle.
 *   - start() waits for the spritesheet promise before the first frame, the way
 *     the original started inside loadSpritesheet's callback.
 *   - the p/Escape pause shortcut, the level-skip click handler and the three
 *     canvas overlays are gone: pausing, ending and restarting belong to the
 *     shell, and the HUD is React's.
 * Everything else — the speeds, the 10 points per block, the 3 lives, the five
 * levels and the block bounce that always flips vy — is identical.
 */

import {
  EXPLOSION_DURATION,
  H,
  PADDLE_SPEED,
  POINTS_PER_BLOCK,
  START_LIVES,
  W,
  buildBlocks,
  collideAABB,
  createBall,
  createPaddle,
  type Ball,
  type Explosion,
  type Block,
  type Paddle,
} from "./entities";
import { LEVELS } from "./levels";
import { EXPLOSION_FRAMES, SPRITES, drawFrame, drawSprite, loadSpritesheet } from "./sprites";

export type ArkanoidState = {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "gameover";
};

type EngineOptions = {
  onState: (s: ArkanoidState) => void;
  onGameOver: (finalScore: number) => void;
};

const BOUNCE_SOUND_SRC = "/games/arkanoid/sounds/ball-bounce.mp3";
const BREAK_SOUND_SRC = "/games/arkanoid/sounds/break-sound.mp3";

export class ArkanoidEngine {
  private ctx: CanvasRenderingContext2D;
  private onState: EngineOptions["onState"];
  private onGameOver: EngineOptions["onGameOver"];

  private keys: Record<string, boolean> = {};

  private paddle: Paddle = createPaddle();
  private ball: Ball = createBall(this.paddle, LEVELS[0].speed);
  private blocks: Block[] = [];
  private explosions: Explosion[] = [];

  private score = 0;
  private lives = START_LIVES;
  private level = 1;
  private state: ArkanoidState["status"] = "playing";

  private sheet: CanvasImageSource | null = null;
  private bounceSound: HTMLAudioElement | null = null;
  private breakSound: HTMLAudioElement | null = null;

  private rafId: number | null = null;
  private lastTime: number | null = null;
  private running = false;
  private destroyed = false;
  private lastEmitted: ArkanoidState | null = null;

  constructor(canvas: HTMLCanvasElement, opts: EngineOptions) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    this.ctx = ctx;
    this.onState = opts.onState;
    this.onGameOver = opts.onGameOver;

    if (typeof Audio !== "undefined") {
      this.bounceSound = new Audio(BOUNCE_SOUND_SRC);
      this.breakSound = new Audio(BREAK_SOUND_SRC);
    }
  }

  // ── API pública ─────────────────────────────────────────────────────────────

  /**
   * El original arrancaba el bucle dentro del callback de loadSpritesheet. Aquí
   * es la promesa la que hace de puerta: hasta que la imagen no está, no se
   * dibuja nada. Si el componente se desmonta mientras carga, destroyed corta la
   * continuación y el bucle nunca arranca.
   */
  start(): void {
    this.initGame();
    this.emitState();
    void loadSpritesheet()
      .then((img) => {
        if (this.destroyed) return;
        this.sheet = img;
        this.resume();
      })
      .catch(() => {
        // Sin spritesheet no hay nada que pintar; el juego no arranca en vez de
        // dibujar un canvas a medias.
      });
  }

  pause(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume(): void {
    if (this.destroyed || this.running || !this.sheet) return;
    this.running = true;
    // Sin esto, el primer dt tras la pausa vale lo que haya durado la pausa y la
    // pelota atraviesa la paleta.
    this.lastTime = null;
    this.rafId = requestAnimationFrame(this.loop);
  }

  restart(): void {
    this.initGame();
    this.emitState();
    this.resume();
  }

  forceGameOver(): void {
    if (this.state === "gameover") return;
    this.state = "gameover";
    this.emitState();
    this.onGameOver(this.score);
  }

  setKey(code: string, down: boolean): void {
    this.keys[code] = down;
  }

  /** Ratón: centro de la paleta en coordenadas del mundo, recortado al área. */
  setPaddleX(worldX: number): void {
    this.paddle.x = Math.max(0, Math.min(W - this.paddle.w, worldX - this.paddle.w / 2));
  }

  destroy(): void {
    this.destroyed = true;
    this.pause();
    this.keys = {};
  }

  // ── Bucle ───────────────────────────────────────────────────────────────────

  private loop = (ts: number): void => {
    if (!this.running) return;
    // El original no topa dt. La pausa automática por visibilitychange y blur es
    // lo que evita que se acumule un salto enorme con la pestaña oculta.
    const dt = this.lastTime === null ? 0 : (ts - this.lastTime) / 1000;
    this.lastTime = ts;
    this.update(dt);
    this.draw();
    this.emitState();
    this.rafId = requestAnimationFrame(this.loop);
  };

  /** Solo avisa a React cuando cambia alguno de los cuatro campos. */
  private emitState(): void {
    const prev = this.lastEmitted;
    if (
      prev &&
      prev.score === this.score &&
      prev.lives === this.lives &&
      prev.level === this.level &&
      prev.status === this.state
    ) {
      return;
    }
    const next: ArkanoidState = {
      score: this.score,
      lives: this.lives,
      level: this.level,
      status: this.state,
    };
    this.lastEmitted = next;
    this.onState(next);
  }

  // ── Estado del juego ────────────────────────────────────────────────────────

  /** `loadLevel(n)` del original: rejilla nueva y pelota repuesta a la velocidad del nivel. */
  private loadLevel(n: number): void {
    this.level = n;
    const level = LEVELS[n - 1];
    this.blocks = buildBlocks(level);
    this.explosions = [];
    this.resetBall(level.speed);
  }

  /**
   * `initBall()` del original. Muta la pelota en vez de sustituirla para que
   * update() no se quede con una referencia vieja cuando repone tras un cambio
   * de nivel dentro del mismo frame.
   */
  private resetBall(speed: number): void {
    Object.assign(this.ball, createBall(this.paddle, speed));
  }

  private initGame(): void {
    this.keys = {};
    this.score = 0;
    this.lives = START_LIVES;
    this.state = "playing";
    this.paddle = createPaddle();
    this.loadLevel(1);
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  /**
   * El original hace `sound.cloneNode().play()` en cada golpe para permitir que
   * dos rebotes suenen solapados. El clon no se guarda en ninguna referencia y
   * el recolector lo libera al terminar. El rechazo de la promesa se ignora: sin
   * interacción previa del usuario el navegador bloquea la reproducción, y eso
   * no puede romper la partida ni ensuciar la consola.
   */
  private playSound(sound: HTMLAudioElement | null): void {
    if (!sound) return;
    const clone = sound.cloneNode() as HTMLAudioElement;
    void clone.play().catch(() => {});
  }

  private update(dt: number): void {
    if (this.state !== "playing") return;

    const { paddle, ball } = this;

    // Paleta
    if (this.keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (this.keys.ArrowRight) paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

    // Movimiento de la pelota
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Rebotes en las paredes (izquierda, derecha, arriba)
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      this.playSound(this.bounceSound);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      this.playSound(this.bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      this.playSound(this.bounceSound);
    }

    // Rebote en la paleta, con el margen de 8 px del original
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      this.playSound(this.bounceSound);
    }

    // Colisión con bloques. El original invierte siempre vy, aunque el golpe sea
    // lateral: es un defecto suyo y el port es fiel.
    for (const block of this.blocks) {
      if (!block.alive) continue;
      if (collideAABB(ball, block)) {
        block.alive = false;
        this.explosions.push({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          color: block.color,
          elapsed: 0,
        });
        this.score += POINTS_PER_BLOCK;
        ball.vy = -ball.vy;
        this.playSound(this.breakSound);
        this.onBlocksChanged();
        break; // un bloque por frame
      }
    }

    // Explosiones
    for (const exp of this.explosions) exp.elapsed += dt * 1000;
    this.explosions = this.explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    this.checkBallLost();
  }

  /**
   * Limpiar la rejilla carga el nivel siguiente. Limpiar el último es el
   * `gameState = 'win'` del original, traducido al flujo de puntuaciones del
   * Vault: fin de partida con la puntuación acumulada.
   */
  private onBlocksChanged(): void {
    if (!this.blocks.every((b) => !b.alive)) return;
    if (this.level < LEVELS.length) {
      this.loadLevel(this.level + 1);
    } else {
      this.state = "gameover";
      this.emitState();
      this.onGameOver(this.score);
    }
  }

  /** La pelota por debajo del área cuesta una vida; sin vidas, fin de partida. */
  private checkBallLost(): void {
    if (this.ball.y <= H) return;
    this.lives--;
    if (this.lives <= 0) {
      this.lives = 0;
      this.state = "gameover";
      this.emitState();
      this.onGameOver(this.score);
    } else {
      this.resetBall(LEVELS[this.level - 1].speed);
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────

  private draw(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    for (const block of this.blocks) {
      if (block.alive)
        drawSprite(
          ctx,
          this.sheet,
          SPRITES.blocks[block.color],
          block.x,
          block.y,
          block.w,
          block.h,
        );
    }

    for (const exp of this.explosions) {
      const frameIndex = Math.min(Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4), 3);
      drawFrame(
        ctx,
        this.sheet,
        EXPLOSION_FRAMES[exp.color][frameIndex],
        exp.x,
        exp.y,
        exp.w,
        exp.h,
      );
    }

    drawSprite(
      ctx,
      this.sheet,
      SPRITES.paddle,
      this.paddle.x,
      this.paddle.y,
      this.paddle.w,
      this.paddle.h,
    );
    drawSprite(ctx, this.sheet, SPRITES.ball, this.ball.x, this.ball.y, this.ball.w, this.ball.h);

    // El original pintaba aquí `Score:`, `Nivel:` y las pelotitas de vidas, más
    // los overlays de fin y de pausa. Todo eso es del HUD y del shell de React.
  }
}
