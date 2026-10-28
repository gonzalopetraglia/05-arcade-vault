# Checklist de rendimiento de un juego

Reglas que la SPEC 13 aplicó a CROAC y que cada juego siguiente (ASTEROIDES, TETRIS,
ARKANOID, SNAKE) debe cumplir en su propia spec. Cada regla trae cómo verificarla. Las
cifras de cada juego van a `references/games-performance.md`: una fila "antes" medida
antes de tocar nada y una "después".

## Medir

Instrumento dev-only en `lib/perf.ts`: con `npm run dev` y `?perf=1` en la URL,
`window.__avPerf` acumula `renders` por id de `<Profiler>` (`shell`, `hud`, `screen`,
`gamepad`, montados por `PlayerShell`) y `frames` (duración de cada frame, con un rAF
propio, independiente del motor). `reset()` lo pone a cero. Sin `?perf=1` o en
producción no existe y no se monta ningún `<Profiler>`.

Guion (MCP de Playwright, `browser_run_code_unsafe`):

1. Pestaña nueva y la anterior en `about:blank`: la emulación táctil de otra sesión
   CDP sobrevive al `clearDeviceMetricsOverride`, y un juego corriendo en otra pestaña
   compite por la GPU.
2. `localStorage`: `av_theme = "dark"`, `av_skin:<id> = "neon"` (si tiene skins).
3. **Móvil:** CDP `Emulation.setDeviceMetricsOverride` 390×844, `deviceScaleFactor` 3,
   `mobile: true`; `Emulation.setTouchEmulationEnabled`; comprobar
   `matchMedia("(pointer: coarse)").matches`. Cargar `/jugar/<id>?perf=1`,
   `Emulation.setCPUThrottlingRate` 4, pulsar `.tap-to-start`.
   **Escritorio:** 1280×800 sin emulación ni throttling.
4. `__avPerf.reset()` y 20 s de juego con una entrada fija (CROAC: ▲ cada 400 ms, con
   `PointerEvent` `pointerType: "touch"` sobre `.pad-btn.up` en móvil y `KeyboardEvent`
   en `window` en escritorio). Si aparece el modal, JUGAR DE NUEVO y seguir, contando
   los fines de partida. Contar también los cambios del HUD (`.player-hud .hud-stat .v`).
5. Tres ejecuciones, mediana. Anotar renders por id, p50, p95 y % de frames > 33 ms.

Límite conocido: en un equipo de escritorio rápido el p50 es el intervalo de refresco
de la pantalla incluso con CPU 4×, y el frame time apenas se mueve. Renders, tamaño del
búfer y alocaciones sí reflejan los cambios; el frame time real hay que verlo en un
móvil.

## React

### 1. `useState` solo si se pinta

En el player, `useState` solo para lo que cambia lo que se ve: `paused` (PAUSA/REANUDAR
y cartel) y `finalScore` (modal). El motor, flags internos y la copia "última" de un
estado que un callback necesita leer van en `useRef` (`pausedRef`).

- **Verificar:** el player no tiene `useState` para score, lives ni level. Con
  `?perf=1`, durante la partida `renders.shell`, `renders.screen` y `renders.gamepad`
  valen como mucho 2 × fines de partida.

### 2. HUD por `hudRef`

El player pasa `hudRef` a `PlayerShell` y en `onState` llama a
`hudRef.current?.set({ score, lives, level })`. El shell lo reparte a las dos instancias
de `HudStats` (cabecera y menú de pausa táctil), que son `memo` con estado propio, y
descarta los avisos con los mismos tres números (los motores también emiten al cambiar
solo su `status`). `finalScore` alimenta el modal y el guardado. Sin `hudRef`, el shell
sigue aceptando `score`/`lives`/`level` por props.

- **Verificar:** `renders.hud` > 0 y ≤ cambios de puntuación, vidas o nivel. El menú de
  pausa muestra lo mismo que la cabecera. El modal muestra la puntuación final y
  GUARDAR PUNTUACIÓN la envía.

### 3. Props estables

Ningún callback que llegue a `PlayerShell`, `TouchGamepad` o al canvas cambia de
identidad durante la partida: `useCallback` sin dependencias que cambien (leer `paused`
por ref, no por closure) y el objeto `gamepad` con `useMemo(() => ({ setKey }), [setKey])`,
nunca `gamepad={{ setKey }}` en el JSX.

- **Verificar:** `renders.screen` y `renders.gamepad` = 0 con `?perf=1`. Revisar las
  dependencias de cada `useCallback` del player.

### 4. React Compiler

Activado en `next.config.ts` (`reactCompiler: true`). Los memo y callbacks estables a
mano se mantienen igual: el Compiler se salta en silencio lo que no puede compilar. Si
un componente se rompe con él, `"use no memo"` en ese componente y anotarlo aquí.

- **Verificar:** `npm run build` y `npm run lint` sin errores; las rutas del juego sin
  errores en consola.

## Canvas

### 5. Tope de dpr

`dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)` con `MAX_DPR = 2` en el canvas
del juego. En un móvil con dpr 3 son 2,25× menos píxeles por frame y a ojo no se
distingue.

- **Verificar:** con dpr 3 emulado, `canvas.width` es `W × 2`.

### 6. Contexto opaco

`canvas.getContext("2d", { alpha: false })` cuando el fondo del juego cubre siempre
todo el canvas. Pedirlo así en el componente canvas antes que el motor; el motor recibe
el mismo contexto.

- **Verificar:** `canvas.getContext("2d").getContextAttributes().alpha === false`.

### 7. Fondo cacheado

Lo que no cambia de un frame a otro se pinta una vez en un canvas offscreen a la
resolución del búfer y el motor lo copia con un `drawImage` por frame. Se rehace solo
cuando cambia lo que contiene (en CROAC: `initGame`, ocupar nenúfar, ronda nueva,
`setPalette`).

- **Verificar:** el cambio que rehace el fondo se ve en el frame siguiente; cambiar de
  skin o tema en partida, en pausa y en fin de partida aplica los colores sin reiniciar.

### 8. Glow en sprites

Nada de `shadowBlur` en el bucle: es la operación más cara del canvas 2D. Cada pieza
con glow se pinta una vez por paleta en un sprite offscreen con margen
`ceil(1,5 × glowBlur) + 2` (la gaussiana se ve hasta ~3 sigma = 1,5 × blur) y se copia
con `drawImage`. Mismo camino para las skins sin glow. Una pieza con variantes (sentido,
largo, estado) tiene un sprite por variante. Escalar un sprite (el salto de la rana)
desde el centro de su caja. Lo que no lleva glow puede seguir trazándose en el bucle.

- **Verificar:** `grep -n "shadowBlur\|setGlow"` solo encuentra las funciones de pintado
  de sprites. Comparar píxel a píxel el primer frame en cada skin y tema contra la
  versión sin sprites (CROAC: diferencia máxima 19/255, 0,001 % de píxeles > 8): una
  diferencia grande en los bordes es halo recortado.

### 9. Bucle sin alocaciones

En `update`, `draw` y todo lo que llamen: `for` con índice en lugar de
`forEach`/`some`/`find` con closures; funciones que devuelven posiciones escriben en un
objeto reutilizado (`frogPos(frog, out)`); tablas precalculadas en lugar de
`findIndex` (`LANE_INDEX_BY_ROW`) y medidas fijas calculadas una vez (`LOOPS`), no con
`map`/`reduce`/spread por frame. Lo que ocurre por evento (ocupar un nenúfar, ronda
nueva) puede alocar.

- **Verificar:** CDP `HeapProfiler.startSampling` con
  `includeObjectsCollectedByMajorGC` e `includeObjectsCollectedByMinorGC` en `true`
  (sin ellos solo cuenta lo que sigue vivo y la basura de corta vida no aparece),
  5 s de juego sin entrada, y agrupar `selfSize` por función. No debe aparecer nada del
  motor más allá del dibujo.
- **Límite conocido:** queda ~1 KB/frame atribuido a las funciones de dibujo
  (`drawLane`, `drawSprite`), probablemente V8 empaquetando los doubles que se pasan a
  `drawImage`/`arc` (no verificado). Se acepta. Quitarlo exigiría dibujar en
  coordenadas enteras de píxel del dispositivo. CROAC: 3068 KB en 5 s antes, 539 KB
  después.
