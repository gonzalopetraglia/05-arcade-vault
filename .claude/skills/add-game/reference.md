# Contratos del Arcade Vault

Lo que una spec de juego nuevo tiene que respetar. Verificado contra el código; si algo aquí no cuadra con el repo, manda el repo.

## Tipos del catálogo — `lib/games.ts`

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
};

export const GAMES: Game[];
export const CATS: string[]; // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export function getGame(id: string): Game | undefined;
export function formatScore(n: number): string; // Intl.NumberFormat("es-ES")
```

`Game` **no** tiene `best` ni `plays`. Esos dos números salen de la vista `game_stats` y viajan en `GameWithStats` (`app/api/games/route.ts`).

Ids ocupados y su `sort_order` (0..8): `bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `asteroides`, `duelo-pixel`.

## API del motor — patrón de `lib/games/asteroids/engine.ts`

```ts
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
  constructor(canvas: HTMLCanvasElement, opts: EngineOptions);
  start(): void;
  pause(): void;
  resume(): void;      // pone lastTime = null: el primer dt tras la pausa es 0
  restart(): void;
  forceGameOver(): void;  // botón FIN
  setKey(code: string, down: boolean): void;  // teclado y táctil entran por aquí
  destroy(): void;     // cancela el rAF pendiente
}
```

Reglas heredadas de la SPEC 05:

- `onState` se llama **solo cuando algún campo cambia** respecto al frame anterior, no en cada frame: cada llamada provoca un `setState`.
- Las constantes del mundo (`W`, `H`) viven en el módulo de entidades; el búfer del canvas es fijo y el CSS lo estira.
- El motor es la única fuente de `score`, `lives` y `level`. React nunca los calcula.

## Shell del player — `components/player-shell.tsx`

```ts
type Props = {
  game: Game;
  score: number;
  lives: number;
  level: number;
  paused: boolean;
  over: boolean;
  onTogglePause: () => void;
  onEnd: () => void;
  onRestart: () => void;
  children: ReactNode; // lo que se ve dentro de la pantalla del CRT
};
```

El shell ya trae cabecera de HUD, marco CRT, botones PAUSA/FIN/SALIR, cartel de pausa y el modal de fin de partida con el guardado. Un player nuevo no duplica nada de eso.

## Guardado de puntuaciones — `app/api/scores/route.ts`

Ya existe y no se toca. `saveScore` del `session-provider` hace el `POST`.

```ts
// POST /api/scores   body: { game: string; score: number; name: string }
type PostScoreResponse =
  | { ok: true; entry: ScoreEntry }
  | { ok: false; error: "INVALID_BODY" | "UNKNOWN_GAME" | "RATE_LIMITED" | "DB_ERROR" };

// GET /api/scores?game=<id>&limit=<1..50, por defecto 10>
export type ScoreEntry = { id: string; rank: number; name: string; score: number; at: string };
```

Validación del `POST`, en este orden: límite de 10 inserciones por minuto y IP (mapa en memoria) → `score` entero entre 0 y 10.000.000 → nombre recortado, en mayúsculas, 10 caracteres, filtrado a `[A-Z0-9 ÁÉÍÓÚÜÑ.-]` → el juego debe existir en la tabla `games`. El `INSERT` lo hace el servidor con la clave secreta; la RLS deniega la escritura a la clave publicable.

Consumidores de lectura ya hechos: `lib/use-catalog.ts` (`GET /api/games`), `lib/use-top-scores.ts` (`GET /api/scores`), `components/game-leaderboard.tsx`, `components/hall-of-fame.tsx`.

## Migración de seed — plantilla

`supabase/migrations/000N_seed_<id>.sql`, con el mismo estilo que `0002_seed_games.sql`:

```sql
-- SPEC NN — Seed del juego <ID>.
--
-- `on conflict (id) do nothing` hace la migración reejecutable. Esto siembra,
-- no sincroniza.

insert into public.games (id, title, short, "long", cat, cover, color, sort_order) values
  (
    '<id>',
    '<TÍTULO>',
    '<frase corta>',
    '<descripción larga>',
    '<ARCADE|PUZZLE|SHOOTER|VERSUS>',
    '<cover-*>',
    '<cyan|magenta|yellow|green>',
    <siguiente sort_order libre>
  )
on conflict (id) do nothing;
```

`long` va entrecomillado porque es palabra reservada. Se aplica con el MCP de Supabase (`apply_migration`) **y** el archivo queda commiteado en `supabase/migrations/`.

## Clases CSS reutilizables — `app/globals.css`

- Player y HUD: `.av-player`, `.player-hud`, `.hud-stat` (`.l`, `.v`, `.lives`, `.level`), `.hud-actions`.
- Marco CRT: `.crt`, `.crt-screen`, `.crt-content`, `.crt-bottom`, `.led`.
- Modal de fin de partida: `.modal-bd`, `.modal`, `.final`, `.input-row`, `.actions`, `.toast-saved`, `.toast-error`.
- Controles táctiles: `.touch-pad` (`display: none` salvo bajo `@media (pointer: coarse)`), `.touch-pad.left`, `.touch-pad.right`, `.touch-btn`, `.touch-btn.rot`.
- Portadas: `.cover-bg` más `.cover-bricks`, `.cover-tetro`, `.cover-snake`, `.cover-glot`, `.cover-invaders`, `.cover-rocas`, `.cover-rana`, `.cover-duelo`.
- Botones: `.btn` con `.magenta`, `.yellow`, `.ghost`, `.lg`, `.xl`, `.pulse`, `.press`.

El `<canvas>` de asteroides no lleva clase: estilos en línea (`width: 100%`, `aspect-ratio: 4 / 3`, `touch-action: none`) dentro de un envoltorio `position: absolute; inset: 0`.
