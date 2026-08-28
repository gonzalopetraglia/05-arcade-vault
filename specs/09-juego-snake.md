# SPEC 09 — Snake, el cuarto juego real

> **Estado:** Aceptado
> **Depende de:** SPEC 01, SPEC 05, SPEC 06, SPEC 07, SPEC 08
> **Fecha:** 2026-08-28
> **Objetivo:** Diseñar desde cero un Snake en TypeScript sobre la API de motor del Vault, jugable en `/jugar/snake` con teclado y controles táctiles, con las frutas del atlas `references/source-assets/snake-assets/`, su entrada propia de catálogo y su puntuación guardada por el flujo que ya existe.

---

## Por qué existe esta spec

Las SPEC 05, 07 y 08 portaron ASTEROIDES, TETRIS y ARKANOID desde `references/started-games/`. Esta es la primera que **no parte de un juego existente**: no hay `game.js` que traducir. La mecánica se define aquí y el código se escribe directamente en su forma final.

Lo que sí viene dado es el material gráfico: `references/source-assets/snake-assets/` contiene dos archivos.

- `fruits.png` — hoja de 3790×442 px con fondo transparente.
- `sprites.js` — 46 líneas que declaran `window.SPRITE_ATLAS` con 22 recortes de fruta, todos en la fila `y = 136`, alto 160 px y ancho entre 110 y 170 px. Origen: spriters-resource, Google Snake Game.

Ese atlas es la única parte que se traduce literalmente: las coordenadas se copian tal cual a un módulo TypeScript. Todo lo demás —bucle, colisiones, puntuación— se diseña nuevo, respetando los contratos que ya fijaron las tres specs anteriores.

Dos consecuencias de diseñar desde cero:

- **El motor no avanza por `dt` continuo, sino por tics.** Snake se mueve por celdas discretas. El bucle sigue siendo un `requestAnimationFrame` con `dt`, pero acumula tiempo y solo mueve la serpiente cuando el acumulador supera el intervalo del tic.
- **No hay HUD ni overlays que retirar.** El HUD lo pone `PlayerShell` desde el principio; el canvas solo dibuja el juego.

---

## Alcance

**Dentro:**

- Juego nuevo en `lib/games/snake/`: `sprites.ts` (atlas de frutas y carga de la imagen), `entities.ts` (constantes del mundo, serpiente, fruta) y `engine.ts` con la clase `SnakeEngine`.
- Copia de `references/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png`.
- `components/games/snake-canvas.tsx`: componente cliente que monta el `<canvas>`, instancia el motor, conecta teclado y controles táctiles, y lo destruye al desmontar.
- `components/games/snake-player.tsx`: el player, montado sobre `components/player-shell.tsx`.
- Controles táctiles bajo `@media (pointer: coarse)`: cuatro botones de dirección.
- Entrada nueva `snake` en `GAMES` (`lib/games.ts`), la duodécima, con `cover-snake`.
- Migración `supabase/migrations/0005_seed_snake.sql` con `sort_order` 11, aplicada por el MCP de Supabase y commiteada.
- `app/jugar/[id]/page.tsx`: entrada `snake` en el mapa `PLAYERS` que ya existe.

**Fuera de alcance (para specs futuras):**

- Sonido. `snake-assets/` no trae audio y no se van a buscar MP3 de fuera.
- Puntuación distinta por tipo de fruta. Todas valen 10 puntos.
- Obstáculos, muros internos, power-ups o modos alternativos.
- Renombrar o retirar la entrada simulada `serpentina`.
- Auth real, rutas de API nuevas, cambios en la RLS o en el esquema de `scores`.
- Modificar `references/source-assets/` o `references/started-games/`.
- Tests automatizados.

---

## Modelo de datos

### Entrada de catálogo — `lib/games.ts`

```ts
{
  id: "snake",
  title: "SNAKE",
  short: "Come fruta, crece y no te muerdas.",
  long: "Una serpiente recorre una grilla de 20×15 buscando fruta. Cada bocado la alarga 10 puntos y, cada cinco frutas, el mundo se mueve un poco más rápido. El muro mata y la propia cola también; tienes tres vidas para llegar lo más lejos posible.",
  cat: "ARCADE",
  cover: "cover-snake",
  color: "green",
}
```

`Game` no lleva `best` ni `plays`: esos dos números vienen de la vista `game_stats` por `GET /api/games`.

### Constantes del mundo — `lib/games/snake/entities.ts`

```ts
export const CELL = 40; // píxeles por celda
export const COLS = 20;
export const ROWS = 15;
export const W = COLS * CELL; // 800
export const H = ROWS * CELL; // 600

export const START_LEN = 3; // celdas de la serpiente al empezar
export const LIVES = 3;
export const FRUIT_POINTS = 10;

export const TICK_START = 150; // ms por celda al empezar
export const TICK_STEP = 10; // ms que se recortan por subida de nivel
export const TICK_MIN = 70; // suelo de velocidad
export const FRUITS_PER_LEVEL = 5;
export const DEATH_PAUSE = 1000; // ms de status "dead" antes de revivir
```

Nivel y ritmo se derivan de la fruta comida, no se guardan por separado:

```ts
level = Math.floor(fruitsEaten / FRUITS_PER_LEVEL) + 1;
tickMs = Math.max(TICK_MIN, TICK_START - (level - 1) * TICK_STEP);
```

### Estructuras internas

```ts
export type Cell = { x: number; y: number }; // coordenadas de grilla, no píxeles
export type Dir = "up" | "down" | "left" | "right";

// La serpiente es un array de celdas; el índice 0 es la cabeza.
type Snake = Cell[];

// La fruta guarda su celda y qué sprite del atlas le tocó.
export type Fruit = { cell: Cell; sprite: FruitName };
```

Convenciones: origen arriba-izquierda, `x` en columnas `0..COLS-1`, `y` en filas `0..ROWS-1`. La dirección se aplica una vez por tic.

### Atlas de frutas — `lib/games/snake/sprites.ts`

Traducción literal de `references/source-assets/snake-assets/sprites.js`: los mismos 22 recortes, con las mismas coordenadas.

```ts
export type Frame = { sx: number; sy: number; sw: number; sh: number };
export type FruitName = "banana" | "orange" | /* … */ "melon";

export const FRUITS: Record<FruitName, Frame>; // 22 entradas, todas con sy: 136, sh: 160
export const FRUIT_NAMES: FruitName[]; // para elegir una al azar
export function loadFruits(): Promise<HTMLImageElement>; // promesa cacheada a nivel de módulo
```

`loadFruits()` sigue el patrón de `lib/games/arkanoid/sprites.ts`: una promesa cacheada en el módulo, para que entrar y salir del juego no vuelva a descargar la imagen. La ruta es `/games/snake/fruits.png`.

### Estado que el motor emite al HUD

```ts
export type SnakeState = {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
};
```

`onState` se llama **solo cuando algún campo cambia** respecto al frame anterior. El motor es la única fuente de `score`, `lives` y `level`.

### API pública del motor — `lib/games/snake/engine.ts`

Calcada de `AsteroidsEngine`:

```ts
type EngineOptions = {
  onState: (s: SnakeState) => void;
  onGameOver: (finalScore: number) => void;
};

export class SnakeEngine {
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

1. **Copiar el asset.** `public/games/snake/fruits.png`, copia byte a byte de `references/source-assets/snake-assets/fruits.png`. El original no se toca. Verificación: `curl -I localhost:3000/games/snake/fruits.png` responde 200.
2. **`lib/games/snake/sprites.ts`.** Los 22 recortes del atlas, `FRUIT_NAMES` y `loadFruits()` con la promesa cacheada.
3. **`lib/games/snake/entities.ts`.** Las constantes de arriba, el tipo `Cell`, la clase `SnakeBody` (`cells`, `dir`, `grow(n)`, `step()`, `hitsWall()`, `hitsSelf()`) y el helper `spawnFruit(occupied)`, que elige celda libre y sprite al azar. `draw(ctx, img)` recibe contexto e imagen por parámetro; ningún módulo lee un global.
4. **Dibujo.** El fondo es una rejilla tenue de 20×15. La serpiente se pinta como celdas redondeadas: cabeza en verde claro, cuerpo en verde del tema, con 2 px de separación entre celdas. La fruta se escala a 36 px de alto conservando la proporción del recorte (`sw / sh`) y se centra en su celda.
5. **`lib/games/snake/engine.ts`.** Bucle `requestAnimationFrame` con acumulador de tiempo: mueve la serpiente cuando el acumulador supera `tickMs`, y `dt` se topa a 100 ms para que un salto de pestaña no adelante varios tics de golpe. Guarda el id del `rAF` para cancelarlo en `pause()` y `destroy()`. No dibuja nada hasta que `loadFruits()` resuelve. No hay reinicio por tecla.
6. **Entrada y giros.** `setKey` empuja la dirección a una cola de como mucho dos entradas; cada tic consume una. Se descarta el giro de 180° respecto a la dirección efectiva del tic, para que un doble toque rápido no mate a la serpiente contra su propio cuello.
7. **Muerte y vidas.** Chocar con muro o cola resta una vida y pone `status: "dead"` durante `DEATH_PAUSE`. Al revivir, la serpiente vuelve al centro con `START_LEN` celdas mirando a la derecha, la fruta se recoloca y la puntuación **se conserva**. Con 0 vidas, `status: "gameover"` y `onGameOver(score)`.
8. **`components/games/snake-canvas.tsx`** con `"use client"`: `ref` al `<canvas>`, `useEffect` que crea el motor y devuelve `destroy()` en la limpieza, búfer multiplicado por `devicePixelRatio`, `preventDefault()` en las cuatro flechas y en el espacio, y pausa automática por `visibilitychange` y `blur`.
9. **Controles táctiles.** Cruceta de cuatro `.touch-btn` dentro de `.touch-pad`, traduciendo `pointerdown`/`pointerup`/`pointercancel` a `setKey("ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight", …)`. El motor no distingue dedo de tecla.
10. **`components/games/snake-player.tsx`** sobre `components/player-shell.tsx`: HUD, marco CRT, botones PAUSA/FIN/SALIR y modal de fin de partida vienen del shell y no se duplican. `score`, `lives` y `level` salen del motor.
11. **Despacho.** Entrada `snake: SnakePlayer` en el mapa `PLAYERS` de `app/jugar/[id]/page.tsx`.
12. **Catálogo y seed.** Entrada `snake` en `GAMES` y `supabase/migrations/0005_seed_snake.sql` con `insert into public.games … on conflict (id) do nothing` y `sort_order` 11. Se aplica con `apply_migration` y el `.sql` queda commiteado.
13. **Portada.** Ninguna clase CSS nueva: se reutiliza `.cover-snake`, que ya existe en `app/globals.css`.

---

## Criterios de aceptación

**Del juego:**

- [ ] La serpiente empieza en el centro con 3 celdas mirando a la derecha y se mueve sola.
- [ ] Cada fruta comida suma exactamente 10 puntos y alarga la serpiente una celda.
- [ ] La fruta nunca aparece sobre una celda ocupada por la serpiente.
- [ ] El sprite de la fruta se elige al azar entre los 22 del atlas y se dibuja con su proporción original.
- [ ] Chocar contra el muro resta una vida; chocar contra la propia cola también.
- [ ] Al perder una vida la puntuación se conserva y la serpiente vuelve al estado inicial tras ~1 segundo.
- [ ] Con 0 vidas se abre el modal de fin de partida con la puntuación acumulada.
- [ ] Cada 5 frutas el nivel sube uno y el tic se acorta 10 ms, con suelo en 70 ms.
- [ ] Pulsar la dirección opuesta a la del movimiento actual no mata a la serpiente: el giro se descarta.
- [ ] Los cuatro botones táctiles giran la serpiente igual que las flechas del teclado.

**De la plataforma:**

- [ ] `npm run lint` y `npm run build` terminan sin errores ni advertencias de hidratación.
- [ ] `/games` muestra SNAKE con su portada, y `/games/snake` sigue siendo estática.
- [ ] `grep -rn "getElementById" lib components` no devuelve resultados: el canvas llega por `ref`.
- [ ] Salir de `/jugar/snake` no deja ningún `requestAnimationFrame` corriendo; volver a entrar no acelera el juego.
- [ ] El HUD de React y lo que ocurre en el canvas coinciden en todo momento.
- [ ] PAUSA congela el juego entero y REANUDAR no mata a nadie por el salto de tiempo; FIN abre el modal con la puntuación acumulada; JUGAR DE NUEVO reinicia al estado inicial.
- [ ] Guardar en el modal inserta la puntuación en la base y aparece en `/salon` sin recargar a mano; si el `POST` falla, el modal muestra un error y no finge que se guardó.
- [ ] `curl localhost:3000/api/games` devuelve `snake` con `best` y `plays` numéricos.
- [ ] `curl "localhost:3000/api/scores?game=snake"` devuelve la partida guardada.
- [ ] Reejecutar `0005_seed_snake.sql` no duplica ninguna fila.
- [ ] `references/source-assets/` y `references/started-games/` no tienen ningún cambio.
- [ ] `/jugar/asteroides`, `/jugar/tetris`, `/jugar/arkanoid` y `/jugar/serpentina` siguen funcionando igual que antes.

---

## Decisiones

- **Sí:** entrada nueva `snake`, con `serpentina` intacta como simulacro. Es lo mismo que se hizo con `tetris` junto a `caida` y `arkanoid` junto a `bloque-buster`. Renombrar `serpentina` rompería `/games/serpentina` y las puntuaciones ya guardadas con esa clave.
- **No:** reutilizar el id `serpentina` para el juego real. Ahorra una migración, pero mezcla las puntuaciones del simulacro con las reales.
- **Sí:** el muro mata. Es el Snake moderno, el mismo del que salen estos sprites, y tensa la partida.
- **No:** bordes que atraviesan. Más indulgente, pero quita casi toda la dificultad de los primeros niveles.
- **Sí:** 3 vidas, como ASTEROIDES y ARKANOID. Da coherencia al HUD, que ya tiene su hueco de vidas.
- **Sí:** fruta al azar del atlas, 10 puntos todas. Aprovecha los 22 sprites sin abrir un balance de puntuaciones que habría que ajustar a mano.
- **No:** puntuación distinta por fruta. Queda para otra spec si alguna vez interesa.
- **Sí:** grilla 20×15 con celda de 40 px sobre un búfer de 800×600. Es el 4:3 que ya usan ASTEROIDES y ARKANOID, así que la pantalla del CRT sirve sin tocar estilos, y la celda es lo bastante grande para que la fruta se reconozca.
- **No:** canvas cuadrado de 600×600. Rompe el 4:3 del marco y deja franjas laterales.
- **Sí:** cruceta táctil de cuatro botones. Traduce a `setKey` sin ambigüedad y reutiliza `.touch-pad` y `.touch-btn`.
- **No:** swipe sobre el canvas. Más natural en móvil, pero introduce umbrales y gestos ambiguos que no aportan al alcance.
- **Sí:** sin sonido. No hay audio en `snake-assets/` y buscar MP3 de fuera se sale del alcance.
- **Sí:** reutilizar `.cover-snake`. La portada ya dibuja una serpiente; no hace falta CSS nuevo.
- **Sí:** cola de direcciones de tamaño 2. Sin ella, dos pulsaciones dentro del mismo tic pierden la primera y el juego responde peor de lo que el jugador espera.

---

## Riesgos

| Riesgo                                                                  | Mitigación                                                                                                                                          |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| La imagen de frutas no ha cargado cuando el motor arranca               | `loadFruits()` es una promesa cacheada y el bucle no dibuja hasta que resuelve. Si falla, la fruta se pinta como un círculo verde y el juego sigue. |
| Un salto de pestaña acumula varios tics y mata a la serpiente al volver | `dt` topado a 100 ms y pausa automática por `visibilitychange` y `blur`.                                                                            |
| Doble pulsación rápida provoca un giro de 180° y muerte instantánea     | La cola descarta el opuesto de la dirección efectiva del tic, no de la última tecla.                                                                |
| Los recortes del atlas tienen anchos distintos (110–170 px)             | Se escala por alto fijo de 36 px y el ancho sale de `sw / sh`; la fruta se centra en la celda.                                                      |
| A partir de cierto largo la serpiente ocupa casi toda la grilla         | `spawnFruit` recorre las celdas libres; si no queda ninguna, la partida termina como victoria con `onGameOver`.                                     |

---

## Lo que **no** entra en esta spec

- Sonido.
- Puntuación por tipo de fruta.
- Obstáculos, niveles con muros internos o power-ups.
- Retirar o renombrar la entrada simulada `serpentina`.
- Portar cualquier otro juego del catálogo.
- Tests automatizados.

Cada una de ellas, si llega, va en su propia spec.
