# SPEC 12 — CROAC, el quinto juego real

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 05, SPEC 06, SPEC 09, SPEC 10
> **Fecha:** 2026-10-28
> **Objetivo:** Diseñar desde cero CROAC, un juego de cruzar carriles (carretera y río) en TypeScript sobre la API de motor del Vault, jugable en `/jugar/croac` con teclado y con el mando táctil común, con su entrada propia de catálogo, su migración de seed y su puntuación guardada por el flujo que ya existe.

> **Ubicación.** Este archivo nació en `specs/game-jam/frogger/` para otra web. Antes de implementarlo se mueve a `specs/12-juego-croac.md` y se pasa a `Aprobado`: `/spec-impl` y `/spec-impl-game` solo trabajan con `specs/NN-slug.md`.

---

## Por qué existe esta spec

La primera versión de esta spec se escribió para otra plataforma y no encajaba en el Vault: pedía una play-page propia, un único componente con todo dentro, HUD pintado en el canvas, inserción en Supabase desde el navegador y SQL ejecutado a mano. Esta versión conserva la idea —una rana que cruza carretera y río por celdas— y la reescribe sobre los contratos que fijaron las SPEC 05, 06, 09 y 10.

Como SNAKE (SPEC 09), **no parte de un juego existente**: no hay `game.js` que traducir ni assets que copiar. Es un juego original del género "cruzar carriles", con nombre, reglas de puntuación y apariencia propios; la mecánica se define aquí y el código se escribe directamente en su forma final.

Consecuencias de encajarlo en la plataforma:

- **Se juega en `/jugar/croac`.** No hay ruta nueva: el player se registra en el mapa `PLAYERS` de `app/jugar/[id]/page.tsx`.
- **Motor y React separados.** El motor vive en `lib/games/croac/` y no sabe nada de React; `components/games/croac-canvas.tsx` lo monta y `components/games/croac-player.tsx` lo cablea con `PlayerShell`.
- **El motor nunca pinta HUD ni overlays.** Puntuación, vidas y nivel los muestra `PlayerShell` a partir de `onState`. El canvas solo dibuja el mundo.
- **La puntuación se guarda por `POST /api/scores`.** Lo hace el modal de fin de partida de `PlayerShell` con `saveScore()` del `session-provider`. El navegador no escribe en Supabase: la RLS solo abre `select`.
- **La fila del catálogo entra por migración.** `supabase/migrations/0006_seed_croac.sql`, aplicada con el MCP de Supabase y commiteada.

---

## Alcance

**Dentro:**

- Juego nuevo en `lib/games/croac/`: `entities.ts` (constantes del mundo, rana, colores), `lanes.ts` (definición de carriles y su avance) y `engine.ts` con la clase `CroacEngine`.
- `components/games/croac-canvas.tsx`: componente cliente que monta el `<canvas>`, instancia el motor, conecta el teclado y lo destruye al desmontar.
- `components/games/croac-player.tsx`: el player, montado sobre `components/player-shell.tsx`, con el mando táctil común (`gamepad={{ setKey }}`, SPEC 10).
- Entrada nueva `croac` en `GAMES` y en `IMPLEMENTED_GAME_IDS` (`lib/games.ts`).
- Migración `supabase/migrations/0006_seed_croac.sql` con `sort_order` 12, aplicada por el MCP de Supabase (`apply_migration`) y commiteada.
- `app/jugar/[id]/page.tsx`: entrada `croac` en el mapa `PLAYERS` que ya existe.
- Fila `croac` en `references/implemented-games.md`.
- `.claude/skills/add-game/reference.md`: `croac` en la lista de ids ocupados, siguiente `sort_order` 13, siguiente migración `0007`, y `croac` en `IMPLEMENTED_GAME_IDS`.

**Fuera de alcance (para specs futuras):**

- Skins (`clasico` / `neon` / `retro`). Las pone el subagente `skin-designer` después; esta spec solo deja todos los colores en un objeto `COLORS` para que extraerlos sea mecánico.
- Temporizador por rana. Necesita un hueco en el HUD de `PlayerShell` que hoy no existe, y el motor no puede pintarlo.
- Sonido.
- Bonus en los nenúfares (moscas), enemigos en el río o en las orillas, animaciones de muerte elaboradas.
- Renombrar o retirar la entrada simulada `ranaria`.
- Auth real, rutas de API nuevas, cambios en la RLS o en el esquema de `scores`.
- Componente genérico de canvas compartido entre juegos.
- Tests automatizados.

---

## Modelo de datos

### Entrada de catálogo — `lib/games.ts`

```ts
{
  id: "croac",
  title: "CROAC",
  short: "Salta carriles, cruza el río y llena la charca.",
  long: "Una rana tiene que cruzar cinco carriles de tráfico y un río de troncos y hojas que se hunden para llegar a los cinco nenúfares del otro lado. Cada fila nueva suma 10 puntos y cada nenúfar 100; llena los cinco y el tráfico acelera. Tres vidas para llegar lo más lejos posible.",
  cat: "ARCADE",
  cover: "cover-rana",
  color: "green",
}
```

`IMPLEMENTED_GAME_IDS` pasa a `["asteroides", "tetris", "arkanoid", "snake", "croac"]`. `Game` no lleva `best` ni `plays`: esos dos números vienen de la vista `game_stats` por `GET /api/games`.

### Migración — `supabase/migrations/0006_seed_croac.sql`

```sql
-- SPEC 12 — Seed de CROAC.
--
-- La decimotercera entrada del catálogo, con `sort_order` 12 para que quede al
-- final, detrás de SNAKE. Convive con `ranaria`, que describe el mismo género:
-- renombrarla o borrarla rompería /games/ranaria, /jugar/ranaria y las
-- puntuaciones ya guardadas con esa clave.
--
-- `on conflict (id) do nothing` hace la migración reejecutable, igual que
-- 0002–0005. Esto siembra, no sincroniza.

insert into public.games (id, title, short, "long", cat, cover, color, sort_order) values
  (
    'croac',
    'CROAC',
    'Salta carriles, cruza el río y llena la charca.',
    'Una rana tiene que cruzar cinco carriles de tráfico y un río de troncos y hojas que se hunden para llegar a los cinco nenúfares del otro lado. Cada fila nueva suma 10 puntos y cada nenúfar 100; llena los cinco y el tráfico acelera. Tres vidas para llegar lo más lejos posible.',
    'ARCADE',
    'cover-rana',
    'green',
    12
  )
on conflict (id) do nothing;
```

### Constantes del mundo — `lib/games/croac/entities.ts`

```ts
export const CELL = 50; // píxeles por celda
export const COLS = 16;
export const ROWS = 12;
export const W = COLS * CELL; // 800
export const H = ROWS * CELL; // 600

// Filas (0 = arriba).
export const ROW_GOALS = 0; // nenúfares
export const ROW_RIVER_TOP = 1; // río: filas 1–4
export const ROW_RIVER_BOT = 4;
export const ROW_BANK = 5; // orilla del medio, segura
export const ROW_ROAD_TOP = 6; // carretera: filas 6–10
export const ROW_ROAD_BOT = 10;
export const ROW_START = 11; // orilla de salida, segura

export const GOAL_COLS = [1, 4, 8, 11, 14] as const; // un nenúfar por celda
export const START_COL = 7;

export const LIVES = 3;
export const POINTS_ROW = 10; // por cada fila nueva alcanzada en este intento
export const POINTS_GOAL = 100; // por nenúfar ocupado
export const POINTS_ROUND = 500; // por llenar los cinco

export const HOP_MS = 120; // duración del salto de una celda
export const DEATH_PAUSE = 1000; // ms de status "dead" antes de revivir
export const SPEED_STEP = 0.15; // +15 % de velocidad por nivel
export const SPEED_MAX = 2; // tope: el doble de la velocidad base

export const COLORS = {/* fondo por zona, coches, troncos, hojas, nenúfares, rana… */};
```

El búfer es de 800×600, el mismo 4:3 que ASTEROIDES, ARKANOID y SNAKE, así que la pantalla del CRT sirve sin tocar estilos. Ningún módulo del juego tiene literales de color fuera de `COLORS`.

### Rana

```ts
export type Dir = "up" | "down" | "left" | "right";

type Frog = {
  x: number; // borde izquierdo en píxeles; continuo, porque el río la arrastra
  row: number; // fila entera
  hop: { from: { x: number; row: number }; to: { x: number; row: number }; t: number } | null;
  bestRow: number; // fila más alta alcanzada en este intento (para POINTS_ROW)
};
```

En tierra y carretera `x` siempre es múltiplo de `CELL`. En el río la arrastra el tronco u hoja que la sostiene, así que puede quedar entre celdas; un salto lateral la mueve exactamente `CELL` píxeles desde donde esté.

### Carriles — `lib/games/croac/lanes.ts`

```ts
type LaneKind = "road" | "river";
type PieceKind = "car" | "truck" | "log" | "leaf";

export type LaneDef = {
  row: number;
  kind: LaneKind;
  dir: 1 | -1;
  speed: number; // px/s a nivel 1
  pieces: { kind: PieceKind; len: number; gap: number }[]; // patrón, en celdas
};

export type Piece = { kind: PieceKind; x: number; len: number; phase?: number };
```

Patrón base (a nivel 1; las velocidades se multiplican por `min(SPEED_MAX, 1 + SPEED_STEP × (level − 1))`):

| Fila | Tipo  | Sentido | px/s | Piezas                                    |
| ---- | ----- | ------- | ---- | ----------------------------------------- |
| 10   | road  | ←       | 60   | coches de 1 celda, hueco 3                |
| 9    | road  | →       | 80   | coches de 1 celda, hueco 4                |
| 8    | road  | ←       | 50   | camiones de 2 celdas, hueco 4             |
| 7    | road  | →       | 110  | coches de 1 celda, hueco 5                |
| 6    | road  | ←       | 70   | camiones de 3 celdas, hueco 5             |
| 4    | river | →       | 50   | troncos de 3 celdas, hueco 3              |
| 3    | river | ←       | 60   | hojas en grupos de 2, hueco 3 (se hunden) |
| 2    | river | →       | 80   | troncos de 4 celdas, hueco 3              |
| 1    | river | ←       | 55   | hojas en grupos de 3, hueco 2 (se hunden) |

El patrón de cada carril se repite hasta cubrir `W` más la pieza más larga; la longitud total del bucle es la suma de `len + gap` del patrón repetido. Cuando una pieza sale por un lado reaparece por el otro con la posición en módulo de esa longitud, así que los huecos se conservan siempre y todos los carriles son atravesables.

Las hojas tienen un ciclo propio por grupo, desfasado con `phase`: 4 s a flote → 0,6 s de aviso (se pintan más claras) → 1,2 s hundidas. Hundidas no sostienen a la rana.

### Estado que el motor emite al HUD

```ts
export type CroacState = {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
};
```

`onState` se llama **solo cuando algún campo cambia** respecto al frame anterior. El motor es la única fuente de `score`, `lives` y `level`; React nunca los calcula.

### API pública del motor — `lib/games/croac/engine.ts`

Calcada de `SnakeEngine`:

```ts
type EngineOptions = {
  onState: (s: CroacState) => void;
  onGameOver: (finalScore: number) => void;
};

export class CroacEngine {
  constructor(canvas: HTMLCanvasElement, opts: EngineOptions);
  start(): void;
  pause(): void;
  resume(): void; // lastTime = null: el primer dt tras la pausa es 0
  restart(): void;
  forceGameOver(): void; // botón FIN
  setKey(code: string, down: boolean): void; // teclado y mando táctil entran por aquí
  destroy(): void; // cancela el rAF pendiente
}
```

---

## Plan de implementación

1. **`lib/games/croac/entities.ts`.** Las constantes de arriba, `COLORS`, el tipo `Frog` y `drawFrog(ctx, frog, colors)`. El dibujo recibe contexto y colores por parámetro; ningún módulo lee un global.
2. **`lib/games/croac/lanes.ts`.** `LANES: LaneDef[]` con la tabla de arriba, `buildLane(def, level): Piece[]` que expande el patrón y reparte las fases de las hojas, `stepLane(pieces, def, level, dt)` que avanza y envuelve, `isSunk(piece, t)` y `drawLane(ctx, pieces, def, colors, t)`. Verificación: ningún carril tiene dos piezas solapadas y todos dejan al menos un hueco de una celda.
3. **Dibujo del mundo, solo con primitivas canvas.** Fondo por zonas (agua, asfalto con líneas discontinuas, orillas de hierba), coches y camiones como rectángulos redondeados con ventanilla, troncos con vetas, hojas como círculos con muesca (más claras en aviso, contorno tenue hundidas), nenúfares en la fila 0 sobre agua oscura con una rana sentada si están ocupados. La rana es una elipse con dos ojos; durante el salto se pinta un poco más grande. **Nada de texto, marcadores, barras de tiempo, vidas ni carteles de pausa o fin**: eso es de `PlayerShell`.
4. **`lib/games/croac/engine.ts` — bucle.** `requestAnimationFrame` con `dt` en segundos, topado a 0,1 s para que un salto de pestaña no teletransporte el tráfico. Guarda el id del `rAF` para cancelarlo en `pause()` y `destroy()`. Igual que SNAKE, un flag `held` hace que un `pause()` llegado antes de `start()` (el "toca para empezar" del móvil, o PAUSA nada más entrar) no se deshaga solo: `start()` inicializa, emite el estado y, si está retenido, pinta un fotograma y espera a `resume()`.
5. **Entrada.** `setKey` acepta `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` (y `KeyW/A/S/D` como alias). Un salto se dispara solo en la transición de suelta a pulsada: el motor guarda qué teclas están abajo, así que la autorrepetición del teclado y un dedo apoyado en la cruceta no encadenan saltos. Si llega una pulsación mientras la rana está en el aire, se guarda en un búfer de una sola entrada y se consume al aterrizar. Con `status !== "playing"` la entrada se ignora. No hay reinicio ni pausa por tecla: P y Esc no hacen nada en el motor.
6. **Salto.** Dura `HOP_MS`. Hacia arriba o abajo cambia de fila y, en tierra o carretera, alinea `x` a la celda más cercana; a los lados mueve `CELL` píxeles. Un salto que sacaría a la rana por los bordes laterales o por debajo de `ROW_START` no se inicia. Durante el salto la rana no colisiona; todo se resuelve al aterrizar y luego cada frame.
7. **Reglas al aterrizar y en cada frame (con la rana en el suelo).**
   - Carretera: si la caja de la rana (recortada 8 px por lado) se solapa con un coche o camión de su fila, muere. Se comprueba en cada frame: un coche puede atropellarla quieta.
   - Río: busca la pieza de su fila que contiene el centro de la rana. Sin pieza, o con una hoja hundida, muere. Con pieza, la rana se desplaza con ella (`x += dir × speed × dt`). Si el centro sale de `[0, W]` arrastrada, muere.
   - Fila 0: el nenúfar es el de `GOAL_COLS` cuyo centro dista menos de `CELL / 2` del centro de la rana. Libre: se ocupa, `+POINTS_GOAL`, y la rana vuelve a la salida. Ocupado o fuera de un nenúfar: muere.
   - Cada vez que `row` baja de `bestRow` (fila nueva hacia arriba en este intento) suma `POINTS_ROW` y actualiza `bestRow`. Volver atrás y avanzar otra vez no puntúa dos veces.
8. **Ronda completa.** Con los cinco nenúfares ocupados: `+POINTS_ROUND`, `level + 1`, nenúfares vacíos, carriles reconstruidos con `buildLane(def, level)` y rana en `(START_COL, ROW_START)`.
9. **Muerte y vidas.** Resta una vida y pone `status: "dead"` durante `DEATH_PAUSE` (el tráfico sigue moviéndose; la rana se pinta aplastada o hundida). Al revivir, la rana vuelve a `(START_COL, ROW_START)` con `bestRow = ROW_START`; puntuación, nivel y nenúfares ocupados **se conservan**. Con 0 vidas, `status: "gameover"`, el bucle se detiene y se llama `onGameOver(score)` una sola vez. `forceGameOver()` hace lo mismo desde cualquier estado.
10. **`components/games/croac-canvas.tsx`** con `"use client"`, siguiendo `snake-canvas.tsx`: `ref` al `<canvas>`, `useEffect` que crea el motor y devuelve `destroy()` en la limpieza, búfer de `W × H` multiplicado por `devicePixelRatio`, `keydown`/`keyup` en `window` con `preventDefault()` en las flechas y el espacio, pausa automática por `visibilitychange` y `blur` avisando a `onAutoPause`, y callbacks por ref para que un cambio de identidad en el padre no reinicie la partida. Sin controles táctiles propios.
11. **`components/games/croac-player.tsx`** sobre `components/player-shell.tsx`, siguiendo `snake-player.tsx` sin la parte de skins: estado `hud` inicial `{ score: 0, lives: LIVES, level: 1, status: "playing" }`, `paused`, `over`; `onTogglePause` llama `pause()`/`resume()`; `onEnd` llama `forceGameOver()`; `onRestart` llama `restart()`; `gamepad={{ setKey }}` con `setKey` estable por `useCallback`. HUD, marco CRT, botones PAUSA/FIN/SALIR, mando táctil y modal de fin de partida —con el guardado por `saveScore()` → `POST /api/scores`— vienen del shell y no se duplican.
12. **Registro.** `croac` en `IMPLEMENTED_GAME_IDS` y en `GAMES` (`lib/games.ts`), y `croac: CroacPlayer` en `PLAYERS` (`app/jugar/[id]/page.tsx`). El tipo `Record<ImplementedGameId, …>` obliga a hacer las dos cosas juntas.
13. **Seed.** `supabase/migrations/0006_seed_croac.sql` con el SQL del modelo de datos, aplicado con `apply_migration` del MCP de Supabase (proyecto `ovavqjmkteyaigcolbqv`). El `.sql` queda en el repo. Verificación: `curl localhost:3000/api/games` devuelve `croac`.
14. **Portada.** Ninguna clase CSS nueva: se reutiliza `.cover-rana`, que ya existe en `app/globals.css` y dibuja agua y una rana.
15. **Documentación.** Fila `croac` en `references/implemented-games.md` (`croac` · CROAC · ARCADE · green · "Salta carriles, cruza el río y llena la charca.") y `.claude/skills/add-game/reference.md` al día (ids ocupados, `sort_order` 13, migración `0007`).
16. **Verificación final.** `npm run lint` y `npm run build` sin errores.

---

## Criterios de aceptación

**Del juego:**

- [ ] La rana empieza en la fila de salida, columna 7, y no se mueve sola.
- [ ] Cada pulsación de flecha hace exactamente un salto de una celda en 120 ms; mantener la tecla pulsada no encadena saltos.
- [ ] La rana no puede salir por los laterales ni bajar de la fila de salida.
- [ ] Coches, camiones, troncos y hojas se mueven en bucle por sus carriles y reaparecen por el lado contrario sin perder los huecos.
- [ ] Un vehículo que toca a la rana la mata, también si la rana está quieta.
- [ ] En el río, la rana sobre un tronco u hoja a flote se desplaza con él; en el agua muere.
- [ ] Las hojas avisan antes de hundirse, y si se hunden con la rana encima, la rana muere.
- [ ] Si el río arrastra a la rana fuera de la pantalla, muere.
- [ ] Llegar a un nenúfar libre suma 100 puntos, lo marca ocupado y devuelve la rana a la salida; un nenúfar ocupado o la orilla entre nenúfares la matan.
- [ ] Cada fila nueva alcanzada en un intento suma 10 puntos una sola vez.
- [ ] Al llenar los cinco nenúfares se suman 500 puntos, sube el nivel, los nenúfares se vacían y el tráfico va un 15 % más rápido (hasta el doble como máximo).
- [ ] Al morir se pierde una vida, la puntuación y los nenúfares ocupados se conservan y la rana vuelve a la salida tras ~1 segundo.
- [ ] Con 0 vidas se abre el modal de fin de partida con la puntuación acumulada.
- [ ] El canvas no pinta texto, marcadores, vidas ni carteles: `grep -n "fillText" lib/games/croac` no devuelve nada.

**De la plataforma:**

- [ ] `npm run lint` y `npm run build` terminan sin errores ni advertencias de hidratación.
- [ ] `/games` muestra CROAC con la portada `cover-rana` y color `green`; `/games/croac` muestra su leaderboard.
- [ ] `/jugar/croac` carga el juego real; no existe ninguna ruta nueva bajo `app/`.
- [ ] `grep -rn "getElementById" lib components` no devuelve resultados: el canvas llega por `ref`.
- [ ] El HUD de `PlayerShell` y lo que ocurre en el canvas coinciden en todo momento.
- [ ] PAUSA congela el juego entero y REANUDAR no mata a la rana por el salto de tiempo; FIN abre el modal con la puntuación acumulada; JUGAR DE NUEVO reinicia al estado inicial.
- [ ] Salir de `/jugar/croac` no deja ningún `requestAnimationFrame` corriendo; volver a entrar no acelera el juego.
- [ ] En un dispositivo táctil aparece el mando común; la cruceta mueve la rana igual que las flechas y el juego espera al primer toque.
- [ ] Guardar en el modal hace `POST /api/scores` y la partida aparece en `/games/croac` y en `/salon`; si el `POST` falla, el modal muestra un error y no finge que se guardó.
- [ ] Ningún archivo del juego importa `lib/supabase/*`.
- [ ] `curl localhost:3000/api/games` devuelve `croac` con `best` y `plays` numéricos.
- [ ] `curl "localhost:3000/api/scores?game=croac"` devuelve la partida guardada.
- [ ] Reejecutar `0006_seed_croac.sql` no duplica ninguna fila.
- [ ] `/jugar/asteroides`, `/jugar/tetris`, `/jugar/arkanoid`, `/jugar/snake` y `/jugar/ranaria` siguen funcionando igual que antes.

---

## Decisiones

- **Sí:** juego original del género, con nombre propio (CROAC), puntuación propia y nenúfares en lugar de una recreación de un arcade concreto. El género —cruzar carriles de tráfico y un río— es lo que encaja en el catálogo; copiar un juego existente no aporta nada.
- **Sí:** id nuevo `croac`, con `ranaria` intacta como simulacro. Es lo mismo que se hizo con `snake` junto a `serpentina`. Renombrar `ranaria` rompería `/games/ranaria` y las puntuaciones ya guardadas con esa clave.
- **No:** reutilizar el id `ranaria`. Ahorra una migración, pero mezcla las puntuaciones del simulacro con las reales, y su fila ya existe: `on conflict do nothing` no cambiaría sus textos.
- **Sí:** jugar en `/jugar/croac` por el mapa `PLAYERS`. Es la única ruta de juego de la plataforma.
- **No:** play-page propia (`app/games/<id>/play/page.tsx`). Duplicaría la ruta dinámica y se saltaría el filtro de `visibleGames()`.
- **Sí:** motor en `lib/games/croac/` + `croac-canvas.tsx` + `croac-player.tsx`. Es el reparto de los cuatro juegos anteriores, y el que esperan `skin-designer` y `mobile-porter`.
- **No:** un único componente con el bucle dentro. Ata el motor a React y no deja reutilizar `PlayerShell`.
- **No:** `dynamic(..., { ssr: false })`. El canvas solo toca `window` dentro de `useEffect`, como en los demás juegos.
- **Sí:** HUD solo en `PlayerShell`. El motor emite `onState` y nunca pinta texto.
- **No:** doble HUD dentro del canvas. Ningún juego del Vault lo tiene, y al móvil (SPEC 10) le sobra.
- **Sí:** guardar con el modal de `PlayerShell` → `saveScore()` → `POST /api/scores`. La RLS deniega la escritura a la clave publicable a propósito; el Route Handler valida y escribe con la clave secreta.
- **No:** insertar en Supabase desde el navegador ni leer `av_player_name`. Fallaría por RLS y la sesión del Vault es `av_user`.
- **Sí:** migración de seed `0006_seed_croac.sql` aplicada por MCP y commiteada. Cada juego tiene la suya.
- **No:** SQL pegado a mano en el SQL Editor. No queda rastro en el repo.
- **Sí:** grilla 16×12 con celda de 50 px sobre un búfer de 800×600. Es el 4:3 del marco CRT y la celda es grande para tocar en móvil.
- **No:** canvas vertical (640×560 o similar). Rompe el 4:3 del marco y deja franjas laterales.
- **Sí:** saltos discretos de una celda con `x` continuo en el río. La rana se mueve por celdas, pero el río la arrastra; sin `x` continuo habría que redondear y la rana daría tirones.
- **Sí:** 3 vidas, como ASTEROIDES, ARKANOID y SNAKE, y la puntuación se conserva al morir.
- **Sí:** hojas que se hunden con aviso previo. Es lo que hace del río algo más que esperar un tronco, y el aviso evita muertes que el jugador no puede leer.
- **No:** temporizador por rana. Sin hueco en el HUD del shell, el motor tendría que pintarlo. Queda para una spec que amplíe `PlayerShell`.
- **Sí:** mando táctil común desde el principio (`gamepad={{ setKey }}`), sin botones A/B. El juego solo necesita la cruceta; `mobile-porter` lo audita después.
- **Sí:** colores en un único `COLORS`. Así `skin-designer` los convierte en paleta sin buscar literales por el motor.
- **Sí:** reutilizar `.cover-rana`. La portada ya dibuja agua y una rana; no hace falta CSS nuevo.
- **No:** componente genérico de canvas. YAGNI.

---

## Riesgos

| Riesgo                                                                      | Mitigación                                                                                                |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Un salto de pestaña adelanta el tráfico de golpe y mata a la rana al volver | `dt` topado a 0,1 s y pausa automática por `visibilitychange` y `blur`.                                   |
| La autorrepetición del teclado encadena saltos                              | El salto solo se dispara en la transición de suelta a pulsada; el búfer guarda como mucho una pulsación.  |
| Un carril queda sin huecos o con piezas solapadas al envolver               | El bucle de cada carril se mide con el patrón completo y las posiciones van en módulo de esa longitud.    |
| La rana queda entre dos celdas al salir del río y "flota" sobre la orilla   | Al aterrizar en tierra o carretera, `x` se alinea a la celda más cercana.                                 |
| PAUSA o el "toca para empezar" llegan antes de `start()`                    | Flag `held`, como en SNAKE: el motor pinta un fotograma y espera a `resume()`.                            |
| A velocidad alta un carril se vuelve imposible                              | Las velocidades tienen tope en `SPEED_MAX` (el doble de la base) y los huecos no se encogen con el nivel. |

---

## Lo que **no** entra en esta spec

- Skins (las aplica `skin-designer` después).
- Temporizador por rana.
- Sonido.
- Bonus, enemigos extra o animaciones de muerte elaboradas.
- Retirar o renombrar la entrada simulada `ranaria`.
- Tests automatizados.

Cada una de ellas, si llega, va en su propia spec.
