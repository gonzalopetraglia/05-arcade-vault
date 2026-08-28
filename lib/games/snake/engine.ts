/**
 * Bucle y estado de Snake, con el mismo ciclo de vida explícito que
 * AsteroidsEngine y ArkanoidEngine: React lo monta, lo conduce y lo destruye.
 *
 * La diferencia con los tres juegos anteriores es el tiempo. Snake no avanza
 * por dt continuo: el bucle sigue siendo un requestAnimationFrame, pero acumula
 * el tiempo transcurrido y solo mueve la serpiente cuando el acumulador supera
 * el intervalo del tic. dt se topa a 100 ms para que un salto de pestaña no
 * adelante varios tics de golpe.
 *
 * No hay reinicio por tecla ni overlays en el canvas: pausar, terminar y
 * reiniciar son del shell, y el HUD es de React.
 */

import {
  DEATH_PAUSE,
  FRUIT_POINTS,
  LIVES,
  SnakeBody,
  drawBoard,
  drawFruit,
  drawSnake,
  levelFor,
  spawnFruit,
  tickMsFor,
  type Fruit,
} from "./entities";
import { loadFruits } from "./sprites";

export type SnakeState = {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
};

type EngineOptions = {
  onState: (s: SnakeState) => void;
  onGameOver: (finalScore: number) => void;
};

const MAX_DT = 100; // ms; techo del delta entre frames

export class SnakeEngine {
  private ctx: CanvasRenderingContext2D;
  private onState: EngineOptions["onState"];
  private onGameOver: EngineOptions["onGameOver"];

  private snake: SnakeBody = SnakeBody.spawn();
  private fruit: Fruit | null = null;

  private score = 0;
  private lives = LIVES;
  private fruitsEaten = 0;
  private state: SnakeState["status"] = "playing";

  private acc = 0; // ms acumulados desde el último tic
  private deadFor = 0; // ms transcurridos desde la muerte, mientras status es "dead"

  private img: HTMLImageElement | null = null;
  private imgFailed = false;

  private rafId: number | null = null;
  private lastTime: number | null = null;
  private running = false;
  private destroyed = false;
  private lastEmitted: SnakeState | null = null;

  constructor(canvas: HTMLCanvasElement, opts: EngineOptions) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    this.ctx = ctx;
    this.onState = opts.onState;
    this.onGameOver = opts.onGameOver;
  }

  // ── API pública ─────────────────────────────────────────────────────────────

  /**
   * La promesa del atlas hace de puerta: hasta que la imagen no está —o falla—
   * no se dibuja nada. Si el componente se desmonta mientras carga, destroyed
   * corta la continuación y el bucle nunca arranca.
   */
  start(): void {
    this.initGame();
    this.emitState();
    void loadFruits()
      .then((img) => {
        if (this.destroyed) return;
        this.img = img;
        this.resume();
      })
      .catch(() => {
        if (this.destroyed) return;
        // Sin atlas la fruta se pinta como un círculo verde y la partida sigue.
        this.imgFailed = true;
        this.resume();
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
    if (this.destroyed || this.running) return;
    if (!this.img && !this.imgFailed) return;
    this.running = true;
    // Sin esto, el primer dt tras la pausa vale lo que haya durado la pausa y el
    // acumulador dispararía varios tics seguidos.
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

  /** Teclado y táctil entran por aquí; el motor no distingue dedo de tecla. */
  setKey(code: string, down: boolean): void {
    if (!down) return;
    const dir =
      code === "ArrowUp"
        ? "up"
        : code === "ArrowDown"
          ? "down"
          : code === "ArrowLeft"
            ? "left"
            : code === "ArrowRight"
              ? "right"
              : null;
    if (dir) this.snake.dir = dir;
  }

  destroy(): void {
    this.destroyed = true;
    this.pause();
  }

  // ── Bucle ───────────────────────────────────────────────────────────────────

  private loop = (ts: number): void => {
    if (!this.running) return;
    const dt = this.lastTime === null ? 0 : Math.min(MAX_DT, ts - this.lastTime);
    this.lastTime = ts;
    this.update(dt);
    this.draw();
    this.emitState();
    this.rafId = requestAnimationFrame(this.loop);
  };

  /** Solo avisa a React cuando cambia alguno de los cuatro campos. */
  private emitState(): void {
    const prev = this.lastEmitted;
    const level = levelFor(this.fruitsEaten);
    if (
      prev &&
      prev.score === this.score &&
      prev.lives === this.lives &&
      prev.level === level &&
      prev.status === this.state
    ) {
      return;
    }
    const next: SnakeState = {
      score: this.score,
      lives: this.lives,
      level,
      status: this.state,
    };
    this.lastEmitted = next;
    this.onState(next);
  }

  // ── Estado del juego ────────────────────────────────────────────────────────

  private initGame(): void {
    this.score = 0;
    this.lives = LIVES;
    this.fruitsEaten = 0;
    this.state = "playing";
    this.acc = 0;
    this.resetRound();
  }

  /** Serpiente al centro y fruta nueva. La puntuación no se toca. */
  private resetRound(): void {
    this.snake = SnakeBody.spawn();
    this.fruit = spawnFruit(this.snake.cells);
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  private update(dt: number): void {
    if (this.state === "dead") {
      this.deadFor += dt;
      if (this.deadFor >= DEATH_PAUSE) this.revive();
      return;
    }
    if (this.state !== "playing") return;

    this.acc += dt;
    const tickMs = tickMsFor(levelFor(this.fruitsEaten));
    while (this.acc >= tickMs && this.state === "playing") {
      this.acc -= tickMs;
      this.tick();
    }
  }

  /** Un tic: la serpiente avanza una celda y se resuelven las consecuencias. */
  private tick(): void {
    this.snake.step();

    if (this.snake.hitsWall() || this.snake.hitsSelf()) {
      this.die();
      return;
    }

    const fruit = this.fruit;
    if (fruit && fruit.cell.x === this.snake.head.x && fruit.cell.y === this.snake.head.y) {
      this.score += FRUIT_POINTS;
      this.fruitsEaten++;
      this.snake.grow(1);
      this.fruit = spawnFruit(this.snake.cells);
      // Sin celdas libres la serpiente ocupa toda la grilla: la partida se acaba
      // como victoria.
      if (!this.fruit) this.forceGameOver();
    }
  }

  private die(): void {
    this.lives--;
    if (this.lives <= 0) {
      this.lives = 0;
      this.state = "gameover";
      this.onGameOver(this.score);
      return;
    }
    this.state = "dead";
    this.deadFor = 0;
  }

  /** Tras DEATH_PAUSE: serpiente al centro, fruta nueva, puntuación intacta. */
  private revive(): void {
    this.state = "playing";
    this.acc = 0;
    this.deadFor = 0;
    this.resetRound();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────

  private draw(): void {
    const { ctx } = this;
    drawBoard(ctx);
    if (this.fruit) drawFruit(ctx, this.img, this.fruit);
    drawSnake(ctx, this.snake);
  }
}
