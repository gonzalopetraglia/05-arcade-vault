/**
 * Port of the game loop and game state of
 * references/started-games/03-tetris/game.js into an instance with an explicit
 * lifecycle, so React can mount it, drive it and tear it down.
 *
 * The original kept `board`, `current`, `next`, `score`, `lines`, `level`,
 * `paused`, `gameOver`, `lastTime`, `dropAccum`, `dropInterval` and `animId` as
 * file globals; here they are fields of the instance, so two players can never
 * share state and destroy() really stops everything.
 *
 * Changes from the original, and only these:
 *   - the loop keeps the requestAnimationFrame id so pause() and destroy() can
 *     cancel it; resume() clears lastTime so the first dt after a pause is 0 and
 *     a hidden tab does not drop half a dozen pieces on the way back.
 *   - the DOM HUD (#score, #lines, #level) and the #overlay are gone: PlayerShell
 *     draws them from the state emitted through onState.
 *   - the KeyP pause shortcut and the restart button are gone: pausing and
 *     restarting are the shell's buttons.
 *   - the light/dark theme toggle and its localStorage key are not ported.
 * Everything else — the speeds, the line scores, the eight pieces — is identical.
 */

import {
  BLOCK,
  COLS,
  H,
  LINE_SCORES,
  NEXT_BLOCK,
  NEXT_H,
  NEXT_W,
  ROWS,
  W,
  clearLines,
  collide,
  createBoard,
  drawBlock,
  drawGrid,
  ghostY,
  randomPiece,
  rotateCW,
  type Board,
  type Piece,
} from "./entities";

export type TetrisState = {
  score: number;
  lines: number;
  level: number;
  status: "playing" | "gameover";
};

type EngineOptions = {
  onState: (s: TetrisState) => void;
  onGameOver: (finalScore: number) => void;
};

/**
 * El original se apoyaba en la repetición de teclas del navegador: cada
 * `keydown` repetido movía la pieza. La API `setKey(code, down)` es de estado,
 * y los botones táctiles no repiten nada, así que el motor lleva su propio DAS.
 */
const DAS_DELAY = 170; // ms hasta la primera repetición
const DAS_REPEAT = 50; // ms entre repeticiones

/** Las tres únicas teclas que repiten al mantenerse pulsadas. */
const REPEATABLE = ["ArrowLeft", "ArrowRight", "ArrowDown"] as const;

export class TetrisEngine {
  private ctx: CanvasRenderingContext2D;
  private nextCtx: CanvasRenderingContext2D;
  private onStateCb: EngineOptions["onState"];
  private onGameOverCb: EngineOptions["onGameOver"];

  private board: Board = createBoard();
  private current: Piece = randomPiece();
  private next: Piece = randomPiece();

  private score = 0;
  private lines = 0;
  private level = 1;
  private state: TetrisState["status"] = "playing";

  private dropAccum = 0;
  private dropInterval = 1000;

  private keys: Record<string, boolean> = {};
  private queue: string[] = [];
  /** Por tecla repetible: tiempo desde la última acción y si ya pasó el retardo. */
  private das: Record<string, { accum: number; repeating: boolean }> = {};

  private rafId: number | null = null;
  private lastTime: number | null = null;
  private running = false;
  private destroyed = false;
  private lastEmitted: TetrisState | null = null;

  constructor(board: HTMLCanvasElement, next: HTMLCanvasElement, opts: EngineOptions) {
    const ctx = board.getContext("2d");
    const nextCtx = next.getContext("2d");
    if (!ctx || !nextCtx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    this.ctx = ctx;
    this.nextCtx = nextCtx;
    this.onStateCb = opts.onState;
    this.onGameOverCb = opts.onGameOver;
  }

  // ── API pública ─────────────────────────────────────────────────────────────

  start(): void {
    this.initGame();
    this.emitState();
    this.resume();
  }

  pause(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume(): void {
    if (this.destroyed || this.running) return;
    this.running = true;
    // Sin esto, el primer dt tras la pausa vale lo que haya durado la pausa y
    // el dropAccum suelta varias piezas de golpe al volver.
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
    this.onGameOverCb(this.score);
  }

  setKey(code: string, down: boolean): void {
    if (down) {
      // Solo el flanco de bajada encola: mantener la tecla lo gestiona el DAS.
      if (!this.keys[code]) {
        this.queue.push(code);
        if ((REPEATABLE as readonly string[]).includes(code)) {
          this.das[code] = { accum: 0, repeating: false };
        }
      }
      this.keys[code] = true;
    } else {
      this.keys[code] = false;
      delete this.das[code];
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.pause();
    this.keys = {};
    this.queue = [];
    this.das = {};
  }

  // ── Bucle ───────────────────────────────────────────────────────────────────

  private loop = (ts: number): void => {
    if (!this.running) return;
    const dt = this.lastTime === null ? 0 : ts - this.lastTime;
    this.lastTime = ts;
    this.update(dt);
    this.draw();
    this.emitState();
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);
  };

  /** Solo avisa a React cuando cambia alguno de los cuatro campos. */
  private emitState(): void {
    const prev = this.lastEmitted;
    if (
      prev &&
      prev.score === this.score &&
      prev.lines === this.lines &&
      prev.level === this.level &&
      prev.status === this.state
    ) {
      return;
    }
    const next: TetrisState = {
      score: this.score,
      lines: this.lines,
      level: this.level,
      status: this.state,
    };
    this.lastEmitted = next;
    this.onStateCb(next);
  }

  // ── Estado del juego ────────────────────────────────────────────────────────

  private initGame(): void {
    this.board = createBoard();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.state = "playing";
    this.dropInterval = 1000;
    this.dropAccum = 0;
    this.lastTime = null;
    this.queue = [];
    this.das = {};
    this.next = randomPiece();
    this.spawn();
  }

  private merge(): void {
    const { shape, x, y } = this.current;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c]) this.board[y + r][x + c] = shape[r][c];
  }

  private clearLines(): void {
    const cleared = clearLines(this.board);
    if (!cleared) return;
    this.lines += cleared;
    this.score += (LINE_SCORES[cleared] ?? 0) * this.level;
    this.level = Math.floor(this.lines / 10) + 1;
    this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 90);
  }

  private lockPiece(): void {
    this.merge();
    this.clearLines();
    this.spawn();
  }

  private spawn(): void {
    this.current = this.next;
    this.next = randomPiece();
    if (collide(this.board, this.current.shape, this.current.x, this.current.y)) {
      this.endGame();
    }
    this.drawNext();
  }

  private endGame(): void {
    if (this.state === "gameover") return;
    this.state = "gameover";
    this.pause();
    this.emitState();
    this.onGameOverCb(this.score);
  }

  // ── Acciones ────────────────────────────────────────────────────────────────

  private move(dx: number): void {
    if (!collide(this.board, this.current.shape, this.current.x + dx, this.current.y)) {
      this.current.x += dx;
    }
  }

  private tryRotate(): void {
    const rotated = rotateCW(this.current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(this.board, rotated, this.current.x + kick, this.current.y)) {
        this.current.shape = rotated;
        this.current.x += kick;
        return;
      }
    }
  }

  private softDrop(): void {
    if (!collide(this.board, this.current.shape, this.current.x, this.current.y + 1)) {
      this.current.y++;
      this.score += 1;
    } else {
      this.lockPiece();
    }
  }

  private hardDrop(): void {
    const gy = ghostY(this.board, this.current);
    this.score += (gy - this.current.y) * 2;
    this.current.y = gy;
    this.lockPiece();
  }

  private isGameOver(): boolean {
    return this.state === "gameover";
  }

  private act(code: string): void {
    if (this.isGameOver()) return;
    switch (code) {
      case "ArrowLeft":
        this.move(-1);
        break;
      case "ArrowRight":
        this.move(1);
        break;
      case "ArrowDown":
        this.softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        this.tryRotate();
        break;
      case "Space":
        this.hardDrop();
        break;
    }
  }

  /** Flancos encolados primero, después la repetición automática de las tres teclas. */
  private handleInput(dt: number): void {
    for (const code of this.queue) this.act(code);
    this.queue = [];

    for (const code of REPEATABLE) {
      const das = this.das[code];
      if (!das || !this.keys[code]) continue;
      das.accum += dt;
      if (!das.repeating) {
        if (das.accum >= DAS_DELAY) {
          das.accum -= DAS_DELAY;
          das.repeating = true;
          this.act(code);
        }
      }
      while (das.repeating && das.accum >= DAS_REPEAT) {
        das.accum -= DAS_REPEAT;
        this.act(code);
      }
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  private update(dt: number): void {
    if (this.isGameOver()) return;

    this.handleInput(dt);
    // Una caída dura de la cola puede haber terminado la partida en este frame.
    if (this.isGameOver()) return;

    this.dropAccum += dt;
    if (this.dropAccum >= this.dropInterval) {
      this.dropAccum = 0;
      if (!collide(this.board, this.current.shape, this.current.x, this.current.y + 1)) {
        this.current.y++;
      } else {
        this.lockPiece();
      }
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────

  private draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    drawGrid(ctx);

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, this.board[r][c], BLOCK);

    const gy = ghostY(this.board, this.current);
    const { shape, x, y } = this.current;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c]) drawBlock(ctx, x + c, gy + r, shape[r][c], BLOCK, 0.2);

    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c]) drawBlock(ctx, x + c, y + r, shape[r][c], BLOCK);

    this.drawLines();
  }

  /**
   * Las líneas no caben en el HUD del shell, que solo tiene puntos, nivel y
   * vidas, así que se dibujan dentro del propio tablero.
   */
  private drawLines(): void {
    const ctx = this.ctx;
    ctx.font = "15px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(`LÍNEAS ${this.lines}`, 13, H - 13);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(`LÍNEAS ${this.lines}`, 12, H - 14);
  }

  private drawNext(): void {
    const ctx = this.nextCtx;
    ctx.clearRect(0, 0, NEXT_W, NEXT_H);
    const shape = this.next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(ctx, offX + c, offY + r, shape[r][c], NEXT_BLOCK);
  }
}
