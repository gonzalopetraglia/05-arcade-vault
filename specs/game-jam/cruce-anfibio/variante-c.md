# SPEC GJ — CRUCE ANFIBIO, variante C: charca viva con fases, enemigos y combos

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 05, SPEC 06, SPEC 09
> **Fecha:** 2026-10-04
> **Objetivo:** Diseñar desde cero un juego de cruzar carretera y río con cinco nenúfares por nivel, enemigos de comportamientos distintos, fases de día, lluvia y noche y un combo de nenúfares seguidos, jugable en `/jugar/cruce-anfibio` con teclado y controles táctiles, con su entrada de catálogo y su puntuación guardada por el flujo que ya existe.

---

## Por qué existe esta spec

Sale del tema de game jam _"ranaria: cruza la carretera y el río sin convertirte en papilla"_. La idea es un juego de cruce por carriles: abajo, una carretera con tráfico que atropella; arriba, un río en el que solo se sobrevive encima de troncos y tortugas; y al fondo, una orilla con nenúfares que hay que ocupar.

El catálogo ya tiene una entrada simulada, `ranaria`, que describe este género sin motor detrás. Esta spec **no** la reutiliza. Crea un id nuevo, `cruce-anfibio`, igual que `tetris` convive con `caida`, `arkanoid` con `bloque-buster` y `snake` con `serpentina`. Si se renombrara `ranaria`, se romperían `/games/ranaria`, `/jugar/ranaria` y las puntuaciones ya guardadas con esa clave.

Ningún juego implementado tiene esta mecánica. ASTEROIDES, TETRIS, ARKANOID y SNAKE no tienen carriles con objetos en movimiento ni plataformas que transportan al jugador.

Hay tres variantes de este juego en `specs/game-jam/cruce-anfibio/`. Esta es la **C, la ambiciosa**:

- **A:** cinco nenúfares, 30 s por rana, y tráfico y corriente que aceleran. Es la clásica.
- **B:** contrarreloj de ida y vuelta sin nenúfares, con racha y reloj global.
- **C (esta):** parte de la base de A, con nenúfares y tiempo por rana, y le añade cuatro sistemas:
  - **Enemigos con comportamientos distintos.** Hay motos rápidas, deportivos que dan acelerones, una serpiente que patrulla la mediana, un cocodrilo cuya boca mata, una nutria que nada contra corriente y cocodrilos que se asoman a los nenúfares.
  - **Fases que rotan por nivel:** día, lluvia (el río corre un 30 % más) y noche (solo se ve un círculo alrededor de la rana).
  - **Combo** que multiplica los nenúfares conseguidos sin morir.
  - **Bonificaciones:** moscas en los nenúfares y una rana rosa que se puede escoltar.

Como en SNAKE, el juego se diseña desde cero y no hay `game.js` que traducir. Además, no hay assets: todo se dibuja con primitivas de canvas. Ningún sistema nuevo sale de la API del motor: todo cabe en `update(dt)` y en el `setKey` estándar.

---

## Alcance

**Dentro:**

- Juego nuevo en `lib/games/cruce-anfibio/`:
  - `lanes.ts`, con la tabla de carriles y los comportamientos de cada tipo de objeto.
  - `hazards.ts`, con la serpiente de la mediana, la nutria, el cocodrilo y los visitantes de los nenúfares.
  - `phases.ts`, con las fases de día, lluvia y noche.
  - `entities.ts`, con las constantes del mundo, la rana, los nenúfares, la rana rosa y todo el dibujo.
  - `engine.ts`, con la clase `CruceAnfibioEngine`.
- `components/games/cruce-anfibio-canvas.tsx`: componente cliente que monta el `<canvas>`, instancia el motor, conecta teclado y controles táctiles, y lo destruye al desmontar.
- `components/games/cruce-anfibio-player.tsx`: el player, montado sobre `components/player-shell.tsx`.
- Controles táctiles bajo `@media (pointer: coarse)`: cruceta de cuatro botones.
- Dibujados dentro del canvas: la barra de tiempo de la rana, el indicador de combo y el cartel de fase.
- Entrada nueva `cruce-anfibio` en `GAMES` (`lib/games.ts`), con `cover-rana`.
- Migración `supabase/migrations/0006_seed_cruce-anfibio.sql` con `sort_order` 12, aplicada por el MCP de Supabase y commiteada.
- `app/jugar/[id]/page.tsx`: entrada `"cruce-anfibio"` en el mapa `PLAYERS`.
- Fila nueva en `references/implemented-games.md`.

**Fuera de alcance (para specs futuras):**

- Sonido. No hay assets de audio.
- Power-ups que controle el jugador (salto doble, escudo, ralentizar el tiempo).
- Niveles con tablas de carriles diseñadas a mano por nivel. Aquí la variedad sale de las fases y de los enemigos que se activan por nivel.
- Mostrar el combo, la fase o el tiempo en el HUD de `PlayerShell`.
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
  long: "Una charca viva: motos, deportivos que dan acelerones, una serpiente en la mediana, un cocodrilo que se hace pasar por tronco y una nutria a contracorriente. Ocupa los cinco nenúfares bajo el sol, la lluvia y la noche, encadena nenúfares sin morir para multiplicar los puntos y escolta a la rana rosa para ganar un extra. Tres vidas, 30 segundos por rana.",
  cat: "ARCADE",
  cover: "cover-rana",
  color: "green",
}
```

`Game` no lleva `best` ni `plays`: esos dos números vienen de la vista `game_stats` por `GET /api/games`.

### Constantes del mundo — `lib/games/cruce-anfibio/entities.ts`

```ts
export const CELL = 50;
export const COLS = 16;
export const ROWS = 12;
export const W = COLS * CELL; // 800
export const H = ROWS * CELL; // 600

// Filas, de arriba abajo
export const ROW_NESTS = 0;
export const RIVER_ROWS = [1, 2, 3, 4, 5];
export const ROW_MEDIAN = 6;
export const ROAD_ROWS = [7, 8, 9, 10];
export const ROW_START = 11;

export const START_X = 400;
export const HOP_MS = 120;
export const FROG_HITBOX = 30;

export const NEST_XS = [80, 240, 400, 560, 720];
export const NEST_TOLERANCE = 22;

export const LIVES = 3;
export const TIME_PER_FROG = 30_000;
export const DEATH_PAUSE = 1000;

export const POINTS_ROW = 10;
export const POINTS_NEST = 50;
export const POINTS_PER_SECOND_LEFT = 10;
export const COMBO_MAX = 5; // el multiplicador del nenúfar no pasa de ×5
export const POINTS_FLY = 200; // entrar en un nenúfar con mosca
export const POINTS_ESCORT = 200; // entrar en un nenúfar llevando a la rana rosa
export const POINTS_LEVEL_CLEAR = 1000;
export const MAX_SCORE = 9_999_999;

export const SPEED_STEP = 0.1;
export const SPEED_MAX = 2.0;
```

El ritmo se deriva del nivel:

```ts
speedMul = Math.min(SPEED_MAX, 1 + (level - 1) * SPEED_STEP);
riverMul = phase === "lluvia" ? 1.3 : 1; // solo afecta a los carriles del río
```

Convenciones:

- El origen está arriba a la izquierda.
- La rana se mueve por filas discretas, y su `x` es continua. Un salto lateral suma o resta 50 px y se limita a `[25, 775]`.
- En el río, la plataforma arrastra a la rana. Si la saca de `[0, W]`, la rana muere.
- Las velocidades van en px/s.

### Carriles — `lib/games/cruce-anfibio/lanes.ts`

```ts
export type LaneKind = "car" | "moto" | "sport" | "truck" | "log" | "turtles";

export type LaneDef = {
  row: number;
  kind: LaneKind;
  dir: 1 | -1;
  speed: number; // px/s en el nivel 1
  len: number;
  count: number;
  spacing: number; // count * spacing >= W + len
};

export const LANES: LaneDef[] = [
  { row: 10, kind: "car", dir: -1, speed: 60, len: 50, count: 3, spacing: 300 },
  { row: 9, kind: "moto", dir: 1, speed: 160, len: 36, count: 2, spacing: 520 },
  { row: 8, kind: "sport", dir: -1, speed: 110, len: 56, count: 2, spacing: 450 },
  { row: 7, kind: "truck", dir: 1, speed: 50, len: 110, count: 2, spacing: 480 },
  { row: 5, kind: "turtles", dir: -1, speed: 55, len: 150, count: 4, spacing: 250 },
  { row: 4, kind: "log", dir: 1, speed: 45, len: 120, count: 4, spacing: 240 },
  { row: 3, kind: "log", dir: 1, speed: 70, len: 250, count: 3, spacing: 380 },
  { row: 2, kind: "turtles", dir: -1, speed: 60, len: 100, count: 4, spacing: 230 },
  { row: 1, kind: "log", dir: 1, speed: 55, len: 180, count: 4, spacing: 260 },
];

// Acelerón del deportivo: cada 3000 ms va ×1.8 durante 800 ms
export const SPORT_BURST = { every: 3000, duration: 800, mul: 1.8 };

// Buceo de tortugas, en ms. En C bucean desde el nivel 1: el grupo 0 de cada carril de
// tortugas y, desde el nivel 3, también el grupo 2.
export const DIVE_CYCLE = { up: 2800, sinking: 500, under: 700 };
```

Cada tipo de vehículo tiene un comportamiento propio:

| Tipo    | Comportamiento                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------ |
| `car`   | Velocidad constante.                                                                                   |
| `moto`  | Corta y rápida. Es el carril que exige calcular mejor el momento.                                      |
| `sport` | Constante, salvo el acelerón periódico. Durante el acelerón se dibuja con una estela magenta de 30 px. |
| `truck` | Largo y lento. Su hueco es fácil de ver, pero cuesta pasarlo.                                          |

### Peligros especiales — `lib/games/cruce-anfibio/hazards.ts`

```ts
// Serpiente de la mediana, desde el nivel 2: va de lado a lado y rebota en los bordes.
export const SNAKE = { fromLevel: 2, len: 90, speed: 70 }; // px, px/s (× speedMul)

// Cocodrilo, desde el nivel 3: sustituye al tronco 0 de la fila 3 y conserva su ancho
// (250). La boca son los 60 px delanteros, en el sentido de la marcha; matan. El resto
// es lomo seguro.
export const CROC = { fromLevel: 3, row: 3, jawLen: 60 };

// Nutria, desde el nivel 4: nada por la fila 2 contra la corriente (hacia la derecha).
// Mata si toca a la rana en esa fila.
export const OTTER = { fromLevel: 4, row: 2, len: 40, speed: 120, period: 1200 };

// Visitantes de los nenúfares, siempre en un nenúfar libre
export const NEST_FLY = { every: 7000, duration: 4000 }; // desde el nivel 1
// Desde el nivel 4. El primer segundo solo asoma los ojos (seguro); los 2 s siguientes
// la cabeza entera ocupa el nenúfar, y entrar en él mata.
export const NEST_CROC = { fromLevel: 4, every: 8000, warn: 1000, bite: 2000 };

// Rana rosa: aparece en el centro de un tronco al azar de la fila 4
export const LADY = { every: 20_000, life: 10_000, pickRadius: 30 };
```

La mosca y el cocodrilo nunca coinciden en el mismo nenúfar. Si toca el turno del cocodrilo y el único nenúfar libre tiene mosca, ese turno se salta.

### Fases — `lib/games/cruce-anfibio/phases.ts`

```ts
export type Phase = "dia" | "lluvia" | "noche";
export const PHASES: Phase[] = ["dia", "lluvia", "noche"];
// phase = PHASES[(level - 1) % 3]

export const RAIN = { drops: 60, speed: 600, riverMul: 1.3 };
export const NIGHT = { radius: 160, darkness: 0.85, headlight: 80 }; // px, alfa, px
export const PHASE_BANNER_MS = 1500; // cartel "DÍA" / "LLUVIA" / "NOCHE" al empezar el nivel
```

### Estructuras internas

```ts
export type DeathCause =
  "atropello" | "ahogo" | "arrastre" | "seto" | "tiempo" | "serpiente" | "cocodrilo" | "nutria";

export type Frog = {
  x: number;
  row: number;
  hop: { fromX: number; fromRow: number; t: number } | null;
  facing: "up" | "down" | "left" | "right";
  bestRow: number;
  escorting: boolean; // lleva a la rana rosa a cuestas
};

export type Mover = {
  x: number;
  len: number;
  lane: number;
  diving: boolean;
  phaseMs: number; // tortugas
  croc: boolean; // tronco convertido en cocodrilo
  burstMs: number; // reloj del acelerón del deportivo
};

export type Nest = {
  x: number;
  filled: boolean;
  visitor: { kind: "fly" | "croc"; t: number } | null;
};

export type Lady = { mover: number; offset: number; ttl: number } | null;
export type Splat = { x: number; row: number; cause: DeathCause; t: number };
```

Los campos del motor que no van al HUD son `combo`, `frogTimeMs`, `phase`, `bannerMs`, `snake`, `otter` y `lady`.

### Estado que el motor emite al HUD

```ts
export type CruceAnfibioState = {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
};
```

`onState` se llama **solo cuando algún campo cambia** respecto al frame anterior. El motor es la única fuente de `score`, `lives` y `level`. El combo, la fase y el tiempo se dibujan en el canvas, porque `PlayerShell` no tiene hueco para ellos y esta spec no lo toca.

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

1. **`lib/games/cruce-anfibio/lanes.ts`.** `LaneKind`, `LaneDef`, `LANES`, `SPORT_BURST` y `DIVE_CYCLE`. Solo datos.
2. **`lib/games/cruce-anfibio/phases.ts` y `hazards.ts`.** Las constantes de arriba, más el helper puro `phaseFor(level)`. Solo datos y funciones puras.
3. **`lib/games/cruce-anfibio/entities.ts` — modelo.** Las constantes, los tipos y estas funciones puras:
   - `buildMovers(level)` marca las tortugas buceadoras según el nivel. Desde el nivel 3, marca `croc: true` en el tronco 0 de la fila 3.
   - `stepMovers(movers, dt, speedMul, riverMul)` desplaza, envuelve con `count * spacing` y aplica el acelerón de los `sport`.
   - `isSolid(mover)` devuelve `false` en la fase `under`.
   - `jawBox(mover)` devuelve los 60 px delanteros del cocodrilo.
   - `frogBox(frog)` devuelve el cuadrado de colisión de la rana.
4. **`entities.ts` — dibujo base con primitivas.** Todo lo que se dibuja recibe `ctx` por parámetro:
   - La acera y la mediana son `#2a1440`, la carretera es `#111118` con líneas discontinuas, y el río es `#06243a`.
   - El seto es `#0b3d1f`, con cinco nenúfares verdes de 22 px de radio.
   - Los coches miden 50×34 px y son cian. Las motos miden 36×20 px, son magenta y tienen un faro. Los deportivos miden 56×30 px y son magenta, con una estela durante el acelerón. Los camiones miden 110×38 px y son amarillos.
   - Los troncos son `#7a4a1e` y las tortugas, círculos verde oliva de 20 px.
   - La rana es `#00ff88`, mide 18 px de radio y se gira según `facing`. Si lleva escolta, se dibuja con un círculo rosa (`#ff6ec7`) de 10 px sobre la espalda.
   - La papilla son 8 círculos que se expanden durante `DEATH_PAUSE`.
5. **`entities.ts` — dibujo de peligros y bonificaciones:**
   - La serpiente son 6 segmentos verde lima de 15 px que ondulan con un seno de 6 px de amplitud.
   - El cocodrilo es un tronco verde oscuro (`#1f5a2a`) con la boca en un verde más claro y dientes blancos.
   - La nutria es una elipse marrón claro de 40×24 px con una estela blanca.
   - La mosca del nenúfar es un punto negro con alas blancas.
   - El cocodrilo del nenúfar asoma solo dos ojos amarillos en el aviso y la cabeza entera en la mordida.
   - La rana rosa es un círculo `#ff6ec7` de 14 px de radio.
6. **`entities.ts` — capas de fase y marcadores:**
   - **Lluvia:** 60 trazos diagonales de 12 px, con alfa 0,4, que caen a 600 px/s y se envuelven en `H`.
   - **Noche:** un rectángulo negro con alfa 0,85 sobre todo el mundo, con un círculo transparente de 160 px de radio alrededor de la rana (`globalCompositeOperation = "destination-out"` en un canvas fuera de pantalla). Encima van los conos de faros: triángulos amarillos con alfa 0,35 y 80 px de largo delante de cada vehículo.
   - **Tiempo:** barra de 6 px en el borde inferior, magenta por debajo de 8 s.
   - **Combo:** hasta 5 rombos amarillos de 8 px en la esquina superior derecha, uno por cada nivel del multiplicador.
   - **Cartel de fase:** "DÍA", "LLUVIA" o "NOCHE" en `bold 32px monospace` centrado, durante `PHASE_BANNER_MS` al empezar cada nivel. No lleva número: el nivel ya está en el HUD.
7. **`lib/games/cruce-anfibio/engine.ts` — estado y bucle.** La clase guarda en campos todo lo anterior. El bucle es un `requestAnimationFrame` con `dt` topado a 100 ms, y el id se guarda para cancelarlo en `pause()` y `destroy()`. `resume()` pone `lastTime = null`, y `restart()` vuelve al nivel 1 (día), con 3 vidas, 0 puntos y combo a 0. No hay reinicio por tecla.
8. **Entrada y saltos.** `setKey` solo actúa en el flanco de bajada de `ArrowUp`/`KeyW`, `ArrowDown`/`KeyS`, `ArrowLeft`/`KeyA` y `ArrowRight`/`KeyD`.
   - Un salto dura `HOP_MS`, y una pulsación durante el vuelo se guarda en un búfer de una entrada.
   - No se puede bajar desde `ROW_START`.
   - Los saltos laterales se recortan a `[25, 775]`.
9. **Colisiones base.** Se comprueban al aterrizar y en cada frame posterior. Durante el vuelo la rana es inmune.
   - **Carretera:** si `frogBox` solapa un vehículo, la causa es `"atropello"`.
   - **Río:** la rana está a salvo si su `x` cae dentro de un objeto sólido de su fila, y el objeto la arrastra a `speed × dir × speedMul × riverMul`. Si no hay ninguno, la causa es `"ahogo"`. Si sale de `[0, W]`, la causa es `"arrastre"`.
   - **Orilla:** fuera de un nenúfar libre, la causa es `"seto"`.
10. **Peligros especiales.** Cada uno se activa en su `fromLevel`:
    - **Serpiente:** si `frogBox` solapa la serpiente en la mediana, la causa es `"serpiente"`.
    - **Cocodrilo del río:** la rana está a salvo sobre su lomo. Si `frogBox` solapa `jawBox`, la causa es `"cocodrilo"`.
    - **Nutria:** si `frogBox` la solapa en la fila 2, la causa es `"nutria"`.
    - **Cocodrilo del nenúfar:** entrar en un nenúfar en la fase de mordida tiene la causa `"cocodrilo"`. En la fase de aviso, la entrada es normal y el cocodrilo desaparece.
11. **Puntuación, combo y bonificaciones.**
    - Cada fila nueva en esta vida suma 10 puntos.
    - Al entrar en un nenúfar libre, `combo` sube en uno y se suman `(50 + 10 × floor(segundosRestantes)) × min(combo, 5)`.
    - Si el nenúfar tiene mosca, suma 200 más, sin multiplicar.
    - Si la rana lleva escolta, suma 200 más, sin multiplicar, y la escolta termina.
    - **Rana rosa:**
      - Cada 20 s aparece en el centro de un tronco al azar de la fila 4, con 10 s de vida o hasta que su tronco salga de pantalla.
      - Si la rana está sobre ese tronco y a 30 px o menos de ella, pasa a `escorting: true`.
    - Llenar los cinco nenúfares suma 1000, sube el nivel, vacía los nenúfares y sus visitantes, recalcula la fase, enseña el cartel y llama a `buildMovers(level)`. El combo **se conserva** entre niveles.
    - La puntuación se recorta a `MAX_SCORE`.
12. **Muerte, tiempo y vidas.**
    - Si `frogTimeMs` llega a 0, la causa es `"tiempo"`.
    - Cualquier muerte resta una vida, pone `combo = 0`, pierde la escolta, crea la papilla y pone `status: "dead"` durante `DEATH_PAUSE`. El mundo sigue moviéndose.
    - Al revivir, la rana sale de la acera con el tiempo lleno. La puntuación, los nenúfares llenos y la fase se conservan.
    - Con 0 vidas, `status: "gameover"` y `onGameOver(score)`. `forceGameOver()` hace lo mismo a petición del botón FIN.
13. **`components/games/cruce-anfibio-canvas.tsx`** con `"use client"`:
    - `ref` al `<canvas>` y un `useEffect` que crea el motor y devuelve `destroy()`.
    - Búfer de 800×600 multiplicado por `devicePixelRatio`.
    - `preventDefault()` en las flechas y en WASD.
    - Pausa automática por `visibilitychange` y `blur`.
    - Canvas con `width: 100%`, `aspect-ratio: 4 / 3` y `touch-action: none`.
14. **Controles táctiles.** Una cruceta de cuatro `.touch-btn` dentro de `.touch-pad`. `pointerdown`, `pointerup` y `pointercancel` se traducen a `setKey("ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight", …)`.
15. **`components/games/cruce-anfibio-player.tsx`** sobre `components/player-shell.tsx`. HUD, marco CRT, botones y modal vienen del shell y no se duplican. `score`, `lives` y `level` salen del motor.
16. **Despacho.** Entrada `"cruce-anfibio": CruceAnfibioPlayer` en el mapa `PLAYERS` de `app/jugar/[id]/page.tsx`.
17. **Catálogo y seed.** Entrada `cruce-anfibio` al final de `GAMES` y `supabase/migrations/0006_seed_cruce-anfibio.sql`, con `insert into public.games … on conflict (id) do nothing` y `sort_order` 12. Se aplica con `apply_migration` y el `.sql` queda commiteado.
18. **Portada.** No hay CSS nuevo: se reutiliza `.cover-rana`.
19. **Registro.** Fila `cruce-anfibio | CRUCE ANFIBIO | ARCADE | green | Cruza la carretera y el río sin hacerte papilla.` en `references/implemented-games.md`.
20. **Verificación.** Ejecutar y comprobar:
    - `npm run lint` y `npm run build`.
    - `curl localhost:3000/api/games`.
    - Jugar una partida real hasta el nivel 4 y guardarla.
    - `curl "localhost:3000/api/scores?game=cruce-anfibio"`.
    - Que la partida aparece en `/salon` y que `plays` sube en la tabla de `/games`.

---

## Criterios de aceptación

**Del juego:**

- [ ] La partida empieza en el nivel 1, de día, con 3 vidas, 0 puntos, combo 0 y la rana en `(400, fila 11)`. El cartel "DÍA" se ve durante 1,5 s.
- [ ] Cada pulsación de flecha o de WASD produce exactamente un salto. Mantener la tecla pulsada no encadena saltos.
- [ ] Cada fila nueva en esta vida suma exactamente 10 puntos.
- [ ] Entrar en un nenúfar libre suma `(50 + 10 × segundos restantes) × min(combo, 5)`: ×1 el primero, ×2 el segundo seguido sin morir, y así hasta ×5.
- [ ] Morir pone el combo a 0. Pasar de nivel no lo toca.
- [ ] Entrar en un nenúfar con mosca suma 200 más. Entrar llevando a la rana rosa suma 200 más.
- [ ] La rana rosa aparece cada 20 s sobre un tronco de la fila 4. Se recoge pasando a 30 px o menos de ella sobre el mismo tronco, y se pierde al morir.
- [ ] Las motos de la fila 9 van a 160 px/s × `speedMul`. Los deportivos de la fila 8 multiplican su velocidad por 1,8 durante 800 ms cada 3 s, y se dibujan con estela mientras tanto.
- [ ] Desde el nivel 2, una serpiente de 90 px patrulla la mediana a 70 px/s × `speedMul` y mata al tocarla.
- [ ] Desde el nivel 3, el tronco 0 de la fila 3 es un cocodrilo: su lomo es seguro y sus 60 px delanteros matan.
- [ ] Desde el nivel 4, una nutria nada por la fila 2 hacia la derecha a 120 px/s × `speedMul` y mata al tocarla.
- [ ] Desde el nivel 4, cada 8 s un cocodrilo ocupa un nenúfar libre: 1 s de aviso, en el que se puede entrar, y 2 s de mordida, en los que entrar mata.
- [ ] Las fases rotan por nivel: el 1 es día, el 2 lluvia, el 3 noche, el 4 día, y así sucesivamente.
- [ ] Con lluvia, los carriles del río van un 30 % más rápido y se dibujan 60 gotas. La carretera no cambia.
- [ ] De noche, fuera de un círculo de 160 px alrededor de la rana todo queda oscurecido al 85 %, salvo los conos de faros de los vehículos.
- [ ] Las tortugas buceadoras pasan 2,8 s a flote, 0,5 s hundiéndose y 0,7 s sumergidas. Bucea el grupo 0 desde el nivel 1, y también el grupo 2 desde el nivel 3.
- [ ] Llenar los cinco nenúfares suma 1000 y sube el nivel. Las velocidades se multiplican por `min(2.0, 1 + 0.1 × (nivel − 1))`.
- [ ] Si se acaban los 30 s de la rana, la rana muere. Al morir, se hace papilla durante 1 s y reaparece en la acera.
- [ ] Con 0 vidas se abre el modal de fin de partida con la puntuación acumulada.
- [ ] El canvas dibuja la barra de tiempo, el combo y el cartel de fase, pero no la puntuación, las vidas ni el nivel.
- [ ] Los cuatro botones táctiles mueven la rana igual que las flechas del teclado.

**De la plataforma:**

- [ ] `npm run lint` y `npm run build` terminan sin errores ni advertencias de hidratación.
- [ ] `/games` muestra CRUCE ANFIBIO con la portada `cover-rana`, y `/games/cruce-anfibio` sigue siendo estática.
- [ ] `grep -rn "getElementById" lib components` no devuelve resultados: el canvas llega por `ref`.
- [ ] Salir de `/jugar/cruce-anfibio` no deja ningún `requestAnimationFrame` corriendo, y volver a entrar no acelera el juego.
- [ ] El HUD de React y lo que ocurre en el canvas coinciden en todo momento.
- [ ] PAUSA congela el juego entero, temporizadores de peligros incluidos, y REANUDAR no mata a nadie por el salto de tiempo. FIN abre el modal con la puntuación acumulada. JUGAR DE NUEVO reinicia al estado inicial.
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
- **No:** VERSUS por ser la categoría con menos juegos implementados. El juego es de un jugador.
- **No:** portada propia. Añade CSS sin necesidad mientras la variante no esté elegida.
- **Sí:** sin sonido. No hay assets de audio.
- **Sí:** táctil con cruceta de cuatro `.touch-btn` en `.touch-pad`, como SNAKE.
- **Sí:** búfer de 800×600 con celdas de 50 px, en una rejilla de 16×12.
- **Sí:** 3 vidas, como ASTEROIDES, ARKANOID y SNAKE.
- **Sí:** enemigos activados por nivel (2, 3 y 4) en lugar de todos desde el principio. El jugador aprende un peligro cada vez, y el nivel 1 se puede jugar como la variante clásica.
- **Sí:** el cocodrilo sustituye a un tronco existente en lugar de añadirse al carril. Así no se rompe `count * spacing >= W + len`, y el carril conserva su densidad.
- **Sí:** el combo se conserva entre niveles y se pierde al morir. El premio es por jugar limpio, no por terminar un nivel.
- **Sí:** combo con tope en ×5. Sin tope, una partida limpia larga multiplicaría sin límite y desfiguraría el leaderboard.
- **Sí:** la mosca y la escolta suman sin multiplicar. Si se multiplicaran, el combo pesaría tanto que el resto de sistemas daría igual.
- **Sí:** las fases rotan por nivel con `(level - 1) % 3`. Son deterministas, y el jugador sabe qué viene.
- **Sí:** la noche se dibuja con un canvas fuera de pantalla y `destination-out`. Son primitivas de canvas y no hacen falta assets.
- **No:** que la lluvia afecte a la carretera (coches que derrapan). Exigiría física nueva para un efecto poco legible.
- **Sí:** cartel de fase con texto `bold 32px monospace`. El motor no lee el DOM, así que no puede usar la fuente de `--font-pixel`, que genera `next/font`.
- **Sí:** combo, tiempo y fase dibujados en el canvas, porque `PlayerShell` no se toca.
- **No:** power-ups activables por el jugador. Necesitarían otra tecla y otro botón táctil, y esta variante ya es la más cara.
- **Sí:** puntuación recortada a 9.999.999, por el tope de `POST /api/scores`.
- **Sí:** seed `0006_seed_cruce-anfibio.sql` con `sort_order` 12, que son los siguientes libres según `supabase/migrations/`.
- **Sí:** despacho por `"cruce-anfibio": CruceAnfibioPlayer` en `PLAYERS`, y fila en `references/implemented-games.md`.

---

## Riesgos

| Riesgo                                                                                                | Mitigación                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La noche hace injusto el río, porque no se ven los troncos que llegan                                 | El círculo de 160 px cubre más de tres celdas a cada lado. Además, la fase de noche nunca cae en el nivel 1, y el jugador ya ha visto el mismo río dos veces.          |
| Combinar lluvia (río ×1,3) y `speedMul` 2,0 hace imposible el río                                     | El tope de `speedMul` es 2,0 y la lluvia solo toca el río. A 70 × 2,0 × 1,3 = 182 px/s, el tronco largo de 250 px tarda 1,4 s en pasar, más que `HOP_MS`.              |
| El combo y las bonificaciones disparan las puntuaciones respecto a las variantes A y B                | Solo se implementa una variante. Los topes (×5 y 9.999.999) mantienen el leaderboard dentro del contrato de `/api/scores`.                                             |
| Demasiados temporizadores (acelerón, buceo, visitantes, rana rosa, cartel) se desincronizan al pausar | Todos avanzan con el mismo `dt` dentro de `update` y ninguno usa `setTimeout`. La pausa los congela a la vez.                                                          |
| El canvas fuera de pantalla de la noche se recrea en cada frame y baja el rendimiento                 | Se crea una vez en el constructor, a 800×600, y se reutiliza. `destroy()` suelta la referencia.                                                                        |
| El alcance crece durante la implementación                                                            | Cada peligro está aislado en `hazards.ts` con su `fromLevel`. Si hace falta recortar, se sube su `fromLevel` sin tocar el resto, y la decisión se registra en la spec. |
| Muerte instantánea al reaparecer                                                                      | La acera (fila 11) no tiene carril ni peligros. La serpiente vive en la mediana (fila 6), no en la acera.                                                              |

---

## Lo que **no** entra en esta spec

- Sonido.
- Power-ups activables por el jugador.
- Tablas de carriles distintas por nivel.
- Efectos de la lluvia sobre la carretera.
- Combo, fase o tiempo en el HUD de `PlayerShell`.
- Tocar la entrada simulada `ranaria`.
- Portada propia.
- Cambios en `/api/scores`, la RLS o el esquema de `scores`.
- Tests automatizados.

Cada una de ellas, si llega, va en su propia spec.
