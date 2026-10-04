# SPEC GJ — CRUCE ANFIBIO, variante A: cruce clásico con cinco nenúfares

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 05, SPEC 06, SPEC 09
> **Fecha:** 2026-10-04
> **Objetivo:** Diseñar desde cero un juego de cruzar carretera y río en el que una rana llena cinco nenúfares por nivel, jugable en `/jugar/cruce-anfibio` con teclado y controles táctiles, con su entrada de catálogo y su puntuación guardada por el flujo que ya existe.

---

## Por qué existe esta spec

Sale del tema de game jam _"ranaria: cruza la carretera y el río sin convertirte en papilla"_. La idea es un juego de cruce por carriles: abajo, una carretera con tráfico que atropella; arriba, un río en el que solo se sobrevive encima de troncos y tortugas; y al fondo, una orilla con nenúfares que hay que ocupar.

El catálogo ya tiene una entrada simulada, `ranaria`, que describe este mismo género sin motor detrás. Esta spec **no** la reutiliza. Crea un id nuevo, `cruce-anfibio`, igual que `tetris` convive con `caida`, `arkanoid` con `bloque-buster` y `snake` con `serpentina`. Si se renombrara `ranaria`, se romperían `/games/ranaria`, `/jugar/ranaria` y las puntuaciones ya guardadas con esa clave.

Ningún juego implementado tiene esta mecánica. ASTEROIDES, TETRIS, ARKANOID y SNAKE no tienen carriles con objetos en movimiento ni plataformas que transportan al jugador. Lo más cercano es SNAKE, por el movimiento a saltos de celda. La diferencia es que aquí la rana solo se mueve cuando el jugador pulsa, y lo que se mueve solo es el mundo.

Hay tres variantes de este juego en `specs/game-jam/cruce-anfibio/`. Esta es la **A, la clásica**:

- **A (esta):** cinco nenúfares por nivel, 30 s por rana, y tráfico y corriente que aceleran con cada nivel. Es la más fiel al género y la más barata de implementar.
- **B:** contrarreloj de ida y vuelta, sin nenúfares. Cruzar en cualquiera de los dos sentidos puntúa con una racha creciente, y un reloj global es el recurso que hay que alimentar.
- **C:** nenúfares con más sistemas: enemigos con comportamientos distintos, fases de día, lluvia y noche, combo de nenúfares seguidos y rescates de bonificación.

Como en SNAKE, el juego se diseña desde cero y no hay `game.js` que traducir. Además, no hay assets: todo se dibuja con primitivas de canvas.

---

## Alcance

**Dentro:**

- Juego nuevo en `lib/games/cruce-anfibio/`:
  - `lanes.ts`, con la tabla de carriles.
  - `entities.ts`, con las constantes del mundo, la rana, los vehículos, las plataformas y los nenúfares, y su dibujo.
  - `engine.ts`, con la clase `CruceAnfibioEngine`.
- `components/games/cruce-anfibio-canvas.tsx`: componente cliente que monta el `<canvas>`, instancia el motor, conecta teclado y controles táctiles, y lo destruye al desmontar.
- `components/games/cruce-anfibio-player.tsx`: el player, montado sobre `components/player-shell.tsx`.
- Controles táctiles bajo `@media (pointer: coarse)`: cruceta de cuatro botones.
- Barra de tiempo de la rana dibujada dentro del canvas.
- Entrada nueva `cruce-anfibio` en `GAMES` (`lib/games.ts`), con `cover-rana`.
- Migración `supabase/migrations/0006_seed_cruce-anfibio.sql` con `sort_order` 12, aplicada por el MCP de Supabase y commiteada.
- `app/jugar/[id]/page.tsx`: entrada `"cruce-anfibio"` en el mapa `PLAYERS`.
- Fila nueva en `references/implemented-games.md`.

**Fuera de alcance (para specs futuras):**

- Sonido. No hay assets de audio.
- Enemigos en el río o en la mediana (cocodrilos, serpientes, nutrias), moscas de bonificación y rana acompañante.
- Fases visuales (noche, lluvia).
- Retirar, renombrar o portar la entrada simulada `ranaria`.
- Portada propia `cover-cruce-anfibio`.
- Auth real, rutas de API nuevas, cambios en la RLS o en el esquema de `scores`.
- Cambios en `PlayerShell`.
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
  long: "Una rana, cuatro carriles de tráfico y cinco de río. Esquiva coches y camiones, salta de tronco en tronco y de tortuga en tortuga, y ocupa los cinco nenúfares de la otra orilla antes de que se acaben tus 30 segundos. Cada nivel completo acelera el tráfico y la corriente; tienes tres vidas.",
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
export const ROW_NESTS = 0; // orilla de los nenúfares
export const RIVER_ROWS = [1, 2, 3, 4, 5];
export const ROW_MEDIAN = 6; // mediana segura entre río y carretera
export const ROAD_ROWS = [7, 8, 9, 10];
export const ROW_START = 11; // acera de salida

export const START_X = 400; // centro horizontal de la rana al salir
export const HOP_MS = 120; // duración de un salto; la entrada se encola mientras dura
export const FROG_HITBOX = 30; // lado del cuadrado de colisión de la rana

export const NEST_XS = [80, 240, 400, 560, 720]; // centros de los cinco nenúfares
export const NEST_TOLERANCE = 22; // |x - centro| máximo para entrar en un nenúfar

export const LIVES = 3;
export const TIME_PER_FROG = 30_000; // ms por rana
export const DEATH_PAUSE = 1000; // ms de status "dead" (animación de papilla)

export const POINTS_ROW = 10; // por cada fila nueva alcanzada en la vida de esta rana
export const POINTS_NEST = 50;
export const POINTS_PER_SECOND_LEFT = 10; // por segundo entero restante al entrar en un nenúfar
export const POINTS_LEVEL_CLEAR = 1000; // al llenar los cinco nenúfares
export const MAX_SCORE = 9_999_999; // por debajo del tope de POST /api/scores

export const SPEED_STEP = 0.12; // aceleración por nivel
export const SPEED_MAX = 2.0; // tope del multiplicador
export const DIVE_FROM_LEVEL = 2; // las tortugas empiezan a sumergirse en el nivel 2
```

Convenciones:

- El origen está arriba a la izquierda.
- La rana se mueve por filas discretas. Su `x`, en cambio, es continua: un salto lateral suma o resta 50 px, y en el río la plataforma la arrastra.
- `x` se limita a `[25, 775]` en los saltos laterales. Si una plataforma la saca de `[0, W]`, la rana muere.
- Las velocidades van en px/s y se multiplican por `speedMul`.

El ritmo se deriva del nivel y no se guarda por separado:

```ts
speedMul = Math.min(SPEED_MAX, 1 + (level - 1) * SPEED_STEP);
```

### Carriles — `lib/games/cruce-anfibio/lanes.ts`

```ts
export type LaneKind = "car" | "truck" | "log" | "turtles";

export type LaneDef = {
  row: number;
  kind: LaneKind;
  dir: 1 | -1; // 1 = hacia la derecha
  speed: number; // px/s en el nivel 1
  len: number; // ancho de cada objeto en px
  count: number; // objetos en el carril
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

// Ciclo de buceo de un grupo de tortugas, en ms
export const DIVE_CYCLE = { up: 2800, sinking: 500, under: 700 }; // 4000 ms en total
```

Desde el nivel 2, en cada carril de tortugas hay un grupo que bucea: el de índice 0. Mientras está en `up` o en `sinking`, se puede pisar; en `sinking` se dibuja más oscuro, como aviso. En `under` no hay nada que pisar, y la rana que esté encima se ahoga. El resto de grupos nunca bucea.

### Estructuras internas

```ts
export type DeathCause = "atropello" | "ahogo" | "arrastre" | "seto" | "tiempo";

export type Frog = {
  x: number; // centro, en px
  row: number; // 0..11
  hop: { fromX: number; fromRow: number; t: number } | null; // salto en curso
  facing: "up" | "down" | "left" | "right";
  bestRow: number; // fila más alta alcanzada en esta vida; da los POINTS_ROW
};

export type Mover = { x: number; len: number; lane: number; diving: boolean; phaseMs: number };

export type Nest = { x: number; filled: boolean };

export type Splat = { x: number; row: number; cause: DeathCause; t: number }; // la papilla
```

### Estado que el motor emite al HUD

```ts
export type CruceAnfibioState = {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
};
```

`onState` se llama **solo cuando algún campo cambia** respecto al frame anterior. El motor es la única fuente de `score`, `lives` y `level`. El tiempo restante de la rana no va al HUD de React: se dibuja como barra dentro del canvas, porque `PlayerShell` no tiene hueco para él y esta spec no lo toca.

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

1. **`lib/games/cruce-anfibio/lanes.ts`.** `LaneDef`, la tabla `LANES` de arriba y `DIVE_CYCLE`. Solo datos, sin lógica.
2. **`lib/games/cruce-anfibio/entities.ts` — modelo.** Las constantes, los tipos y estas funciones puras:
   - `buildMovers(level)` reparte cada carril en `count` objetos separados por `spacing` y marca como buceador el grupo 0 de cada carril de tortugas si `level >= DIVE_FROM_LEVEL`.
   - `stepMovers(movers, dt, speedMul)` desplaza y envuelve cada objeto: si sale por un lado, reaparece restando o sumando `count * spacing`.
   - `isSolid(mover)` devuelve `false` solo en la fase `under`.
   - `frogBox(frog)` devuelve el cuadrado de 30×30 centrado en la celda de la rana.
3. **`entities.ts` — dibujo con primitivas.** Todo lo que se dibuja recibe `ctx` por parámetro:
   - La acera de salida y la mediana son franjas violeta oscuro (`#2a1440`).
   - La carretera es gris muy oscuro (`#111118`), con líneas discontinuas de 20 px entre carriles.
   - El río es azul (`#06243a`).
   - La orilla de arriba es un seto verde oscuro (`#0b3d1f`) con cinco huecos. Cada hueco lleva un nenúfar: un círculo verde de 22 px de radio.
   - Los coches son rectángulos redondeados de 50×34 px, de color cian y magenta alternos por carril, con dos faros amarillos. Los camiones miden 110×38 px y son amarillos con cabina blanca.
   - Los troncos son rectángulos redondeados marrones (`#7a4a1e`) de 36 px de alto, con vetas más claras.
   - Las tortugas son círculos verde oliva de 20 px de radio, uno cada 50 px del grupo.
   - La rana es un círculo verde (`#00ff88`) de 18 px de radio con dos ojos blancos, girada según `facing`. Mientras salta, se dibuja un 15 % más grande.
   - Un nenúfar lleno lleva una rana dibujada encima.
   - La papilla es una mancha de 8 círculos verdes y rojos que se expande durante `DEATH_PAUSE`.
   - La barra de tiempo es un rectángulo de 6 px de alto pegado al borde inferior. Su ancho es proporcional al tiempo restante, y se pone magenta por debajo de 8 s.
4. **`lib/games/cruce-anfibio/engine.ts` — estado y bucle.** La clase guarda en campos la rana, los objetos, los nenúfares, el nivel, la puntuación, las vidas, el tiempo de la rana y la papilla. El bucle es un `requestAnimationFrame` con `dt` topado a 100 ms. El id del `rAF` se guarda para cancelarlo en `pause()` y `destroy()`. `resume()` pone `lastTime = null`, y `restart()` vuelve al nivel 1 con 3 vidas y 0 puntos. No hay reinicio por tecla.
5. **Entrada y saltos.** `setKey` guarda el mapa de teclas y solo actúa en el flanco de bajada. Así, la repetición automática del navegador, que envía `keydown` seguidos con `down = true`, no encadena saltos.
   - `ArrowUp`/`KeyW`, `ArrowDown`/`KeyS`, `ArrowLeft`/`KeyA` y `ArrowRight`/`KeyD` piden un salto.
   - Un salto dura `HOP_MS`. Si llega otra pulsación mientras salta, se guarda en un búfer de una sola entrada y se ejecuta al aterrizar.
   - No se puede bajar desde `ROW_START`.
   - Un salto lateral que dejaría `x` fuera de `[25, 775]` se recorta a ese rango.
6. **Colisiones y río.** Se comprueban al aterrizar y en cada frame posterior. Durante el vuelo la rana es inmune.
   - **Carretera:** si `frogBox` solapa un coche o un camión de su fila, la causa es `"atropello"`.
   - **Río:** la rana está a salvo si su `x` cae dentro de `[mover.x, mover.x + len]` de un objeto sólido de su fila. Mientras lo está, la arrastra a `speed * dir * speedMul` px/s. Si no está sobre ningún objeto sólido, la causa es `"ahogo"`. Si el arrastre la saca de `[0, W]`, la causa es `"arrastre"`.
   - **Orilla:** al aterrizar en `ROW_NESTS`, entra en el nenúfar libre cuyo centro esté a `NEST_TOLERANCE` px o menos. Si no hay ninguno, o si el más cercano ya está lleno, la causa es `"seto"`.
7. **Puntuación.**
   - Al aterrizar en una fila menor que `bestRow` dentro de esta vida, se suman 10 puntos y se actualiza `bestRow`.
   - Entrar en un nenúfar suma `50 + 10 × floor(segundosRestantes)`. Después, la rana nueva sale de `(START_X, ROW_START)` con el tiempo lleno.
   - Llenar los cinco nenúfares suma 1000 y sube el nivel. Los nenúfares se vacían y se llama a `buildMovers(level)`.
   - La puntuación se recorta a `MAX_SCORE`.
8. **Muerte, tiempo y vidas.**
   - Si el tiempo de la rana llega a 0, la causa es `"tiempo"`.
   - Cualquier muerte resta una vida, crea una `Splat` en la posición de la rana y pone `status: "dead"` durante `DEATH_PAUSE`. En ese tiempo el tráfico y el río siguen moviéndose.
   - Al revivir, la rana sale de la acera con el tiempo lleno y `bestRow = ROW_START`. La puntuación y los nenúfares llenos se conservan.
   - Con 0 vidas: `status: "gameover"` y `onGameOver(score)`. `forceGameOver()` hace lo mismo a petición del botón FIN.
9. **`components/games/cruce-anfibio-canvas.tsx`** con `"use client"`:
   - `ref` al `<canvas>` y un `useEffect` que crea el motor y devuelve `destroy()` en la limpieza.
   - Búfer de 800×600 multiplicado por `devicePixelRatio`.
   - `preventDefault()` en las cuatro flechas y en `KeyW`, `KeyA`, `KeyS` y `KeyD`.
   - Pausa automática por `visibilitychange` y `blur`.
   - Canvas con `width: 100%`, `aspect-ratio: 4 / 3` y `touch-action: none`.
10. **Controles táctiles.** Una cruceta de cuatro `.touch-btn` dentro de `.touch-pad`. `pointerdown`, `pointerup` y `pointercancel` se traducen a `setKey("ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight", …)`. El motor no distingue dedo de tecla.
11. **`components/games/cruce-anfibio-player.tsx`** sobre `components/player-shell.tsx`. HUD, marco CRT, botones PAUSA/FIN/SALIR y modal de fin de partida vienen del shell y no se duplican. `score`, `lives` y `level` salen del motor.
12. **Despacho.** Entrada `"cruce-anfibio": CruceAnfibioPlayer` en el mapa `PLAYERS` de `app/jugar/[id]/page.tsx`.
13. **Catálogo y seed.** Entrada `cruce-anfibio` al final de `GAMES` y `supabase/migrations/0006_seed_cruce-anfibio.sql`, con `insert into public.games … on conflict (id) do nothing` y `sort_order` 12. Se aplica con `apply_migration` y el `.sql` queda commiteado.
14. **Portada.** No hay CSS nuevo: se reutiliza `.cover-rana`, que ya dibuja franjas de agua y una rana verde.
15. **Registro.** Fila `cruce-anfibio | CRUCE ANFIBIO | ARCADE | green | Cruza la carretera y el río sin hacerte papilla.` en `references/implemented-games.md`.
16. **Verificación.** Ejecutar y comprobar:
    - `npm run lint` y `npm run build`.
    - `curl localhost:3000/api/games`.
    - Jugar una partida real y guardarla.
    - `curl "localhost:3000/api/scores?game=cruce-anfibio"`.
    - Que la partida aparece en `/salon` y que `plays` sube en la tabla de `/games`.

---

## Criterios de aceptación

**Del juego:**

- [ ] La partida empieza en el nivel 1, con 3 vidas, 0 puntos y la rana en `(400, fila 11)` mirando hacia arriba.
- [ ] Cada pulsación de flecha o de WASD produce exactamente un salto de una fila o de 50 px laterales. Mantener la tecla pulsada no encadena saltos.
- [ ] Una pulsación durante un salto se ejecuta al aterrizar. Una segunda pulsación en el mismo salto se descarta.
- [ ] Llegar por primera vez en esta vida a una fila más alta suma exactamente 10 puntos. Volver a ella tras retroceder no suma.
- [ ] Tocar un coche o un camión mata a la rana.
- [ ] Aterrizar en el río fuera de un tronco o una tortuga mata a la rana.
- [ ] Sobre un tronco o una tortuga, la rana se desplaza con él a su velocidad. Si el arrastre la saca de la pantalla, muere.
- [ ] Desde el nivel 2, el grupo de tortugas que bucea pasa 2,8 s a flote, 0,5 s hundiéndose (se dibuja más oscuro y aún se puede pisar) y 0,7 s sumergido (mata).
- [ ] Entrar en un nenúfar libre suma `50 + 10 × segundos enteros restantes`. Aterrizar en el seto o en un nenúfar ocupado mata a la rana.
- [ ] Si se acaban los 30 s de la rana, la rana muere. La barra de tiempo del canvas se pone magenta por debajo de 8 s.
- [ ] Llenar los cinco nenúfares suma 1000 puntos, sube el nivel en uno, vacía los nenúfares y multiplica las velocidades por `min(2.0, 1 + 0.12 × (nivel − 1))`.
- [ ] Al morir, la rana se convierte en papilla durante 1 s. Después reaparece en la acera, con la puntuación y los nenúfares llenos intactos.
- [ ] Con 0 vidas se abre el modal de fin de partida con la puntuación acumulada.
- [ ] Los cuatro botones táctiles mueven la rana igual que las flechas del teclado.
- [ ] El canvas no dibuja puntuación, vidas ni nivel; solo la barra de tiempo.

**De la plataforma:**

- [ ] `npm run lint` y `npm run build` terminan sin errores ni advertencias de hidratación.
- [ ] `/games` muestra CRUCE ANFIBIO con la portada `cover-rana`, y `/games/cruce-anfibio` sigue siendo estática.
- [ ] `grep -rn "getElementById" lib components` no devuelve resultados: el canvas llega por `ref`.
- [ ] Salir de `/jugar/cruce-anfibio` no deja ningún `requestAnimationFrame` corriendo, y volver a entrar no acelera el juego.
- [ ] El HUD de React y lo que ocurre en el canvas coinciden en todo momento.
- [ ] PAUSA congela el juego entero, y REANUDAR no mata a nadie por el salto de tiempo. FIN abre el modal con la puntuación acumulada. JUGAR DE NUEVO reinicia al estado inicial.
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
- **No:** reutilizar el id `ranaria`. Ya existe como simulacro con fila en `games`, y `on conflict (id) do nothing` ignoraría el seed. Además mezclaría las puntuaciones del simulacro con las reales. `ranaria` se queda intacta, como `caida`, `bloque-buster` y `serpentina`.
- **Sí:** categoría ARCADE. Es el género del juego. PUZZLE, SHOOTER y VERSUS no lo describen.
- **No:** VERSUS, aunque sea la categoría con menos juegos implementados (0). La regla de desempate solo aplica si hay duda, y aquí no la hay: un juego de cruce para un jugador no es un versus.
- **Sí:** color `green`. Es el de la rana y el de `cover-rana`.
- **Sí:** reutilizar `.cover-rana`. Ya dibuja agua a franjas y una rana verde, así que no hace falta CSS nuevo.
- **No:** portada `cover-cruce-anfibio` propia. Distinguiría la tarjeta de la de `ranaria`, pero añade CSS sin necesidad para una variante que aún no está elegida.
- **Sí:** sin sonido. No hay assets de audio y la plataforma no tiene conmutador de silencio.
- **Sí:** táctil con cruceta de cuatro `.touch-btn` dentro de `.touch-pad`. Es el mismo patrón de SNAKE y no tiene ambigüedad.
- **No:** gestos de deslizar sobre el canvas. Exigen umbrales, y un salto perdido aquí es una muerte.
- **Sí:** búfer de 800×600 con celdas de 50 px, que dan una rejilla de 16×12. Es el 4:3 del CRT y deja cinco filas de río, cuatro de carretera, mediana, acera y orilla.
- **Sí:** 3 vidas, como ASTEROIDES, ARKANOID y SNAKE.
- **Sí:** `x` continua y filas discretas. Las plataformas arrastran a la rana a cualquier `x`, así que ajustarla a columnas al aterrizar produciría saltos visuales.
- **Sí:** tolerancia de 22 px en los nenúfares. Desde `START_X = 400` con pasos de 50 px, todas las `x` alcanzables quedan a 20 px o menos de un centro (100→80, 250→240, 400, 550→560, 700→720).
- **Sí:** un salto por flanco de bajada, con búfer de una entrada. Sin búfer, el jugador pierde pulsaciones. Con repetición automática, una tecla mantenida mete a la rana en el río.
- **Sí:** el tráfico sigue moviéndose durante la papilla. El mundo no se congela por morir, y la reaparición es en la acera, que es segura.
- **Sí:** barra de tiempo dibujada en el canvas. `PlayerShell` solo tiene puntuación, vidas y nivel, y no se toca.
- **Sí:** puntuación recortada a 9.999.999. Llegar ahí exige miles de niveles, pero el recorte garantiza que el `POST` nunca devuelva `INVALID_BODY`.
- **Sí:** seed `0006_seed_cruce-anfibio.sql` con `sort_order` 12, que son el siguiente número y el siguiente orden libres según `supabase/migrations/`.
- **Sí:** despacho por `"cruce-anfibio": CruceAnfibioPlayer` en `PLAYERS`, con la clave entre comillas por el guion.
- **Sí:** fila nueva en `references/implemented-games.md` como paso del plan.
- **No:** niveles con tablas de carriles distintas. La variante A escala solo por velocidad y tortugas que bucean. Más variedad es materia de la variante C.

---

## Riesgos

| Riesgo                                                                                    | Mitigación                                                                                                                                  |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| La rana queda entre dos troncos por un píxel y el jugador siente que la muerte es injusta | La comprobación usa el centro de la rana contra todo el ancho del objeto, sin margen interior, así que basta con tener medio cuerpo encima. |
| Al envolver un objeto del carril aparece un hueco o un solapamiento                       | Cada carril cumple `count * spacing >= W + len`, y al salir se desplaza exactamente `count * spacing`.                                      |
| Un salto de pestaña acumula `dt` y arrastra a la rana fuera de pantalla al volver         | `dt` topado a 100 ms, `resume()` con `lastTime = null` y pausa automática por `visibilitychange` y `blur`.                                  |
| La repetición automática del teclado encadena saltos                                      | `setKey` solo actúa cuando la tecla pasa de arriba a abajo en el mapa interno.                                                              |
| Muerte instantánea al reaparecer si un coche pasa por la acera                            | La acera (fila 11) no tiene carril, así que ningún vehículo la cruza.                                                                       |
| `speedMul` de 2,0 hace el carril 8 (140 px/s → 280 px/s) imposible de cruzar              | Con 50 px de coche y 450 px de separación quedan 400 px libres, unos 1,4 s a 280 px/s, que es más que `HOP_MS`.                             |
| La clave `cruce-anfibio` con guion rompe un objeto literal o un nombre de archivo SQL     | La clave va entre comillas en `PLAYERS`. Los nombres de archivo admiten guion, como las rutas `/jugar/[id]`.                                |

---

## Lo que **no** entra en esta spec

- Sonido.
- Cocodrilos, serpientes, nutrias, moscas y rana acompañante.
- Fases de noche o lluvia y combos.
- Tocar la entrada simulada `ranaria`.
- Portada propia.
- Cambios en `PlayerShell`, `/api/scores`, la RLS o el esquema de `scores`.
- Tests automatizados.

Cada una de ellas, si llega, va en su propia spec.
