/**
 * Port of the game loop and game state of
 * references/started-games/02-asteroids/game.js into an instance with an
 * explicit lifecycle, so React can mount it, drive it and tear it down.
 *
 * Changes from the original, and only these:
 *   - the loop keeps the requestAnimationFrame id so pause() and destroy() can
 *     cancel it; resume() clears lastTime so the first dt after a pause is 0 and
 *     nobody dies from the time jump.
 *   - restarting with SPACE on the game over screen is gone. Restarting is the
 *     button's job.
 *   - killShip() and forceGameOver() report the final score through onGameOver.
 *   - the game over subtitle points at the button instead of at SPACE.
 * Everything else — the 20/50/100 points, the 3x power-up, the 3 s of
 * invincibility, drawHUD, the overlay — is identical.
 */

import {
  Asteroid,
  Bullet,
  H,
  Particle,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  PowerUp,
  Ship,
  W,
  dist,
  rand,
  type Keys,
} from "./entities";

export type AsteroidsState = {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
};

type EngineOptions = {
  onState: (s: AsteroidsState) => void;
  onGameOver: (finalScore: number) => void;
};

export class AsteroidsEngine {
  private ctx: CanvasRenderingContext2D;
  private onState: EngineOptions["onState"];
  private onGameOver: EngineOptions["onGameOver"];

  private keys: Keys = {};
  private justPressed: Keys = {};

  private ship: Ship = new Ship();
  private bullets: Bullet[] = [];
  private asteroids: Asteroid[] = [];
  private particles: Particle[] = [];
  private powerUps: PowerUp[] = [];

  private score = 0;
  private lives = 3;
  private level = 1;
  private state: AsteroidsState["status"] = "playing";
  private deadTimer = 0;
  private powerUpSpawned = false;
  private killsSinceSpawn = 0;

  private rafId: number | null = null;
  private lastTime: number | null = null;
  private running = false;
  private destroyed = false;
  private lastEmitted: AsteroidsState | null = null;

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
    // teletransporta la nave dentro de un asteroide.
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
    if (down) {
      if (!this.keys[code]) this.justPressed[code] = true;
      this.keys[code] = true;
    } else {
      this.keys[code] = false;
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.pause();
    this.keys = {};
    this.justPressed = {};
  }

  // ── Bucle ───────────────────────────────────────────────────────────────────

  private loop = (ts: number): void => {
    if (!this.running) return;
    const dt = this.lastTime === null ? 0 : Math.min((ts - this.lastTime) / 1000, 0.05);
    this.lastTime = ts;
    this.update(dt);
    this.draw();
    this.emitState();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private pressed(code: string): boolean {
    const val = this.justPressed[code];
    this.justPressed[code] = false;
    return !!val;
  }

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
    const next: AsteroidsState = {
      score: this.score,
      lives: this.lives,
      level: this.level,
      status: this.state,
    };
    this.lastEmitted = next;
    this.onState(next);
  }

  // ── Estado del juego ────────────────────────────────────────────────────────

  private spawnAsteroids(count: number): void {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      this.asteroids.push(new Asteroid(x, y, 3));
    }
  }

  private initGame(): void {
    this.ship = new Ship();
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.powerUps = [];
    this.powerUpSpawned = false;
    this.killsSinceSpawn = 0;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.state = "playing";
    this.spawnAsteroids(4);
  }

  private nextLevel(): void {
    this.level++;
    this.bullets = [];
    this.particles = [];
    this.powerUps = [];
    this.powerUpSpawned = false;
    this.killsSinceSpawn = 0;
    this.ship.reset();
    this.spawnAsteroids(3 + this.level);
  }

  private explode(x: number, y: number, count = 8): void {
    for (let i = 0; i < count; i++) this.particles.push(new Particle(x, y));
  }

  private killShip(): void {
    this.explode(this.ship.x, this.ship.y, 14);
    this.ship.dead = true;
    this.lives--;
    if (this.lives <= 0) {
      this.state = "gameover";
      this.emitState();
      this.onGameOver(this.score);
    } else {
      this.state = "dead";
      this.deadTimer = 2;
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  private update(dt: number): void {
    if (this.state === "gameover") {
      this.particles.forEach((p) => p.update(dt));
      this.particles = this.particles.filter((p) => !p.dead);
      return;
    }

    if (this.state === "dead") {
      this.deadTimer -= dt;
      this.particles.forEach((p) => p.update(dt));
      this.particles = this.particles.filter((p) => !p.dead);
      this.asteroids.forEach((a) => a.update(dt));
      if (this.deadTimer <= 0) {
        this.state = "playing";
        this.ship.reset();
      }
      return;
    }

    // Disparar
    if (this.pressed("Space")) {
      this.bullets.push(...this.ship.tryShoot());
    }

    this.ship.update(dt, this.keys);
    this.bullets.forEach((b) => b.update(dt));
    this.asteroids.forEach((a) => a.update(dt));
    this.particles.forEach((p) => p.update(dt));
    this.powerUps.forEach((p) => p.update(dt));

    this.bullets = this.bullets.filter((b) => !b.dead);
    this.particles = this.particles.filter((p) => !p.dead);
    this.powerUps = this.powerUps.filter((p) => !p.dead);

    for (const p of this.powerUps) {
      if (!p.dead && dist(this.ship, p) < this.ship.radius + p.radius) {
        p.dead = true;
        this.ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          this.score += POINTS[a.size];
          this.explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!this.powerUpSpawned) {
            this.killsSinceSpawn++;
            const guaranteed = this.killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              this.powerUps.push(new PowerUp(a.x, a.y));
              this.powerUpSpawned = true;
            }
          }
        }
      }
    }
    this.asteroids = this.asteroids.filter((a) => !a.dead).concat(newAsteroids);
    this.bullets = this.bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (this.ship.invincible <= 0) {
      for (const a of this.asteroids) {
        if (dist(this.ship, a) < this.ship.radius + a.radius * 0.82) {
          this.killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (this.asteroids.length === 0) this.nextLevel();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────

  private drawLifeIcon(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  private drawHUD(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#fff";
    ctx.font = "15px monospace";

    ctx.textAlign = "left";
    ctx.fillText(`SCORE  ${this.score}`, 14, 26);

    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${this.level}`, W / 2, 26);

    for (let i = 0; i < this.lives; i++) this.drawLifeIcon(W - 16 - i * 22, 18);

    if (this.ship.tripleShot > 0) {
      ctx.textAlign = "left";
      ctx.fillStyle = "#0ff";
      ctx.fillText(`3x  ${this.ship.tripleShot.toFixed(1)}s`, 14, 46);
    }
  }

  private drawOverlay(title: string, sub: string): void {
    const ctx = this.ctx;
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 46px monospace";
    ctx.fillText(title, W / 2, H / 2 - 18);
    ctx.font = "18px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText(sub, W / 2, H / 2 + 22);
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    this.particles.forEach((p) => p.draw(ctx));
    this.asteroids.forEach((a) => a.draw(ctx));
    this.powerUps.forEach((p) => p.draw(ctx));
    this.bullets.forEach((b) => b.draw(ctx));
    this.ship.draw(ctx);

    this.drawHUD();

    if (this.state === "gameover")
      this.drawOverlay("GAME OVER", `PUNTAJE: ${this.score}   —   PULSA JUGAR DE NUEVO`);
  }
}
