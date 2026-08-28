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
  opposite,
  spawnFruit,
  tickMsFor,
  type Dir,
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

const DIR_BY_KEY: Record<string, Dir | undefined> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const MAX_QUEUED_DIRS = 2;

export class SnakeEngine {
  private ctx: CanvasRenderingContext2D;
  private onState: EngineOptions["onState"];
  private onGameOver: EngineOptions["onGameOver"];

  private snake: SnakeBody = SnakeBody.spawn();
  private fruit: Fruit | null = null;
  private pendingDirs: Dir[] = [];

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

  /**
   * Teclado y táctil entran por aquí; el motor no distingue dedo de tecla. Solo
   * cuenta la pulsación: soltar la tecla no cambia el rumbo.
   *
   * La dirección va a una cola de como mucho dos entradas. Con una sola, dos
   * pulsaciones dentro del mismo tic perderían la primera y el juego respondería
   * peor de lo que el jugador espera.
   */
  setKey(code: string, down: boolean): void {
    if (!down) return;
    const dir = DIR_BY_KEY[code];
    if (!dir) return;
    if (this.pendingDirs.length >= MAX_QUEUED_DIRS) return;
    // El opuesto se descarta contra el último rumbo encolado, que es el que la
    // serpiente tendrá cuando se consuma esta entrada.
    const last = this.pendingDirs[this.pendingDirs.length - 1] ?? this.snake.dir;
    if (dir === last || dir === opposite(last)) return;
    this.pendingDirs.push(dir);
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
    this.deadFor = 0;
    this.resetRound();
  }

  /** Serpiente al centro y fruta nueva. La puntuación no se toca. */
  private resetRound(): void {
    this.snake = SnakeBody.spawn();
    // Los giros encolados antes de morir no deben sobrevivir a la nueva vida.
    this.pendingDirs = [];
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
    // Cada tic consume como mucho un giro de la cola.
    const next = this.pendingDirs.shift();
    if (next) this.snake.dir = next;

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

  /**
   * Chocar con el muro o con la cola cuesta una vida. Con vidas de sobra la
   * partida se congela DEATH_PAUSE en status "dead"; con 0, se acaba. La
   * puntuación se conserva en los dos casos.
   */
  private die(): void {
    this.lives--;
    if (this.lives <= 0) {
      this.lives = 0;
      this.state = "gameover";
      // El HUD ve el 0 antes de que se abra el modal.
      this.emitState();
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
