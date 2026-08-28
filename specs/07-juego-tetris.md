# SPEC 07 — Tetris, el segundo juego real

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 05, SPEC 06
> **Fecha:** 2026-08-28
> **Objetivo:** Portar el juego de canvas de `references/started-games/03-tetris/` a un motor TypeScript integrado en la plataforma, jugable en `/jugar/tetris` con teclado o controles táctiles, con su entrada propia de catálogo y su puntuación guardada por el flujo que ya existe.

---

## Por qué existe esta spec

La SPEC 05 portó ASTEROIDES y dejó el patrón hecho: entidades y motor en `lib/games/<id>/`, canvas cliente en `components/games/<id>-canvas.tsx`, player montado sobre `components/player-shell.tsx`. La SPEC 06 conectó las puntuaciones a Supabase. Falta lo obvio: usar ese patrón una segunda vez. Esta spec porta el Tetris de `references/started-games/03-tetris/`.

El material de partida es distinto al de ASTEROIDES y eso condiciona el trabajo:

- **No hay clases.** `game.js` son 332 líneas de funciones sueltas sobre variables globales (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `lastTime`, `dropAccum`, `dropInterval`, `animId`). El port tiene que convertir ese estado global en campos de una instancia, no en un módulo con variables de módulo.
- **El HUD vive en el DOM.** `updateHUD()` escribe en `#score`, `#lines` y `#level`, y el overlay `#overlay` sirve a la vez de cartel de PAUSA y de GAME OVER. Todo eso lo cubre ya `PlayerShell`, así que desaparece del motor.
- **Hay dos canvas.** `#board` de 300×600 para el tablero y `#next-canvas` de 120×120 para la pieza siguiente. El motor de ASTEROIDES recibe un canvas; este recibe dos.
- **La entrada es por eventos, no por estado de tecla.** ASTEROIDES lee un mapa de teclas mantenidas (`keys`) en cada frame. En Tetris, mover, rotar y soltar son acciones puntuales que el original ejecuta dentro del propio `keydown`. La API estándar del motor es `setKey(code, down)`, así que el motor tiene que reconstruir los flancos y su propia repetición automática.
- **El tablero es vertical.** 300×600 es una relación 1:2, frente al 4:3 de ASTEROIDES. La pantalla del CRT tiene que alojarlo sin deformarlo.

El original también trae un conmutador de tema claro/oscuro con `localStorage` (`tetris-theme`). Eso es de su página suelta, no del juego: el Vault ya tiene su propio modo oscuro por `prefers-color-scheme` y ese conmutador no se porta.

---

## Alcance

**Dentro:**

- Port de `game.js` a TypeScript en `lib/games/tetris/`: `entities.ts` con constantes, piezas y las funciones puras del tablero, y `engine.ts` con la clase `TetrisEngine`.
- `components/games/tetris-canvas.tsx`: componente cliente que monta los dos `<canvas>`, instancia el motor, conecta teclado y controles táctiles y lo destruye al desmontar.
- `components/games/tetris-player.tsx`: el player del juego, montado sobre `components/player-shell.tsx`.
- Controles táctiles bajo `@media (pointer: coarse)`: izquierda, derecha, bajada suave, rotar y caída dura.
- Entrada nueva `tetris` en `GAMES` (`lib/games.ts`), la décima, con `cover-tetro`.
- Migración `supabase/migrations/0003_seed_tetris.sql` con `sort_order` 9, aplicada por el MCP de Supabase y commiteada.
- `app/jugar/[id]/page.tsx`: el `if (game.id === "asteroides")` pasa a ser un mapa `id → componente`, con `GamePlayer` como respaldo.
- Pausa automática al ocultar la pestaña o perder el foco.
- Pieza siguiente dibujada en su propio canvas, superpuesto en una esquina del área de juego.
- Contador de líneas dibujado dentro del canvas del tablero.

**Fuera de alcance (para futuras specs):**

- **Tocar la entrada `caida`.** Se queda en el catálogo con sus datos actuales y su simulacro, aunque describa este mismo juego. Renombrarla o borrarla rompería `/games/caida`, `/jugar/caida` y las puntuaciones ya guardadas con esa clave.
- **Portar los otros ocho juegos simulados.**
- **Cambiar el juego.** Ni velocidades, ni puntuación por línea, ni paleta, ni el conjunto de piezas: port fiel.
- **Sonido.** El original no tiene y aquí tampoco.
- **Conmutador de tema claro/oscuro y su `localStorage`.**
- **Portada nueva.** `tetris` reutiliza `cover-tetro`.
- **Etiquetas configurables en `PlayerShell`.** El shell no se toca.
- **Rutas de API nuevas, cambios en la RLS o en el esquema de `scores`.**
- **Auth real.** El nombre del jugador sale de la sesión y del campo del modal, como hasta ahora.
- **Modificar `references/started-games/`.**
- Tests automatizados.

---

## Modelo de datos

No hay nada nuevo persistido más allá de una fila en `public.games`. Las puntuaciones se guardan con el contrato de la SPEC 06 (`POST /api/scores`, cuerpo `{ game, score, name }`), con `game: "tetris"`.

**Entrada nueva en `GAMES` (`lib/games.ts`):**

```ts
{
  id: "tetris",
  title: "TETRIS",
  short: "Encaja tetrominós y una tuerca que no encaja en nada.",
  long: "El puzle de caída de toda la vida, con las siete piezas clásicas y una octava: una tuerca hueca que aparece con la misma frecuencia que las demás y que no rellena ninguna línea sola. Rota, encaja y limpia filas mientras la velocidad sube cada 10 líneas.",
  cat: "PUZZLE",
  cover: "cover-tetro",
  color: "magenta",
}
```

**Constantes del mundo (`lib/games/tetris/entities.ts`), copiadas literalmente del original:**

```ts
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const W = COLS * BLOCK; // 300
export const H = ROWS * BLOCK; // 600
export const NEXT_W = 120;
export const NEXT_H = 120;
export const NEXT_BLOCK = 30;
export const LINE_SCORES = [0, 100, 300, 500, 800];
export const COLORS: (string | null)[]; // 9 entradas, índice 0 nulo
export const PIECES: (number[][] | null)[]; // 9 entradas, índice 0 nulo
```

`COLORS` y `PIECES` van con los mismos valores del original, incluida la octava pieza `N` (tuerca, gris `#9e9e9e`, matriz 3×3 con el centro hueco). `randomPiece()` sigue siendo `Math.floor(Math.random() * 8) + 1`.

**Tablero y pieza:**

```ts
export type Board = number[][]; // ROWS × COLS, 0 = vacío, 1..8 = índice de color
export type Piece = { type: number; shape: number[][]; x: number; y: number };
```

**Estado que el motor emite al HUD de React:**

```ts
export type TetrisState = {
  score: number;
  lines: number;
  level: number;
  status: "playing" | "gameover";
};
```

No hay `"dead"`: en Tetris no hay vidas, se pasa de `"playing"` a `"gameover"` de una vez. `onState` se llama solo cuando algún campo cambia respecto al frame anterior.

**API pública del motor (`lib/games/tetris/engine.ts`):**

```ts
type EngineOptions = {
  onState: (s: TetrisState) => void;
  onGameOver: (finalScore: number) => void;
};

export class TetrisEngine {
  constructor(board: HTMLCanvasElement, next: HTMLCanvasElement, opts: EngineOptions);
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  forceGameOver(): void;
  setKey(code: string, down: boolean): void;
  destroy(): void;
}
```

Es la API estándar de `AsteroidsEngine` con una sola diferencia: el constructor recibe dos canvas.

**Repetición de teclas dentro del motor:**

```ts
const DAS_DELAY = 170; // ms hasta la primera repetición
const DAS_REPEAT = 50; // ms entre repeticiones
```

`ArrowLeft`, `ArrowRight` y `ArrowDown` repiten con esos tiempos mientras la tecla siga abajo. `ArrowUp`, `KeyX` y `Space` actúan solo en el flanco de bajada y no repiten.

---

## Plan de implementación

1. **`lib/games/tetris/entities.ts`.** Constantes (`COLS`, `ROWS`, `BLOCK`, `W`, `H`, `NEXT_*`, `LINE_SCORES`, `COLORS`, `PIECES`) y funciones puras traducidas literalmente: `createBoard()`, `randomPiece()`, `collide(board, shape, ox, oy)`, `rotateCW(shape)`, `ghostY(board, piece)`, `clearLines(board)` devolviendo el número de filas limpiadas. Ninguna toca el DOM ni el estado del motor.
2. **Dibujo en `entities.ts`.** `drawBlock(ctx, x, y, colorIndex, size, alpha?)` con el mismo realce blanco al 12 % del original, y `drawGrid(ctx)`. El original leía el color de la rejilla con `getComputedStyle(document.body).getPropertyValue('--grid-line')`; en el port es una constante literal del módulo, porque el motor no lee el DOM.
3. **`lib/games/tetris/engine.ts` — estado y bucle.** La clase con los campos que antes eran globales, el `requestAnimationFrame` guardando el id para cancelarlo en `pause()` y `destroy()`, `dropAccum` contra `dropInterval` (`Math.max(100, 1000 - (level - 1) * 90)`), `resume()` poniendo `lastTime = null` y `restart()` volviendo al estado de `init()`. Se elimina el atajo `KeyP` de pausa y el `restartBtn`: pausar y reiniciar son cosa de los botones del shell.
4. **`engine.ts` — entrada.** `setKey(code, down)` guarda el estado de la tecla y, en el flanco de bajada, encola la acción. El bucle consume la cola antes de aplicar la caída automática y gestiona la repetición `DAS_DELAY` / `DAS_REPEAT` para las tres teclas de movimiento. `tryRotate()` mantiene los kicks `[0, -1, 1, -2, 2]`; `softDrop()` suma 1 punto por fila; `hardDrop()` suma 2 por celda recorrida.
5. **`engine.ts` — dibujo y estado.** `draw()` pinta rejilla, tablero, fantasma al 20 % de alfa, pieza actual y el rótulo de líneas dentro del canvas del tablero. `drawNext()` pinta la pieza siguiente centrada en el canvas de 120×120. Tras cada frame, si `score`, `lines`, `level` o `status` cambiaron, se emite `onState`. `spawn()` que colisiona pasa `status` a `"gameover"` y llama a `onGameOver(score)`; `forceGameOver()` hace lo mismo a petición del botón FIN.
6. **`components/games/tetris-canvas.tsx`** con `"use client"`: dos `ref`, `useEffect` que crea el motor y devuelve `destroy()` en la limpieza, búferes multiplicados por `devicePixelRatio`, `preventDefault()` en `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Space` y `KeyX`, y pausa automática por `visibilitychange` y `blur`. El canvas del tablero se estira con `height: 100%` y `aspect-ratio: 1 / 2`; el de la pieza siguiente va superpuesto en una esquina del área de juego, con su rótulo.
7. **Controles táctiles.** `.touch-pad.left` con ←, → y ↓; `.touch-pad.right` con rotar y caída dura, reutilizando `.touch-btn` y `.touch-btn.rot` de `app/globals.css`. `pointerdown` / `pointerup` / `pointercancel` se traducen a `setKey("ArrowLeft" | "ArrowRight" | "ArrowDown" | "ArrowUp" | "Space", down)`, para que el motor no distinga dedo de tecla.
8. **`components/games/tetris-player.tsx`** sobre `PlayerShell`: HUD, marco CRT, botones PAUSA/FIN/SALIR y modal de fin de partida vienen del shell. Se le pasan `score` y `level` del motor y `lives={1}` fijo; las líneas no van al shell.
9. **Despacho en `app/jugar/[id]/page.tsx`.** El `if` se convierte en un mapa `Record<string, ComponentType<{ game: Game }>>` con `asteroides` y `tetris`, y `GamePlayer` como respaldo para los ocho simulados.
10. **Catálogo y seed.** Entrada `tetris` al final de `GAMES` y `supabase/migrations/0003_seed_tetris.sql` con `insert into public.games ... on conflict (id) do nothing` y `sort_order` 9. Se aplica con `apply_migration` y el `.sql` queda commiteado.
11. **Verificación.** `npm run lint`, `npm run build`, `curl localhost:3000/api/games`, una partida real guardada, `curl "localhost:3000/api/scores?game=tetris"`, y comprobar `/salon` y la tabla de `/games`.

No hay paso de portada: `cover-tetro` ya existe en `app/globals.css` y no se toca.

---

## Criterios de aceptación

- [x] `npm run lint` y `npm run build` terminan sin errores ni advertencias de hidratación.
- [x] `/games` muestra TETRIS con la portada `cover-tetro`, y `/games/tetris` sigue siendo estática.
- [x] `grep -rn "getElementById" lib components` no devuelve resultados: los dos canvas llegan por `ref`.
- [x] `grep -rn "getComputedStyle" lib/games` no devuelve resultados: el motor no lee estilos del DOM.
- [x] Salir de `/jugar/tetris` no deja ningún `requestAnimationFrame` corriendo; volver a entrar no acelera el juego.
- [x] Las ocho piezas (I, O, T, S, Z, J, L y la tuerca N) aparecen y se dibujan con los colores del original.
- [x] Limpiar 1, 2, 3 y 4 líneas suma exactamente 100, 300, 500 y 800 puntos multiplicados por el nivel.
- [x] La caída dura suma 2 puntos por celda recorrida y la bajada suave 1 por fila.
- [x] El nivel es `floor(lineas / 10) + 1` y el intervalo de caída es `max(100, 1000 - (nivel - 1) * 90)` milisegundos.
- [x] La rotación aplica los kicks `[0, -1, 1, -2, 2]` y no atraviesa las paredes ni los bloques fijos.
- [x] El fantasma se dibuja bajo la pieza actual, en su posición final, al 20 % de alfa.
- [x] El canvas de la pieza siguiente muestra siempre la pieza que va a entrar, y se actualiza al bloquear una pieza.
- [x] Mantener ← o → pulsados repite el movimiento tras 170 ms, cada 50 ms; mantener rotar o caída dura no repite.
- [x] Los botones táctiles producen exactamente el mismo efecto que sus teclas, incluida la repetición al mantener el dedo.
- [x] El HUD de React muestra los puntos y el nivel emitidos por el motor; las líneas se leen dentro del canvas.
- [x] El HUD de React muestra siempre una vida y esa cifra nunca cambia durante la partida.
- [x] PAUSA congela el juego entero y REANUDAR no salta ninguna pieza por el salto de tiempo; FIN abre el modal con la puntuación acumulada; JUGAR DE NUEVO deja el tablero vacío, la puntuación a 0, las líneas a 0 y el nivel a 1.
- [x] Una pieza que no cabe al aparecer termina la partida y abre el modal de fin.
- [x] Guardar en el modal inserta la puntuación en la base y aparece en `/salon` sin recargar a mano; si el `POST` falla, el modal muestra un error y no finge que se guardó.
- [x] Reejecutar `0003_seed_tetris.sql` no duplica ninguna fila.
- [x] `references/started-games/03-tetris/` no tiene ningún cambio.
- [x] `/jugar/asteroides`, `/jugar/caida` y `/jugar/serpentina` siguen funcionando igual que antes.

---

## Decisiones

- **Sí:** id nuevo `tetris`, entrada décima con `sort_order` 9. No rompe URLs ni puntuaciones existentes.
- **No:** reutilizar, renombrar o borrar `caida`. Renombrar rompe `/games/caida` y `/jugar/caida` y huérfana las puntuaciones guardadas con esa clave; borrar hace lo mismo. Coste aceptado: dos entradas del mismo género conviven en el catálogo.
- **Sí:** `cover-tetro`, PUZZLE y magenta. La portada ya existe y está pensada para este juego; cero CSS nuevo.
- **No:** portada `cover-tetris` propia. Ahorra CSS a cambio de que `tetris` y `caida` se vean iguales en la cuadrícula.
- **Sí:** `lives={1}` fijo en el HUD del shell y contador de líneas dibujado dentro del canvas. `PlayerShell` no se toca y los nueve players existentes no corren riesgo.
- **No:** añadir etiquetas configurables a `PlayerShell` para renombrar VIDAS a LÍNEAS. Se leería mejor, pero toca un componente compartido por todo el catálogo.
- **No:** pasar las líneas como `lives` al shell. Se verían como una hilera de corazones que crece sin parar.
- **Sí:** las ocho piezas del original, tuerca incluida. Port fiel: la tuerca es lo que distingue a este Tetris y sus puntuaciones son comparables con las del original.
- **Sí:** pieza siguiente en su propio canvas de 120×120, superpuesto en una esquina del área de juego. Es información de juego, no adorno, y así el mundo del tablero mantiene sus 300×600 exactos.
- **Sí:** repetición automática (`DAS`) dentro del motor, 170 ms de retardo y 50 ms entre repeticiones. El original se apoyaba en la repetición de teclas del navegador, que no existe en los botones táctiles ni sobrevive a la API `setKey`.
- **No:** portar el conmutador de tema claro/oscuro ni su clave `tetris-theme` de `localStorage`. El Vault ya resuelve el tema con `prefers-color-scheme`.
- **No:** portar el atajo `KeyP` de pausa ni el botón de reinicio del overlay. Pausar y reiniciar son responsabilidad del shell.
- **No:** sonido. El original no tiene.

---

## Riesgos

| Riesgo                                                                                                                     | Mitigación                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El tablero es 1:2 y la pantalla del CRT está pensada para 4:3, así que puede desbordar en vertical o dejar franjas enormes | El canvas se ajusta por altura (`height: 100%`, `aspect-ratio: 1 / 2`), no por anchura, y se centra en horizontal.                                            |
| La API `setKey` es de estado, pero mover y rotar son acciones puntuales; sin cuidado, mantener una tecla congela la pieza  | El motor detecta flancos y aplica su propio `DAS`. Criterio de aceptación explícito para la repetición al mantener.                                           |
| El original no topa `dt`, así que una pestaña oculta acumula un `dropAccum` gigante y suelta varias piezas al volver       | `resume()` pone `lastTime = null` (primer `dt` de 0) y la pausa automática por `visibilitychange` y `blur` evita que se acumule tiempo con la pestaña oculta. |
| El segundo canvas se olvida en la limpieza y queda dibujando tras salir de la ruta                                         | Un solo `useEffect` crea y destruye el motor, y el motor cancela su `requestAnimationFrame` en `destroy()`.                                                   |
| `tetris` y `caida` conviven describiendo el mismo juego y confunden al jugador                                             | Textos de catálogo distintos: `caida` habla de piezas geométricas, `tetris` menciona la tuerca. Unificarlas es tema de otra spec.                             |
| La tuerca `N` es 3×3 con el centro hueco y podría romper la rotación o el conteo de líneas                                 | `rotateCW` es genérico por dimensiones y `clearLines` mira celda a celda; criterio de aceptación explícito para que las ocho piezas aparezcan y roten.        |

---

## Lo que **no** entra en esta spec

- Tocar `caida`: ni renombrarla, ni borrarla, ni portarla.
- Portar los otros juegos simulados del catálogo.
- Sonido, tema claro/oscuro propio del juego y pantalla completa.
- Cambios en `PlayerShell`, en `/api/scores`, en la RLS o en el esquema de `scores`.
- Rebalancear el juego: velocidades, puntuación y piezas son las del original.
- Tests automatizados.

Cada una de ellas, si llega, va en su propia spec.
