# SPEC GJ — CRUCE ANFIBIO, variante B: contrarreloj de ida y vuelta

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 05, SPEC 06, SPEC 09
> **Fecha:** 2026-10-04
> **Objetivo:** Diseñar desde cero un juego de cruzar carretera y río en el que una rana va y vuelve entre dos orillas contra un reloj global que solo se recarga cruzando, jugable en `/jugar/cruce-anfibio` con teclado y controles táctiles, con su entrada de catálogo y su puntuación guardada por el flujo que ya existe.

---

## Por qué existe esta spec

Sale del tema de game jam _"ranaria: cruza la carretera y el río sin convertirte en papilla"_. La idea es un juego de cruce por carriles: abajo, una carretera con tráfico que atropella; arriba, un río en el que solo se sobrevive encima de troncos y tortugas.

El catálogo ya tiene una entrada simulada, `ranaria`, que describe este género sin motor detrás. Esta spec **no** la reutiliza. Crea un id nuevo, `cruce-anfibio`, igual que `tetris` convive con `caida`, `arkanoid` con `bloque-buster` y `snake` con `serpentina`. Si se renombrara `ranaria`, se romperían `/games/ranaria`, `/jugar/ranaria` y las puntuaciones ya guardadas con esa clave.

Ningún juego implementado tiene esta mecánica. ASTEROIDES, TETRIS, ARKANOID y SNAKE no tienen carriles con objetos en movimiento ni plataformas que transportan al jugador.

Hay tres variantes de este juego en `specs/game-jam/cruce-anfibio/`. Esta es la **B, el giro de reglas**:

- **A:** cinco nenúfares por nivel y 30 s por rana. Es la clásica.
- **B (esta):** no hay nenúfares. Las dos orillas son seguras de punta a punta, y la rana va y vuelve entre ellas.
  - Cada cruce completo puntúa según una **racha** que crece mientras no mueras.
  - Un **reloj global** de 60 s sigue bajando. Cada cruce le devuelve 8 s, y las moscas, 3 s.
  - Si el reloj llega a cero, la partida termina, queden las vidas que queden.

  Cambian la condición de fin (el tiempo, además de las vidas), el recurso que se gestiona (los segundos) y la puntuación (premia no morir).

- **C:** nenúfares con más sistemas: enemigos con comportamientos distintos, fases y combos.

Como en SNAKE, el juego se diseña desde cero y no hay `game.js` que traducir. Además, no hay assets: todo se dibuja con primitivas de canvas.

---

## Alcance

**Dentro:**

- Juego nuevo en `lib/games/cruce-anfibio/`:
  - `lanes.ts`, con la tabla de carriles.
  - `entities.ts`, con las constantes del mundo, la rana, los vehículos, las plataformas y la mosca, y su dibujo.
  - `engine.ts`, con la clase `CruceAnfibioEngine`.
- `components/games/cruce-anfibio-canvas.tsx`: componente cliente que monta el `<canvas>`, instancia el motor, conecta teclado y controles táctiles, y lo destruye al desmontar.
- `components/games/cruce-anfibio-player.tsx`: el player, montado sobre `components/player-shell.tsx`.
- Controles táctiles bajo `@media (pointer: coarse)`: cruceta de cuatro botones.
- Barra del reloj global e indicador de racha dibujados dentro del canvas.
- Entrada nueva `cruce-anfibio` en `GAMES` (`lib/games.ts`), con `cover-rana`.
- Migración `supabase/migrations/0006_seed_cruce-anfibio.sql` con `sort_order` 12, aplicada por el MCP de Supabase y commiteada.
- `app/jugar/[id]/page.tsx`: entrada `"cruce-anfibio"` en el mapa `PLAYERS`.
- Fila nueva en `references/implemented-games.md`.

**Fuera de alcance (para specs futuras):**

- Sonido. No hay assets de audio.
- Nenúfares, enemigos en el río o en la mediana, fases visuales y rana acompañante.
- Mostrar el reloj o la racha en el HUD de `PlayerShell`.
- Retirar, renombrar o portar la entrada simulada `ranaria`.
- Portada propia `cover-cruce-anfibio`.
- Auth real, rutas de API nuevas, cambios en la RLS o en el esquema de `scores`.
- Tests automatizados.

---

## Modelo de datos

No se persiste nada nuevo aparte de una fila en `public.games`. Las puntuaciones se guardan con el contrato de la SPEC 06 (`POST /api/scores`, cuerpo `{ game, score, name }`), con `game: "cruce-anfibio"`.

### Entrada de catálogo — `lib/games.ts`

```ts
{
  id: "cruce-anfibio",
  title: "CRUCE ANFIBIO",
  short: "Cruza la carretera y el río sin hacerte papilla.",
  long: "Ida y vuelta contra el reloj: una rana cruza carretera y río de orilla a orilla mientras un reloj de 60 segundos se consume. Cada cruce te devuelve 8 segundos y vale más cuanto más larga sea tu racha sin morir; las moscas dan 3 segundos extra. Si el reloj llega a cero, se acabó, te queden las vidas que te queden.",
  cat: "ARCADE",
  cover: "cover-rana",
  color: "green",
}
```

`Game` no lleva `best` ni `plays`: esos dos números vienen de la vista `game_stats` por `GET /api/games`.

### Constantes del mundo — `lib/games/cruce-anfibio/entities.ts`

```ts
export const CELL = 50; // alto de cada fila y paso horizontal del salto
export const COLS = 16;
export const ROWS = 12;
export const W = COLS * CELL; // 800
export const H = ROWS * CELL; // 600

// Filas, de arriba abajo
export const ROW_TOP_BANK = 0; // orilla de arriba, segura entera
export const RIVER_ROWS = [1, 2, 3, 4, 5];
export const ROW_MEDIAN = 6; // mediana segura
export const ROAD_ROWS = [7, 8, 9, 10];
export const ROW_BOTTOM_BANK = 11; // orilla de abajo, segura entera

export const START_X = 400;
export const HOP_MS = 120; // duración de un salto; la entrada se encola mientras dura
export const FROG_HITBOX = 30; // lado del cuadrado de colisión de la rana

export const LIVES = 3;
export const DEATH_PAUSE = 1000; // ms de status "dead"; el reloj no corre mientras dura

export const CLOCK_START = 60_000; // ms del reloj global al empezar
export const CLOCK_MAX = 99_000; // tope del reloj
export const CLOCK_PER_CROSSING = 8_000;
export const CLOCK_PER_FLY = 3_000;

export const POINTS_ROW = 10; // por cada fila nueva hacia el destino en este intento
export const POINTS_CROSSING = 100; // multiplicado por la racha
export const STREAK_MAX = 10; // la racha deja de multiplicar en 10 (1000 por cruce)
export const POINTS_FLY = 50;
export const MAX_SCORE = 9_999_999; // por debajo del tope de POST /api/scores

export const FLY_RESPAWN_MS = 4_000; // espera entre una mosca y la siguiente
export const FLY_LIFE_MS = 6_000; // lo que dura una mosca sin comer
export const FLY_RADIUS = 25; // distancia al centro de la rana para comerla

export const SPEED_STEP = 0.1;
export const SPEED_MAX = 2.2;
export const DIVE_FROM_LEVEL = 3; // las tortugas empiezan a sumergirse en el nivel 3
```

El nivel y el ritmo se derivan de los cruces completados y no se guardan por separado. Un nivel es una ida y vuelta:

```ts
level = Math.floor(crossings / 2) + 1;
speedMul = Math.min(SPEED_MAX, 1 + (level - 1) * SPEED_STEP);
```

Convenciones:

- El origen está arriba a la izquierda.
- La rana se mueve por filas discretas, y su `x` es continua. Un salto lateral suma o resta 50 px y se limita a `[25, 775]`.
- En el río, la plataforma arrastra a la rana. Si la saca de `[0, W]`, la rana muere.
- Las velocidades van en px/s y se multiplican por `speedMul`.

### Carriles — `lib/games/cruce-anfibio/lanes.ts`

```ts
export type LaneKind = "car" | "truck" | "log" | "turtles";

export type LaneDef = {
  row: number;
  kind: LaneKind;
  dir: 1 | -1; // 1 = hacia la derecha
  speed: number; // px/s en el nivel 1
  len: number; // ancho de cada objeto en px
  count: number;
  spacing: number; // px entre el inicio de un objeto y el siguiente
};

// Cada carril cumple count * spacing >= W + len, para que al envolver no haya saltos.
export const LANES: LaneDef[] = [
  { row: 10, kind: "car", dir: -1, speed: 60, len: 50, count: 3, spacing: 300 },
  { row: 9, kind: "car", dir: 1, speed: 80, len: 50, count: 3, spacing: 300 },
  { row: 8, kind: "car", dir: -1, speed: 140, len: 50, count: 2, spacing: 450 },
  { row: 7, kind: "truck", dir: 1, speed: 50, len: 110, count: 2, spacing: 480 },
  { row: 5, kind: "turtles", dir: -1, speed: 55, len: 150, count: 4, spacing: 250 },
  { row: 4, kind: "log", dir: 1, speed: 45, len: 120, count: 4, spacing: 240 },
  { row: 3, kind: "log", dir: 1, speed: 70, len: 250, count: 3, spacing: 380 },
  { row: 2, kind: "turtles", dir: -1, speed: 60, len: 100, count: 4, spacing: 230 },
  { row: 1, kind: "log", dir: 1, speed: 55, len: 180, count: 4, spacing: 260 },
];

export const DIVE_CYCLE = { up: 2800, sinking: 500, under: 700 }; // 4000 ms en total
```

Desde el nivel 3, en cada carril de tortugas bucea el grupo de índice 0. En `up` y en `sinking` se puede pisar; en `sinking` se dibuja más oscuro, como aviso. En `under` la rana que esté encima se ahoga.

### Estructuras internas

```ts
export type DeathCause = "atropello" | "ahogo" | "arrastre" | "tiempo";

export type Frog = {
  x: number;
  row: number;
  hop: { fromX: number; fromRow: number; t: number } | null;
  facing: "up" | "down" | "left" | "right";
  heading: "up" | "down"; // sentido del cruce en curso
  bestProgress: number; // filas avanzadas hacia el destino en este intento
};

export type Mover = { x: number; len: number; lane: number; diving: boolean; phaseMs: number };

// La mosca está quieta en la mediana o va montada en un tronco (offset desde mover.x).
export type Fly =
  | { on: "median"; x: number; ttl: number }
  | { on: "log"; mover: number; offset: number; ttl: number };

export type Splat = { x: number; row: number; cause: DeathCause; t: number };
```

Los campos del motor que no van al HUD son `clockMs`, `streak` y `crossings`.

### Estado que el motor emite al HUD

```ts
export type CruceAnfibioState = {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
};
```

`onState` se llama **solo cuando algún campo cambia** respecto al frame anterior. El motor es la única fuente de `score`, `lives` y `level`. El reloj y la racha no van al HUD de React: se dibujan en el canvas, porque `PlayerShell` no tiene hueco para ellos y esta spec no lo toca.

### API pública del motor — `lib/games/cruce-anfibio/engine.ts`

Calcada de `AsteroidsEngine`:

```ts
type EngineOptions = {
  onState: (s: CruceAnfibioState) => void;
  onGameOver: (finalScore: number) => void;
};

export class CruceAnfibioEngine {
  constructor(canvas: HTMLCanvasElement, opts: EngineOptions);
  start(): void;
  pause(): void;
  resume(): void; // lastTime = null: el primer dt tras la pausa es 0
  restart(): void;
  forceGameOver(): void; // botón FIN
  setKey(code: string, down: boolean): void; // teclado y táctil entran por aquí
  destroy(): void; // cancela el rAF pendiente
}
```

---

## Plan de implementación

1. **`lib/games/cruce-anfibio/lanes.ts`.** `LaneDef`, la tabla `LANES` y `DIVE_CYCLE`. Solo datos.
2. **`lib/games/cruce-anfibio/entities.ts` — modelo.** Las constantes, los tipos y estas funciones puras:
   - `buildMovers(level)` reparte los objetos de cada carril y marca como buceador el grupo 0 de los carriles de tortugas si `level >= DIVE_FROM_LEVEL`.
   - `stepMovers(movers, dt, speedMul)` desplaza los objetos y envuelve con `count * spacing`.
   - `isSolid(mover)` devuelve `false` solo en la fase `under`.
   - `frogBox(frog)` devuelve el cuadrado de colisión.
   - `spawnFly(movers)` elige al 50 % la mediana, con `x` al azar en `[50, 750]`, o el centro de un tronco al azar de las filas 1, 3 o 4.
3. **`entities.ts` — dibujo con primitivas.** Todo lo que se dibuja recibe `ctx` por parámetro:
   - Las dos orillas y la mediana son franjas violeta oscuro (`#2a1440`). La orilla de destino late entre un 25 % y un 50 % de verde (`#00ff88`) con un periodo de 1 s.
   - La carretera es `#111118`, con líneas discontinuas de 20 px.
   - El río es `#06243a`.
   - Los coches son rectángulos redondeados de 50×34 px, en cian y magenta alternos por carril. Los camiones miden 110×38 px y son amarillos.
   - Los troncos son marrones (`#7a4a1e`) y miden 36 px de alto.
   - Las tortugas son círculos verde oliva de 20 px de radio, uno cada 50 px.
   - La rana es un círculo `#00ff88` de 18 px de radio con ojos, girada según `facing`.
   - La mosca es un punto negro de 5 px con dos alas blancas que parpadean cada 120 ms. En su último segundo de vida, parpadea entera.
   - La papilla son 8 círculos verdes y rojos que se expanden durante `DEATH_PAUSE`.
   - El reloj es una barra de 6 px de alto en el borde superior. Su ancho es proporcional a `clockMs / CLOCK_MAX`, y se pone magenta por debajo de 10 s.
   - La racha son hasta 10 puntos amarillos de 4 px de radio en la esquina superior derecha, uno por cada cruce de la racha.
4. **`lib/games/cruce-anfibio/engine.ts` — estado y bucle.** La clase guarda la rana, los objetos, la mosca, `clockMs`, `streak`, `crossings`, la puntuación, las vidas y la papilla.
   - El bucle es un `requestAnimationFrame` con `dt` topado a 100 ms. El id del `rAF` se guarda para cancelarlo en `pause()` y `destroy()`.
   - `resume()` pone `lastTime = null`.
   - `restart()` vuelve a 3 vidas, 0 puntos, `clockMs = CLOCK_START`, `streak = 0`, `crossings = 0`, y la rana en `(START_X, ROW_BOTTOM_BANK)` con `heading: "up"`.
   - No hay reinicio por tecla.
5. **Entrada y saltos.** `setKey` solo actúa en el flanco de bajada. `ArrowUp`/`KeyW`, `ArrowDown`/`KeyS`, `ArrowLeft`/`KeyA` y `ArrowRight`/`KeyD` piden un salto.
   - Un salto dura `HOP_MS`. Una pulsación durante el vuelo se guarda en un búfer de una entrada y se ejecuta al aterrizar.
   - No se puede saltar fuera de las filas 0 a 11.
   - Los saltos laterales se recortan a `[25, 775]`.
6. **Colisiones y río.** Se comprueban al aterrizar y en cada frame posterior. Durante el vuelo la rana es inmune.
   - **Carretera:** si `frogBox` solapa un vehículo de su fila, la causa es `"atropello"`.
   - **Río:** la rana está a salvo si su `x` cae dentro de `[mover.x, mover.x + len]` de un objeto sólido de su fila, y el objeto la arrastra. Si no hay ninguno, la causa es `"ahogo"`. Si el arrastre la saca de `[0, W]`, la causa es `"arrastre"`.
   - **Orillas y mediana:** son seguras en toda su anchura.
7. **Cruces, racha y puntuación.**
   - Cada fila nueva hacia el destino en este intento suma 10 puntos y actualiza `bestProgress`.
   - Al aterrizar en la orilla de destino, el cruce se completa:
     - `streak` sube en uno y se suman `100 × min(streak, 10)` puntos.
     - `clockMs` sube 8 s, con tope en 99 s.
     - `crossings` sube en uno.
     - `heading` se invierte y `bestProgress` vuelve a 0.
   - Si `level` cambia, se llama a `buildMovers(level)` y se conserva la fase de cada objeto para que nada salte de sitio.
   - La puntuación se recorta a `MAX_SCORE`.
8. **Moscas.** Hay como mucho una mosca a la vez.
   - Aparece `FLY_RESPAWN_MS` después de que la anterior se coma o caduque, y vive `FLY_LIFE_MS`.
   - La que va en un tronco se mueve con él.
   - Si el centro de la rana queda a 25 px o menos de la mosca, en la misma fila, la rana se la come: suma 50 puntos y 3 s de reloj, con tope en 99 s.
9. **Reloj, muerte y vidas.**
   - `clockMs` baja con `dt` solo en `status: "playing"`.
   - Cualquier muerte resta una vida, pone `streak = 0`, crea la papilla y pone `status: "dead"` durante `DEATH_PAUSE`. El tráfico sigue moviéndose, pero el reloj se detiene.
   - Al revivir, la rana vuelve a la orilla de la que salió en este cruce, con el mismo `heading`, `x = START_X` y `bestProgress = 0`.
   - Si `clockMs` llega a 0, la rana se hace papilla con la causa `"tiempo"` y, tras `DEATH_PAUSE`, la partida termina, queden las vidas que queden.
   - Con 0 vidas, o con el reloj a 0, se pasa a `status: "gameover"` y se llama a `onGameOver(score)`. `forceGameOver()` hace lo mismo a petición del botón FIN.
10. **`components/games/cruce-anfibio-canvas.tsx`** con `"use client"`:
    - `ref` al `<canvas>` y un `useEffect` que crea el motor y devuelve `destroy()`.
    - Búfer de 800×600 multiplicado por `devicePixelRatio`.
    - `preventDefault()` en las flechas y en WASD.
    - Pausa automática por `visibilitychange` y `blur`.
    - Canvas con `width: 100%`, `aspect-ratio: 4 / 3` y `touch-action: none`.
11. **Controles táctiles.** Una cruceta de cuatro `.touch-btn` dentro de `.touch-pad`. `pointerdown`, `pointerup` y `pointercancel` se traducen a `setKey("ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight", …)`.
12. **`components/games/cruce-anfibio-player.tsx`** sobre `components/player-shell.tsx`. HUD, marco CRT, botones y modal vienen del shell y no se duplican. `score`, `lives` y `level` salen del motor.
13. **Despacho.** Entrada `"cruce-anfibio": CruceAnfibioPlayer` en el mapa `PLAYERS` de `app/jugar/[id]/page.tsx`.
14. **Catálogo y seed.** Entrada `cruce-anfibio` al final de `GAMES` y `supabase/migrations/0006_seed_cruce-anfibio.sql`, con `insert into public.games … on conflict (id) do nothing` y `sort_order` 12. Se aplica con `apply_migration` y el `.sql` queda commiteado.
15. **Portada.** No hay CSS nuevo: se reutiliza `.cover-rana`.
16. **Registro.** Fila `cruce-anfibio | CRUCE ANFIBIO | ARCADE | green | Cruza la carretera y el río sin hacerte papilla.` en `references/implemented-games.md`.
17. **Verificación.** Ejecutar y comprobar:
    - `npm run lint` y `npm run build`.
    - `curl localhost:3000/api/games`.
    - Jugar una partida real y guardarla.
    - `curl "localhost:3000/api/scores?game=cruce-anfibio"`.
    - Que la partida aparece en `/salon` y que `plays` sube en la tabla de `/games`.

---

## Criterios de aceptación

**Del juego:**

- [ ] La partida empieza en el nivel 1, con 3 vidas, 0 puntos, el reloj a 60 s y la rana en `(400, fila 11)` con destino la orilla de arriba.
- [ ] Cada pulsación de flecha o de WASD produce exactamente un salto. Mantener la tecla pulsada no encadena saltos.
- [ ] Cada fila nueva hacia el destino suma exactamente 10 puntos. Retroceder y volver a avanzar no suma de nuevo.
- [ ] Llegar a la orilla de destino suma `100 × racha`: 100 en el primer cruce, 200 en el segundo seguido, y así hasta 1000 a partir del décimo.
- [ ] Cada cruce completo suma 8 s al reloj, sin pasar de 99 s, e invierte el destino. La orilla de destino es la que late en verde.
- [ ] Comerse una mosca suma exactamente 50 puntos y 3 s de reloj. Una mosca dura 6 s, y la siguiente aparece 4 s después.
- [ ] Tocar un vehículo, caer al agua o salir arrastrado de la pantalla mata a la rana.
- [ ] Morir resta una vida, pone la racha a 0 y devuelve a la rana a la orilla de la que salió, tras 1 s de papilla con el reloj detenido.
- [ ] El reloj solo baja durante el juego. Al llegar a 0, la partida termina aunque queden vidas.
- [ ] Con 0 vidas se abre el modal de fin de partida con la puntuación acumulada.
- [ ] El nivel sube con cada ida y vuelta (2 cruces). Las velocidades se multiplican por `min(2.2, 1 + 0.1 × (nivel − 1))`.
- [ ] Desde el nivel 3, el grupo de tortugas buceador pasa 2,8 s a flote, 0,5 s hundiéndose y 0,7 s sumergido (mata).
- [ ] El canvas dibuja el reloj y la racha, pero no la puntuación, las vidas ni el nivel.
- [ ] Los cuatro botones táctiles mueven la rana igual que las flechas del teclado.

**De la plataforma:**

- [ ] `npm run lint` y `npm run build` terminan sin errores ni advertencias de hidratación.
- [ ] `/games` muestra CRUCE ANFIBIO con la portada `cover-rana`, y `/games/cruce-anfibio` sigue siendo estática.
- [ ] `grep -rn "getElementById" lib components` no devuelve resultados: el canvas llega por `ref`.
- [ ] Salir de `/jugar/cruce-anfibio` no deja ningún `requestAnimationFrame` corriendo, y volver a entrar no acelera el juego.
- [ ] El HUD de React y lo que ocurre en el canvas coinciden en todo momento.
- [ ] PAUSA congela el juego entero, reloj incluido, y REANUDAR no mata a nadie por el salto de tiempo. FIN abre el modal con la puntuación acumulada. JUGAR DE NUEVO reinicia al estado inicial.
- [ ] Guardar en el modal inserta la puntuación en la base, y aparece en `/salon` sin recargar a mano. Si el `POST` falla, el modal muestra un error y no finge que se guardó.
- [ ] `curl localhost:3000/api/games` devuelve `cruce-anfibio` con `best` y `plays` numéricos.
- [ ] `curl "localhost:3000/api/scores?game=cruce-anfibio"` devuelve la partida guardada.
- [ ] Reejecutar `0006_seed_cruce-anfibio.sql` no duplica ninguna fila.
- [ ] `references/started-games/` y `references/source-assets/` no tienen ningún cambio.
- [ ] `references/implemented-games.md` tiene la fila de `cruce-anfibio`.
- [ ] `/jugar/asteroides`, `/jugar/tetris`, `/jugar/arkanoid`, `/jugar/snake` y `/jugar/ranaria` siguen funcionando igual que antes.

---

## Decisiones

- **Sí:** id nuevo `cruce-anfibio`, título CRUCE ANFIBIO. Es kebab-case en español y no choca con `GAMES` ni con `specs/game-jam/`.
- **No:** reutilizar el id `ranaria`. Ya existe como simulacro con fila en `games`. El seed lo ignoraría y las puntuaciones se mezclarían. `ranaria` se queda intacta.
- **Sí:** categoría ARCADE, color `green` y portada `.cover-rana`, sin CSS nuevo.
- **No:** VERSUS por ser la categoría con menos juegos implementados. El juego es de un jugador, así que no hay duda que desempatar.
- **No:** portada propia. Añade CSS sin necesidad mientras la variante no esté elegida.
- **Sí:** sin sonido. No hay assets de audio.
- **Sí:** táctil con cruceta de cuatro `.touch-btn` en `.touch-pad`, como SNAKE.
- **No:** gestos de deslizar. Un salto perdido es una muerte.
- **Sí:** búfer de 800×600 con celdas de 50 px, en una rejilla de 16×12, que es el 4:3 del CRT.
- **Sí:** 3 vidas, como ASTEROIDES, ARKANOID y SNAKE. Aquí conviven con el reloj, y la partida acaba por lo que llegue antes.
- **Sí:** reloj global en lugar de un tiempo por rana. Es el giro de esta variante. El jugador decide si arriesga un cruce rápido o espera un hueco seguro, porque esperar también cuesta.
- **Sí:** la racha multiplica la puntuación del cruce y morir la reinicia. Así perder una vida cuesta puntos futuros, no solo una vida.
- **Sí:** racha con tope en 10, es decir, 1000 puntos por cruce. Sin tope, una partida larga desborda cualquier comparación del leaderboard.
- **Sí:** el reloj se detiene durante la papilla. Si no, morir costaría dos veces: vida y tiempo.
- **Sí:** al morir, la rana vuelve a la orilla de salida del cruce en curso, no siempre abajo. Si no, cada muerte a la vuelta obligaría a hacer un cruce extra sin premio.
- **Sí:** moscas en la mediana o montadas en troncos. Dan un motivo para desviarse del camino más corto, que es lo que hace interesante gestionar el reloj.
- **No:** nenúfares. Con ida y vuelta, la orilla entera tiene que ser segura. Los nenúfares están en las variantes A y C.
- **Sí:** reloj y racha dibujados en el canvas, porque `PlayerShell` no se toca.
- **Sí:** puntuación recortada a 9.999.999, por el tope de `POST /api/scores`.
- **Sí:** seed `0006_seed_cruce-anfibio.sql` con `sort_order` 12, que son los siguientes libres según `supabase/migrations/`.
- **Sí:** despacho por `"cruce-anfibio": CruceAnfibioPlayer` en `PLAYERS`, y fila en `references/implemented-games.md`.

---

## Riesgos

| Riesgo                                                                                            | Mitigación                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un jugador experto entra en un bucle sin fin, porque cada cruce devuelve más tiempo del que gasta | El tope de 99 s, la velocidad que sube hasta ×2,2 y las tortugas buceadoras desde el nivel 3 hacen que la partida acabe. El recorte a 9.999.999 cubre el caso extremo.      |
| El jugador no entiende hacia qué orilla tiene que ir                                              | La orilla de destino late en verde y la rana mira hacia ella al reaparecer.                                                                                                 |
| Terminar la partida con vidas en el contador parece un error                                      | El canvas pone el reloj en magenta por debajo de 10 s, y la muerte por tiempo hace la misma papilla que las demás antes del modal.                                          |
| Al cambiar de nivel, `buildMovers` recoloca los objetos y la rana se cae del tronco               | Al subir de nivel solo cambian `speedMul` y el flag de buceo; las posiciones y las fases se conservan. Además, el cruce se completa siempre en una orilla, nunca en el río. |
| Un salto de pestaña acumula `dt` y vacía el reloj                                                 | `dt` topado a 100 ms, `resume()` con `lastTime = null` y pausa automática por `visibilitychange` y `blur`.                                                                  |
| Una mosca aparece encima de un vehículo, donde no se puede alcanzar                               | Las moscas solo aparecen en la mediana o en troncos, nunca en la carretera.                                                                                                 |

---

## Lo que **no** entra en esta spec

- Sonido.
- Nenúfares, cocodrilos, serpientes, nutrias y rana acompañante.
- Fases de noche o lluvia.
- Reloj o racha en el HUD de `PlayerShell`.
- Tocar la entrada simulada `ranaria`.
- Portada propia.
- Cambios en `/api/scores`, la RLS o el esquema de `scores`.
- Tests automatizados.

Cada una de ellas, si llega, va en su propia spec.
