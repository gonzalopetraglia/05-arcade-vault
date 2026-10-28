/**
 * Bucle y estado de CROAC, con el mismo ciclo de vida explícito que
 * SnakeEngine: React lo monta, lo conduce y lo destruye.
 *
 * El tiempo es continuo, como en ASTEROIDES y ARKANOID: el tráfico avanza dt
 * segundos por frame. dt se topa a 0,1 s para que un salto de pestaña no
 * teletransporte los carriles encima de la rana.
 *
 * No hay reinicio ni pausa por tecla ni overlays en el canvas: pausar, terminar
 * y reiniciar son del shell, y el HUD es de React.
 */

import {
  CELL,
  COLORS,
  GOAL_COLS,
  HOP_MS,
  LIVES,
  POINTS_GOAL,
  POINTS_ROUND,
  POINTS_ROW,
  ROW_GOALS,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_START,
  W,
  drawFrog,
  drawWorld,
  spawnFrog,
  type Dir,
  type Frog,
} from "./entities";
import {
  LANES,
  buildLane,
  drawLane,
  isSunk,
  speedFor,
  stepLane,
  type LaneDef,
  type Piece,
} from "./lanes";

export type CroacState = {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
};

type EngineOptions = {
  onState: (s: CroacState) => void;
  onGameOver: (finalScore: number) => void;
};

const MAX_DT = 0.1; // s; techo del delta entre frames
const HIT_INSET = 8; // px que se recorta la caja de la rana por lado contra el tráfico

// WASD como alias de las flechas; el mando táctil manda los códigos de flecha.
const DIR_BY_KEY: Record<string, Dir | undefined> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

export class CroacEngine {
  private ctx: CanvasRenderingContext2D;
  private onState: EngineOptions["onState"];
  private onGameOver: EngineOptions["onGameOver"];

  private frog: Frog = spawnFrog();
  private lanes: Piece[][] = [];
  private occupied: boolean[] = [];
  private keysDown = new Set<string>();
  /** Una pulsación llegada con la rana en el aire; se consume al aterrizar. */
  private queued: Dir | null = null;

  private score = 0;
  private lives = LIVES;
  private level = 1;
  private state: CroacState["status"] = "playing";
  private time = 0; // s de juego; marca el ciclo de las hojas y no corre en pausa

  private rafId: number | null = null;
  private lastTime: number | null = null;
  private running = false;
  private destroyed = false;
  /**
   * Alguien pidió pausa y aún no ha reanudado. Sin esto, un `pause()` llegado
   * antes de `start()` (el "toca para empezar" del móvil, o PAUSA nada más
   * entrar) se desharía solo al arrancar.
   */
  private held = false;
  private lastEmitted: CroacState | null = null;

  constructor(canvas: HTMLCanvasElement, opts: EngineOptions) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    this.ctx = ctx;
    this.onState = opts.onState;
    this.onGameOver = opts.onGameOver;
  }

  // ── API pública ─────────────────────────────────────────────────────────────

  start(): void {
    this.initGame();
    this.emitState();
    // En pausa se pinta un fotograma para que la pantalla no quede vacía.
    if (this.held) this.draw();
    else this.resume();
  }

  pause(): void {
    this.held = true;
    // Con la ventana sin foco el keyup no llega: una tecla que quedara "abajo"
    // se tragaría la primera pulsación al reanudar.
    this.keysDown.clear();
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume(): void {
    this.held = false;
    if (this.destroyed || this.running || this.state === "gameover") return;
    this.running = true;
    // Sin esto, el primer dt tras la pausa vale lo que haya durado la pausa.
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
   * Teclado y táctil entran por aquí; el motor no distingue dedo de tecla. Un
   * salto solo se dispara en la transición de suelta a pulsada: la
   * autorrepetición del teclado y un dedo apoyado en la cruceta no encadenan
   * saltos. Las teclas se registran siempre, para que soltar una durante la
   * muerte no la deje "abajo", pero solo se actúa en status "playing".
   */
  setKey(code: string, down: boolean): void {
    const dir = DIR_BY_KEY[code];
    if (!dir) return;
    if (!down) {
      this.keysDown.delete(code);
      return;
    }
    if (this.keysDown.has(code)) return;
    this.keysDown.add(code);
    if (this.state !== "playing" || !this.running) return;
    // En el aire se guarda una sola pulsación; la última manda.
    if (this.frog.hop) this.queued = dir;
    else this.startHop(dir);
  }

  destroy(): void {
    this.destroyed = true;
    this.pause();
  }

  // ── Bucle ───────────────────────────────────────────────────────────────────

  private loop = (ts: number): void => {
    if (!this.running) return;
    const dt = this.lastTime === null ? 0 : Math.min(MAX_DT, (ts - this.lastTime) / 1000);
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
    const next: CroacState = {
      score: this.score,
      lives: this.lives,
      level: this.level,
      status: this.state,
    };
    this.lastEmitted = next;
    this.onState(next);
  }

  // ── Estado del juego ────────────────────────────────────────────────────────

  private initGame(): void {
    this.score = 0;
    this.lives = LIVES;
    this.level = 1;
    this.state = "playing";
    this.time = 0;
    this.occupied = [false, false, false, false, false];
    this.lanes = LANES.map((def) => buildLane(def, this.level));
    this.frog = spawnFrog();
    this.queued = null;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  private update(dt: number): void {
    if (this.state === "gameover") return;
    this.time += dt;
    // El tráfico sigue moviéndose también mientras la rana está muerta.
    LANES.forEach((def, i) => stepLane(this.lanes[i], def, this.level, dt));
    if (this.state !== "playing") return;

    const hop = this.frog.hop;
    if (hop) {
      hop.t += (dt * 1000) / HOP_MS;
      if (hop.t >= 1) this.land();
    }
    // Quieta también se resuelve: un coche puede atropellarla y el río la arrastra.
    if (this.state === "playing" && !this.frog.hop) this.checkGround(dt);
  }

  /**
   * Arriba o abajo cambia de fila; a los lados mueve exactamente CELL píxeles
   * desde donde esté, aunque el río la haya dejado entre celdas. Al caer en
   * tierra o carretera x se alinea a la celda más cercana: sin eso la rana
   * saldría del río "flotando" entre dos celdas de la orilla.
   */
  private startHop(dir: Dir): void {
    const { frog } = this;
    let { x, row } = frog;
    if (dir === "up") row--;
    else if (dir === "down") row++;
    else if (dir === "left") x -= CELL;
    else x += CELL;

    if (row < 0 || row > ROW_START || x < 0 || x > W - CELL) return;
    if (!isRiver(row)) x = Math.round(x / CELL) * CELL;

    frog.hop = { from: { x: frog.x, row: frog.row }, to: { x, row }, t: 0 };
  }

  /**
   * Fin del salto: la rana queda en su destino y, si había una pulsación
   * guardada, salta otra vez. En el aire no colisiona; las reglas de la fila
   * se resuelven a partir de aquí.
   */
  private land(): void {
    const { frog } = this;
    const hop = frog.hop;
    if (!hop) return;
    frog.x = hop.to.x;
    frog.row = hop.to.row;
    frog.hop = null;

    // Volver atrás y avanzar otra vez no puntúa dos veces.
    if (frog.row < frog.bestRow) {
      this.score += POINTS_ROW;
      frog.bestRow = frog.row;
    }

    if (frog.row === ROW_GOALS) {
      this.reachGoal();
      return;
    }
    this.checkGround(0);

    // Una rana muerta al aterrizar no encadena el salto guardado.
    const next = this.queued;
    this.queued = null;
    if (next && this.state === "playing") this.startHop(next);
  }

  /**
   * Fila 0: vale el nenúfar cuyo centro dista menos de media celda del centro
   * de la rana. Libre, se ocupa y la rana vuelve a la salida; ocupado o fuera
   * de un nenúfar, muere.
   */
  private reachGoal(): void {
    const cx = this.frog.x + CELL / 2;
    const i = GOAL_COLS.findIndex((col) => Math.abs(col * CELL + CELL / 2 - cx) < CELL / 2);
    if (i === -1 || this.occupied[i]) {
      this.die();
      return;
    }
    this.occupied[i] = true;
    this.score += POINTS_GOAL;
    this.frog = spawnFrog();
    this.queued = null;
    if (this.occupied.every(Boolean)) this.nextRound();
  }

  /**
   * Charca llena: bonus, nivel nuevo, nenúfares vacíos y carriles rehechos con
   * la velocidad del nivel. La rana ya está en la salida.
   */
  private nextRound(): void {
    this.score += POINTS_ROUND;
    this.level++;
    this.occupied = this.occupied.map(() => false);
    this.lanes = LANES.map((def) => buildLane(def, this.level));
  }

  /**
   * Reglas con la rana en el suelo. Carretera: muere si su caja, recortada
   * HIT_INSET por lado, toca un vehículo. Río: la sostiene la pieza que
   * contiene su centro y la arrastra a su velocidad; sin pieza, con una hoja
   * hundida o arrastrada fuera de la pantalla, muere.
   */
  private checkGround(dt: number): void {
    const { frog } = this;
    const lane = this.laneAt(frog.row);
    if (!lane) return;
    const { def, pieces } = lane;

    if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
      const left = frog.x + HIT_INSET;
      const right = frog.x + CELL - HIT_INSET;
      if (pieces.some((p) => p.x < right && p.x + p.len * CELL > left)) this.die();
      return;
    }

    if (isRiver(frog.row)) {
      const cx = frog.x + CELL / 2;
      const under = pieces.find((p) => cx >= p.x && cx < p.x + p.len * CELL);
      if (!under || isSunk(under, this.time)) {
        this.die();
        return;
      }
      frog.x += def.dir * speedFor(def, this.level) * dt;
      const ncx = frog.x + CELL / 2;
      if (ncx < 0 || ncx > W) this.die();
    }
  }

  private laneAt(row: number): { def: LaneDef; pieces: Piece[] } | null {
    const i = LANES.findIndex((def) => def.row === row);
    return i === -1 ? null : { def: LANES[i], pieces: this.lanes[i] };
  }

  private die(): void {
    this.state = "dead";
  }

  // ── Draw ────────────────────────────────────────────────────────────────────

  private draw(): void {
    const { ctx } = this;
    drawWorld(ctx, this.occupied, COLORS);
    LANES.forEach((def, i) => drawLane(ctx, this.lanes[i], def, COLORS, this.time));
    drawFrog(ctx, this.frog, COLORS);
  }
}

function isRiver(row: number): boolean {
  return row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT;
}
