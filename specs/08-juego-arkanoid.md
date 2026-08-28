# SPEC 08 — Arkanoid, el tercer juego real

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-08-28
> **Objetivo:** Portar el juego de canvas de `references/started-games/04-arkanoid/` a un motor TypeScript integrado en la plataforma, jugable en `/jugar/arkanoid` con teclado, ratón o controles táctiles, con su spritesheet y sus sonidos, su entrada propia de catálogo y su puntuación guardada por el flujo que ya existe.

---

## Por qué existe esta spec

La SPEC 05 portó ASTEROIDES y fijó el patrón; la SPEC 07 lo repitió con TETRIS y convirtió el despacho de `/jugar/[id]` en un mapa `id → componente`. Esta spec porta el tercero: el Arkanoid de `references/started-games/04-arkanoid/`.

El material de partida vuelve a tener una forma distinta, y eso condiciona el trabajo:

- **Tres scripts globales concatenados.** `index.html` carga `assets/spritesheet.js`, `levels.js` y `game.js` en ese orden, y cada uno declara globales que el siguiente usa. El port los convierte en tres módulos con importaciones explícitas.
- **Sin clases.** `game.js` son 268 líneas de funciones sueltas sobre globales (`paddle`, `ball`, `blocks`, `explosions`, `lives`, `score`, `gameState`, `currentLevel`, `isPaused`, `keys`, `lastTime`). Ese estado global pasa a ser campos de una instancia.
- **Arranque asíncrono.** El bucle no arranca a nivel de módulo: arranca dentro de `loadSpritesheet(cb)`, cuando la imagen ha cargado. El motor tiene que respetar eso y no dibujar nada hasta tener el spritesheet.
- **Assets binarios con rutas relativas.** `assets/spritesheet-breakout.png` y dos MP3 en `assets/sounds/`. En Next van a `public/`, así que las rutas cambian.
- **Un solo canvas de 800×600.** Relación 4:3, la misma que ASTEROIDES, así que la pantalla del CRT ya le sirve.
- **HUD dibujado en el canvas.** No hay HUD en DOM: `draw()` pinta `Score:`, `Nivel:` y las vidas como pelotitas. Eso lo cubre `PlayerShell` y desaparece del motor.
- **Overlays propios.** `drawOverlay('GAME OVER')`, `drawOverlay('¡Completaste el juego!')` y un `drawPauseOverlay()` con cinco botones para saltar de nivel. Los tres desaparecen: pausar, terminar y reiniciar son cosa del shell.
- **`localStorage` no se usa.** Nada que portar por ese lado.

---

## Alcance

**Dentro:**

- Port a TypeScript en `lib/games/arkanoid/`: `levels.ts` (los 5 niveles), `sprites.ts` (spritesheet y helpers de dibujo), `entities.ts` (constantes del mundo, paleta, pelota, bloques, explosiones) y `engine.ts` con la clase `ArkanoidEngine`.
- Copia de los assets a `public/games/arkanoid/`: `spritesheet-breakout.png`, `sounds/ball-bounce.mp3` y `sounds/break-sound.mp3`.
- `components/games/arkanoid-canvas.tsx`: componente cliente que monta el `<canvas>`, instancia el motor, conecta teclado, ratón y controles táctiles, y lo destruye al desmontar.
- `components/games/arkanoid-player.tsx`: el player del juego, montado sobre `components/player-shell.tsx`.
- Controles táctiles bajo `@media (pointer: coarse)`: izquierda y derecha.
- Control por ratón: `mousemove` sobre el canvas centra la paleta en el cursor, como en el original.
- Sonido: rebote de pelota y rotura de bloque, con los dos MP3 del original.
- Entrada nueva `arkanoid` en `GAMES` (`lib/games.ts`), la undécima, con `cover-bricks`.
- Migración `supabase/migrations/0004_seed_arkanoid.sql` con `sort_order` 10, aplicada por el MCP de Supabase y commiteada.
- `app/jugar/[id]/page.tsx`: entrada `arkanoid` en el mapa `PLAYERS` que ya existe.
- Pausa automática al ocultar la pestaña o perder el foco.

**Fuera de alcance (para futuras specs):**

- **Tocar la entrada `bloque-buster`.** Se queda en el catálogo con sus datos actuales y su simulacro, aunque describa este mismo juego. Renombrarla o borrarla rompería `/games/bloque-buster`, `/jugar/bloque-buster` y las puntuaciones ya guardadas con esa clave.
- **Portar los otros juegos simulados del catálogo.**
- **Cambiar el juego.** Ni velocidades, ni puntos por bloque, ni número de vidas, ni los cinco niveles: port fiel.
- **Los cinco botones de salto de nivel del overlay de pausa.** Son herramienta de desarrollo y falsearían el leaderboard.
- **Conmutador de silencio.** Los sonidos suenan o no suenan según lo que permita el navegador; no hay botón de mute.
- **Portada nueva.** `arkanoid` reutiliza `cover-bricks`.
- **Cambios en `PlayerShell`.** El shell no se toca.
- **Rutas de API nuevas, cambios en la RLS o en el esquema de `scores`.**
- **Auth real.** El nombre del jugador sale de la sesión y del campo del modal, como hasta ahora.
- **Modificar `references/started-games/`.**
- Tests automatizados.

---

## Modelo de datos

No hay nada nuevo persistido más allá de una fila en `public.games`. Las puntuaciones se guardan con el contrato de la SPEC 06 (`POST /api/scores`, cuerpo `{ game, score, name }`), con `game: "arkanoid"`.

**Entrada nueva en `GAMES` (`lib/games.ts`):**

```ts
{
  id: "arkanoid",
  title: "ARKANOID",
  short: "Cinco muros, tres vidas y una pelota que no perdona.",
  long: "El rompeladrillos clásico con sus sprites originales. Cinco niveles con formaciones distintas —muro lleno, pirámide, tablero de ajedrez, hueco y marco con cruz— y la pelota acelerando un 10 % en cada uno. Cada bloque estalla en cuatro fotogramas y suma 10 puntos.",
  cat: "ARCADE",
  cover: "cover-bricks",
  color: "cyan",
}
```

**Constantes del mundo (`lib/games/arkanoid/entities.ts`), copiadas literalmente del original:**

```ts
export const W = 800;
export const H = 600;
export const PADDLE_SPEED = 400;
export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;
export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2; // 80
export const BLOCKS_ORIGIN_Y = 80;
export const START_LIVES = 3;
export const POINTS_PER_BLOCK = 10;
export const EXPLOSION_DURATION = 150; // ms
```

`W` y `H` sustituyen a los `canvas.width` y `canvas.height` que el original leía del DOM. El búfer del canvas es fijo y el CSS lo estira.

**Entidades:**

```ts
export type BlockColor = "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";
export type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
};
export type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number;
};
export type Paddle = { x: number; y: number; w: number; h: number };
export type Ball = { x: number; y: number; w: number; h: number; vx: number; vy: number };
```

**Niveles (`lib/games/arkanoid/levels.ts`):**

```ts
export type LevelBlock = { col: number; row: number; color: BlockColor };
export type Level = { speed: number; blocks: LevelBlock[] };
export const LEVELS: Level[]; // 5 niveles, speed 1.00, 1.10, 1.21, 1.33, 1.46
```

Los cinco generadores del original (muro lleno, pirámide, tablero de ajedrez, huecos y marco con cruz) se traducen tal cual, con las mismas tablas `pyStart`, `pyEnd` y `gaps4` y los mismos arrays de colores por fila.

**Spritesheet (`lib/games/arkanoid/sprites.ts`):**

```ts
export type Frame = { sx: number; sy: number; sw: number; sh: number };
export const SPRITES: { paddle: Frame; ball: Frame; blocks: Record<BlockColor, Frame> };
export const EXPLOSION_FRAMES: Record<BlockColor, [Frame, Frame, Frame, Frame]>;
export function loadSpritesheet(): Promise<CanvasImageSource>;
export function drawFrame(ctx, img, frame, x, y, w, h): void;
export function drawSprite(ctx, img, frame, x, y, w, h): void;
```

Mismas coordenadas que `assets/spritesheet.js`. `loadSpritesheet()` sustituye el patrón de callbacks del original por una promesa cacheada a nivel de módulo, resuelta con el `<canvas>` fuera de pantalla que el original ya construía. La ruta pasa a ser `/games/arkanoid/spritesheet-breakout.png`.

**Sonido (`lib/games/arkanoid/sprites.ts` no; va en `engine.ts`):**

Dos `Audio` creados por el motor, con `/games/arkanoid/sounds/ball-bounce.mp3` y `/games/arkanoid/sounds/break-sound.mp3`. El original hace `sound.cloneNode().play()` en cada golpe para permitir solapamiento; el port mantiene eso y envuelve la llamada en un `catch` vacío, porque `play()` devuelve una promesa que el navegador rechaza mientras no haya habido interacción del usuario.

**Estado que el motor emite al HUD de React:**

```ts
export type ArkanoidState = {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "gameover";
};
```

No hay `"dead"`: perder una vida repone la pelota en el mismo frame, sin estado intermedio. `onState` se llama solo cuando algún campo cambia respecto al frame anterior.

**API pública del motor (`lib/games/arkanoid/engine.ts`):**

```ts
type EngineOptions = {
  onState: (s: ArkanoidState) => void;
  onGameOver: (finalScore: number) => void;
};

export class ArkanoidEngine {
  constructor(canvas: HTMLCanvasElement, opts: EngineOptions);
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  forceGameOver(): void;
  setKey(code: string, down: boolean): void;
  setPaddleX(worldX: number): void; // ratón: centro de la paleta en coordenadas del mundo
  destroy(): void;
}
```

Es la API estándar de `AsteroidsEngine` más `setPaddleX`, que es el único control que no encaja en `setKey` porque es posicional y no de estado.

---

## Plan de implementación

1. **Assets.** Copiar `spritesheet-breakout.png`, `ball-bounce.mp3` y `break-sound.mp3` a `public/games/arkanoid/` (los MP3 bajo `sounds/`). `references/started-games/04-arkanoid/` no se toca.
2. **`lib/games/arkanoid/sprites.ts`.** `SPRITES`, `EXPLOSION_FRAMES` y `EXPLOSION_DURATION` con las coordenadas del original. `loadSpritesheet()` devuelve una promesa cacheada que carga el PNG, lo pinta en un canvas fuera de pantalla y resuelve con él. `drawSprite` y `drawFrame` reciben la imagen por parámetro, no por global.
3. **`lib/games/arkanoid/levels.ts`.** Los cinco generadores traducidos literalmente, con sus arrays de colores, `pyStart`, `pyEnd` y `gaps4`, y las velocidades `1.00`, `1.10`, `1.21`, `1.33`, `1.46`.
4. **`lib/games/arkanoid/entities.ts`.** Constantes del mundo, los tipos de arriba y las funciones puras: `createPaddle()`, `createBall(paddle, speed)`, `buildBlocks(level)` y `collideAABB(ball, block)`, con las mismas fórmulas del original.
5. **`lib/games/arkanoid/engine.ts` — estado y bucle.** La clase con los campos que antes eran globales, `start()` esperando a `loadSpritesheet()` antes del primer `requestAnimationFrame`, el id del `rAF` guardado para cancelarlo en `pause()` y `destroy()`, `resume()` poniendo `lastTime = null` y `restart()` volviendo al nivel 1 con 3 vidas y 0 puntos. Se eliminan el atajo `p`/`Escape` de pausa, el `click` de salto de nivel y los tres overlays.
6. **`engine.ts` — física y entrada.** `update(dt)` traducido línea a línea: paleta por `keys.ArrowLeft` / `keys.ArrowRight` a `PADDLE_SPEED`, rebotes en las tres paredes, rebote en la paleta con el margen de 8 px, colisión de bloque que invierte `vy`, suma 10 puntos y corta el bucle tras el primer bloque del frame. `setKey(code, down)` alimenta el mapa de teclas; `setPaddleX(worldX)` centra la paleta y la recorta a `[0, W - PADDLE_W]`.
7. **`engine.ts` — niveles, vidas y fin.** Limpiar todos los bloques carga el nivel siguiente; limpiar el nivel 5 pasa `status` a `"gameover"` y llama a `onGameOver(score)`. Perder la pelota por debajo de `H` resta una vida y repone la pelota; con 0 vidas, fin de partida. `forceGameOver()` hace lo mismo a petición del botón FIN.
8. **`engine.ts` — dibujo y estado.** `draw()` pinta fondo negro, bloques vivos, explosiones (4 fotogramas repartidos en `EXPLOSION_DURATION`), paleta y pelota. Ya no dibuja `Score:`, `Nivel:` ni las pelotitas de vidas: eso es del HUD del shell. Tras cada frame, si `score`, `lives`, `level` o `status` cambiaron, se emite `onState`.
9. **`components/games/arkanoid-canvas.tsx`** con `"use client"`: `ref` al `<canvas>`, `useEffect` que crea el motor y devuelve `destroy()` en la limpieza, búfer multiplicado por `devicePixelRatio`, `preventDefault()` en `ArrowLeft` y `ArrowRight`, `mousemove` sobre el canvas convertido a coordenadas del mundo y pasado a `setPaddleX`, y pausa automática por `visibilitychange` y `blur`. El canvas va con `width: 100%`, `aspect-ratio: 4 / 3` y `touch-action: none`, como el de asteroides.
10. **Controles táctiles.** `.touch-pad.left` con ← y `.touch-pad.right` con →, reutilizando `.touch-btn` de `app/globals.css`. `pointerdown` / `pointerup` / `pointercancel` se traducen a `setKey("ArrowLeft" | "ArrowRight", down)`, para que el motor no distinga dedo de tecla.
11. **`components/games/arkanoid-player.tsx`** sobre `PlayerShell`: HUD, marco CRT, botones PAUSA/FIN/SALIR y modal de fin de partida vienen del shell. `score`, `lives` y `level` salen del motor.
12. **Despacho.** Entrada `arkanoid: ArkanoidPlayer` en el mapa `PLAYERS` de `app/jugar/[id]/page.tsx`.
13. **Catálogo y seed.** Entrada `arkanoid` al final de `GAMES` y `supabase/migrations/0004_seed_arkanoid.sql` con `insert into public.games ... on conflict (id) do nothing` y `sort_order` 10. Se aplica con `apply_migration` y el `.sql` queda commiteado.
14. **Verificación.** `npm run lint`, `npm run build`, `curl localhost:3000/api/games`, una partida real guardada, `curl "localhost:3000/api/scores?game=arkanoid"`, y comprobar `/salon` y la tabla de `/games`.

No hay paso de portada: `cover-bricks` ya existe en `app/globals.css` y no se toca.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores ni advertencias de hidratación.
- [ ] `/games` muestra ARKANOID con la portada `cover-bricks`, y `/games/arkanoid` sigue siendo estática.
- [ ] `grep -rn "getElementById" lib components` no devuelve resultados: el canvas llega por `ref`.
- [ ] Salir de `/jugar/arkanoid` no deja ningún `requestAnimationFrame` corriendo; volver a entrar no acelera el juego.
- [ ] La partida empieza en el nivel 1 con 3 vidas y 0 puntos.
- [ ] Romper un bloque suma exactamente 10 puntos e invierte la componente vertical de la pelota.
- [ ] Cada bloque roto deja una explosión de 4 fotogramas que dura 150 ms y desaparece sola.
- [ ] Limpiar todos los bloques carga el nivel siguiente, y la velocidad de la pelota sube según `1.00`, `1.10`, `1.21`, `1.33`, `1.46`.
- [ ] Los cinco niveles tienen las formaciones del original: muro lleno, pirámide, tablero de ajedrez, huecos y marco con cruz.
- [ ] Limpiar el nivel 5 termina la partida y abre el modal con la puntuación acumulada.
- [ ] Perder la pelota por debajo del área resta una vida y repone la pelota sobre la paleta; con 0 vidas termina la partida.
- [ ] El sprite del spritesheet se usa para paleta, pelota, bloques y explosiones, y nada se dibuja antes de que la imagen cargue.
- [ ] Suena el rebote al chocar con paredes y paleta, y el sonido de rotura al romper un bloque; si el navegador bloquea la reproducción, el juego sigue funcionando sin errores en consola.
- [ ] ← y → mueven la paleta a 400 px/s y no la dejan salir del área.
- [ ] Mover el ratón sobre el canvas centra la paleta en el cursor, también cuando el canvas está escalado por CSS.
- [ ] Los botones táctiles producen exactamente el mismo efecto que ← y →.
- [ ] El HUD de React muestra los puntos, las vidas y el nivel emitidos por el motor, y coincide con lo que ocurre en el canvas.
- [ ] El canvas ya no dibuja `Score:`, `Nivel:` ni las pelotitas de vidas.
- [ ] PAUSA congela el juego entero y REANUDAR no pierde ninguna vida por el salto de tiempo; FIN abre el modal con la puntuación acumulada; JUGAR DE NUEVO vuelve al nivel 1 con 3 vidas y 0 puntos.
- [ ] No existe ningún atajo de teclado de pausa ni ningún botón de salto de nivel dibujado en el canvas.
- [ ] Guardar en el modal inserta la puntuación en la base y aparece en `/salon` sin recargar a mano; si el `POST` falla, el modal muestra un error y no finge que se guardó.
- [ ] Reejecutar `0004_seed_arkanoid.sql` no duplica ninguna fila.
- [ ] `references/started-games/04-arkanoid/` no tiene ningún cambio.
- [ ] `/jugar/asteroides`, `/jugar/tetris`, `/jugar/bloque-buster` y `/jugar/serpentina` siguen funcionando igual que antes.

---

## Decisiones

- **Sí:** id nuevo `arkanoid`, entrada undécima con `sort_order` 10. No rompe URLs ni puntuaciones existentes.
- **No:** reutilizar, renombrar o borrar `bloque-buster`. Renombrar rompe `/games/bloque-buster` y `/jugar/bloque-buster` y huérfana las puntuaciones guardadas con esa clave. Coste aceptado: dos entradas del mismo género conviven en el catálogo, igual que `tetris` y `caida`.
- **Sí:** `cover-bricks`, ARCADE y cyan. La portada ya existe y es exactamente un muro de bloques; cero CSS nuevo.
- **No:** portada `cover-arkanoid` propia. Ahorra CSS a cambio de que `arkanoid` y `bloque-buster` se vean iguales en la cuadrícula.
- **Sí:** portar el spritesheet y los dos MP3 a `public/games/arkanoid/`. Port fiel: mismos sprites y mismas explosiones de 4 fotogramas.
- **No:** redibujar con primitivas de canvas en la paleta neón del Vault. Sería más coherente visualmente, pero pierde las explosiones por spritesheet y deja de ser un port.
- **Sí:** sonido, con `cloneNode().play()` por golpe como el original, y el rechazo de la promesa ignorado. Sin gesto previo del usuario el navegador lo bloquea, y eso no puede romper la partida.
- **No:** conmutador de silencio. Añadiría estado de UI a `PlayerShell`, que es compartido por todo el catálogo.
- **Sí:** `setPaddleX(worldX)` además de `setKey`. El control por ratón del original es posicional y no cabe en un mapa de teclas.
- **Sí:** teclado, táctil y ratón a la vez. Los tres escriben sobre la misma `paddle.x` y el último que actúa manda, como en el original.
- **Sí:** limpiar el nivel 5 llama a `onGameOver(score)`. Es el `gameState = 'win'` del original traducido al flujo de puntuaciones del Vault.
- **No:** bucle infinito de niveles tras el 5. Daría puntuaciones ilimitadas y cambiaría el juego.
- **No:** bonus por vidas restantes al ganar. Rebalanceo: rompe la comparación con el original.
- **No:** portar los cinco botones de salto de nivel del overlay de pausa. Son herramienta de desarrollo y, con leaderboard real, permiten falsear la puntuación. Además el cartel de pausa lo pinta `PlayerShell`, no el canvas.
- **No:** portar el atajo `p` / `Escape` de pausa. Pausar es responsabilidad del shell.
- **No:** corregir la física de rebote de bloques, que invierte siempre `vy` aunque el golpe sea lateral. Es un defecto del original y el port es fiel; arreglarlo cambia la dificultad.

---

## Riesgos

| Riesgo                                                                                                                  | Mitigación                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El motor arranca antes de que el spritesheet cargue y el primer frame sale en negro o falla                             | `start()` espera a la promesa de `loadSpritesheet()` antes del primer `requestAnimationFrame`, y `drawSprite` no dibuja nada sin imagen.                      |
| El componente se desmonta mientras la promesa del spritesheet sigue pendiente y el motor arranca sobre un canvas muerto | El motor guarda una bandera de destruido; `destroy()` la activa y la continuación de la promesa no arranca el bucle si está activa.                           |
| El navegador bloquea `play()` sin interacción previa y la promesa rechazada llena la consola de errores                 | Cada `play()` va con `.catch(() => {})`. Criterio de aceptación explícito: sin sonido el juego sigue igual y la consola queda limpia.                         |
| `cloneNode().play()` en cada golpe crea muchos elementos `Audio` y come memoria en partidas largas                      | Los clones no se guardan en ninguna referencia y el recolector los libera al terminar la reproducción. Es el comportamiento del original.                     |
| El `mousemove` usa `getBoundingClientRect` y el canvas está escalado por CSS y por `devicePixelRatio`                   | La conversión a coordenadas del mundo se hace con `W / rect.width`, no con `canvas.width`, que ya lleva el `devicePixelRatio` multiplicado.                   |
| El original no topa `dt`, así que una pestaña oculta acumula un salto enorme y la pelota atraviesa la paleta            | `resume()` pone `lastTime = null` (primer `dt` de 0) y la pausa automática por `visibilitychange` y `blur` evita que se acumule tiempo con la pestaña oculta. |
| `arkanoid` y `bloque-buster` conviven describiendo el mismo juego y confunden al jugador                                | Textos de catálogo distintos: `bloque-buster` habla de muros de neón, `arkanoid` menciona los cinco niveles y los sprites. Unificarlas es tema de otra spec.  |
| Los assets binarios en `public/` se sirven sin revisión y engordan el repositorio                                       | Son tres archivos que ya están versionados en `references/started-games/04-arkanoid/`; se copian tal cual, sin añadir formatos nuevos.                        |

---

## Lo que **no** entra en esta spec

- Tocar `bloque-buster`: ni renombrarla, ni borrarla, ni portarla.
- Portar los otros juegos simulados del catálogo.
- Botones de salto de nivel, conmutador de silencio y pantalla completa.
- Cambios en `PlayerShell`, en `/api/scores`, en la RLS o en el esquema de `scores`.
- Rebalancear el juego: velocidades, puntos por bloque, vidas y niveles son los del original, defectos de física incluidos.
- Portada `cover-arkanoid` propia.
- Tests automatizados.

Cada una de ellas, si llega, va en su propia spec.
