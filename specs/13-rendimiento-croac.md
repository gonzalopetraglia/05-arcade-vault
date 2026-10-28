# SPEC 13 — Rendimiento de CROAC (React y canvas), patrón para los demás juegos

> **Estado:** Aprobado
> **Depende de:** SPEC 10, SPEC 12
> **Fecha:** 2026-10-28
> **Objetivo:** Quitar a CROAC los re-renders de React que no cambian nada en pantalla y el trabajo de canvas que se repite en cada frame, medirlo antes y después con un instrumento reutilizable, y dejar las reglas en una checklist que se pueda aplicar después a cada uno de los otros juegos.

---

## Por qué existe esta spec

En móvil CROAC da tirones. No hay medición todavía: esta spec empieza midiendo y termina midiendo.

Lo que se ve en el código hoy:

- **React.** El motor ya deduplica `onState` (solo avisa si cambia `score`, `lives`, `level` o `status`). Pero el estado del HUD vive en `CroacPlayer`. Cada punto re-renderiza el player, y con él `PlayerShell` entero, `TouchGamepad` y `CroacCanvas`.
- **Props inestables.** `gamepad={{ setKey }}` es un objeto nuevo en cada render. `onTogglePause` depende de `paused` y cambia de identidad al pausar, así que los efectos de `PlayerShell` que lo usan (`touch && !started`, giro de pantalla) se desuscriben y se vuelven a suscribir.
- **Canvas.** `drawWorld` repinta cada frame un fondo que solo cambia al ocupar un nenúfar o cambiar de skin. La skin NEON pone `shadowBlur` en cada pieza, cada frame, que es la operación más cara del canvas 2D. El búfer es `800×600×devicePixelRatio` sin tope: en un móvil con dpr 3 son 2400×1800 píxeles por frame. El bucle aloca en cada frame (`forEach` con closures, `frogPos` devuelve un objeto nuevo, `laneAt` usa `findIndex`).

CROAC es el primero. La spec deja las reglas en `references/performance-checklist.md` y el resultado en `references/games-performance.md`, para repetirla después en ASTEROIDES, TETRIS, ARKANOID y SNAKE, cada uno en su spec.

---

## Alcance

**Dentro:**

- **Instrumento de medición** dev-only: `lib/perf.ts` y un `<Profiler>` de React en `PlayerShell`, activos solo en desarrollo y con `?perf=1` en la URL. Acumula renders por componente y tiempos de frame en `window.__avPerf`.
- **Baseline** de CROAC medido con el MCP de Playwright antes de tocar nada, y la misma medición al final.
- **React Compiler** activado en `next.config.ts` (`reactCompiler: true`) con `babel-plugin-react-compiler` como devDependency. Afecta a toda la app.
- **`PlayerShell`**, cambios compatibles con los 5 juegos:
  - el HUD (jugador, puntuación, vidas, nivel) y las estadísticas del menú de pausa pasan a un subcomponente `HudStats` memoizado, con su propio estado;
  - nueva prop opcional `hudRef` por la que el player empuja los valores al HUD sin re-renderizarse;
  - `score`, `lives` y `level` siguen existiendo como props para los juegos que aún no usan `hudRef`;
  - nueva prop opcional `finalScore` para el modal de fin de partida;
  - efectos que dependen de `onTogglePause` dejan de re-suscribirse cuando cambia su identidad.
- **`CroacPlayer`**: aplica la regla "state solo si se pinta"; HUD por `hudRef`; callbacks estables; objeto `gamepad` estable.
- **`CroacCanvas`**: tope de dpr a 2; contexto `{ alpha: false }`.
- **Motor de CROAC** (`lib/games/croac/`):
  - capa de fondo cacheada en un canvas offscreen, rehecha solo al cambiar nenúfares ocupados o paleta;
  - glow NEON pre-renderizado en sprites offscreen (`lib/games/croac/sprites.ts`), rehechos solo al cambiar de paleta; ningún `shadowBlur` dentro del bucle;
  - bucle sin alocaciones por frame.
- **Documentación del patrón:** `references/performance-checklist.md` (reglas) y `references/games-performance.md` (registro con cifras antes/después).
- `CLAUDE.md`: una línea en _Games_ que apunte a la checklist y al registro, y una línea en _Stack notes_ sobre React Compiler.

**Fuera de alcance (para specs futuras):**

- Aplicar la parte propia de cada juego (player, canvas, motor) a ASTEROIDES, TETRIS, ARKANOID y SNAKE. Cada uno en su spec, siguiendo la checklist. Sí ganan lo que cambia en `PlayerShell` y el Compiler.
- Un subagente `perf-tuner` que aplique la checklist a un juego por llamada.
- `experimental.turbopackRustReactCompiler`. Es experimental; se usa el Compiler estable vía Babel.
- Mover el motor a un Web Worker u `OffscreenCanvas` transferido.
- Cambios de jugabilidad, de velocidades o de reglas de CROAC.
- Reducir o quitar el glow en móvil. NEON se ve igual en todos los dispositivos.
- Tests automatizados en el repo (Playwright como dependencia, CI). La medición se hace con el MCP de Playwright.
- Optimizar rutas que no sean `/jugar/croac`.

---

## Modelo de datos

### Regla de estado (contrato para todos los juegos)

- `useState` **solo** para valores que cambian lo que se pinta: valores del HUD (dentro de `HudStats`), `paused` (etiqueta PAUSA/REANUDAR y cartel), `finalScore` (modal).
- `useRef` para todo lo demás: el motor, flags internos, y la copia "última" de un estado que un callback necesita leer sin cambiar de identidad (`pausedRef`).
- Ningún callback que se pase a `PlayerShell`, `TouchGamepad` o al canvas cambia de identidad durante la partida.

### Medición — `lib/perf.ts`

```ts
export type PerfSample = {
  /** Renders por id de <Profiler>: "shell", "hud", "screen", "gamepad". */
  renders: Record<string, number>;
  /** Duración de cada frame en ms, medida con un rAF propio (no el del motor). */
  frames: number[];
};

declare global {
  interface Window {
    __avPerf?: PerfSample & { reset(): void };
  }
}

/** true solo con NODE_ENV !== "production" y ?perf=1 en la URL. */
export function perfEnabled(): boolean;
```

- `PlayerShell` envuelve con `<Profiler id=…>` el shell, `HudStats`, la pantalla (`children`) y `TouchGamepad` solo si `perfEnabled()`. Si no, no monta ningún `<Profiler>`.
- El muestreo de frames es un `requestAnimationFrame` propio de `lib/perf.ts`, independiente del motor, así sirve igual para los cinco juegos.
- En producción `perfEnabled()` devuelve `false` y `window.__avPerf` no existe.

### HUD por ref — `components/player-shell.tsx`

```ts
export type HudValues = { score: number; lives: number; level: number };

/** Lo que el player recibe en `hudRef.current` para empujar valores al HUD. */
export type HudHandle = { set(v: HudValues): void };

type Props = {
  // …props actuales…
  /** Si llega, el HUD se alimenta por aquí y se ignoran score/lives/level. */
  hudRef?: RefObject<HudHandle | null>;
  /** Puntuación del modal de fin de partida; si falta, se usa `score`. */
  finalScore?: number;
};
```

- `score`, `lives` y `level` pasan a ser opcionales en el tipo. Los juegos que no usan `hudRef` los siguen pasando y se ven igual que hoy.
- `HudStats` es `memo`, tiene su propio `useState<HudValues>` y se registra en `hudRef`. Se usa dos veces: en `.player-hud` y en el menú de pausa táctil. Las dos instancias reciben los mismos valores.
- `save()` del modal usa `finalScore ?? score`.

### Sprites y capa de fondo — `lib/games/croac/sprites.ts`

```ts
/** Canvas offscreen con un dibujo ya hecho, glow incluido, y su origen. */
export type Sprite = { canvas: HTMLCanvasElement; ox: number; oy: number };

/** Uno por combinación pieza/color/tamaño/estado que se pinte con glow. */
export type SpriteSet = {
  frog: Sprite;
  car: Sprite;
  carAlt: Sprite;
  truck: Record<1 | -1, Sprite>; // la cabina va hacia la marcha
  log: Record<number, Sprite>; // por `len`
  leaf: Record<"float" | "warn", Sprite>;
  lily: Sprite;
};

export function buildSprites(palette: CroacPalette, dpr: number): SpriteSet;
export function buildBackground(
  occupied: readonly boolean[],
  palette: CroacPalette,
  dpr: number,
): HTMLCanvasElement;
```

- El margen de cada sprite (`ox`, `oy`) cubre `glowBlur` para que el halo no se recorte.
- Los sprites se hacen a la resolución real (`dpr` ya topado) para que no se vean borrosos.
- Con `glowBlur === 0` (CLÁSICO, RETRO) los sprites también se usan: mismo camino para las tres skins.
- El motor guarda `sprites` y `background` en campos privados. `setPalette` rehace los dos; ocupar un nenúfar o empezar ronda rehace solo `background`.

### Constantes nuevas

- `MAX_DPR = 2` en `components/games/croac-canvas.tsx`.

---

## Plan de implementación

1. **Instrumento.** Crear `lib/perf.ts` (`perfEnabled`, muestreo de frames, `window.__avPerf` con `reset()`). Envolver en `PlayerShell` el shell, la pantalla y el mando con `<Profiler>` solo si `perfEnabled()`. Comprobar: `/jugar/croac?perf=1` en dev rellena `window.__avPerf`; sin `?perf=1` no existe.
2. **Baseline.** Con el MCP de Playwright, en `npm run dev`: viewport 390×844, touch emulado por CDP, `Emulation.setCPUThrottlingRate` 4, skin NEON, tema oscuro. Tocar para empezar, `reset()`, 20 s de juego con saltos hacia arriba cada 400 ms; si aparece el modal de fin de partida, pulsar JUGAR DE NUEVO y seguir (saltando a ciegas la partida acaba a los ~3,5 s, y sin reiniciar se mediría el modal con el motor parado). Contar los fines de partida. Leer `window.__avPerf`. Repetir con 1280×800 sin throttling. Anotar renders por id, p50, p95 y % de frames > 33 ms en `references/games-performance.md` como fila "antes".
3. **React Compiler.** `npm install -D babel-plugin-react-compiler` y `reactCompiler: true` en `next.config.ts`. `npm run build` pasa. Repetir la medición del paso 2 y anotarla como "con Compiler".
4. **`HudStats` y `hudRef` en `PlayerShell`.** Extraer `HudStats` memo con estado propio, alimentado por `hudRef` o, si falta, por las props `score`/`lives`/`level`. Añadir `finalScore`. Comprobar que los otros 4 juegos se ven y puntúan igual sin tocarlos.
5. **Efectos estables en `PlayerShell`.** Los efectos de "esperar primer toque" y "giro de pantalla" leen `onTogglePause` por ref (como `cbs` en `CroacCanvas`), no como dependencia. El comportamiento táctil de SPEC 10 no cambia.
6. **`CroacPlayer` con la regla de estado.** Quitar el `useState` del HUD; `onState` llama a `hudRef.current?.set(...)`. `over` pasa a `finalScore: number | null` (estado, lo pinta el modal). `pausedRef` espejo de `paused` para que `onTogglePause` sea estable. `gamepad` en un objeto estable (ref o `useMemo` sin dependencias variables). Comprobar con `?perf=1`: sumar puntos no re-renderiza `shell`, `screen` ni `gamepad`.
7. **`CroacCanvas`.** `dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)`; `getContext("2d", { alpha: false })`. Pasar `dpr` al motor para los sprites.
8. **Capa de fondo.** `buildBackground` en `sprites.ts` con lo que hoy pinta `drawWorld`. El motor la pinta con un `drawImage` por frame y la rehace al ocupar nenúfar, al empezar ronda, en `initGame` y en `setPalette`.
9. **Sprites con glow.** `buildSprites` en `sprites.ts`. `drawLane`, `drawFrog` y los nenúfares pintan con `drawImage` del sprite. El salto escala el sprite de la rana con `drawImage` (sin redibujar). Las hojas hundidas no se pintan, como hoy. `setGlow` desaparece del bucle; solo se usa dentro de `buildSprites`.
10. **Bucle sin alocaciones.** `for` en lugar de `forEach` en `update` y `draw`; `frogPos` escribe en un objeto reutilizado; índice fila→carril precalculado en lugar de `findIndex`. Comprobar con DevTools → Memory → Allocation sampling que el bucle no aloca por frame.
11. **Medición final.** Repetir el paso 2 exacto y anotar la fila "después".
12. **Patrón documentado.** Escribir `references/performance-checklist.md` (la regla de estado, props estables, `hudRef`, tope de dpr, `alpha: false`, fondo cacheado, glow en sprites, bucle sin alocaciones, cómo medir) y completar la fila `croac` de `references/games-performance.md`. Añadir las dos líneas de `CLAUDE.md`.

---

## Criterios de aceptación

**Medición:**

- [ ] `/jugar/croac?perf=1` en `npm run dev` expone `window.__avPerf` con `renders` y `frames`.
- [ ] Sin `?perf=1`, y en `npm run build && npm run start` con o sin él, `window.__avPerf` es `undefined` y no hay ningún `<Profiler>` montado.
- [ ] `references/games-performance.md` tiene las filas "antes", "con Compiler" y "después" de `croac` con renders por id, p50, p95 y % de frames > 33 ms.

**Rendimiento (390×844, touch, CPU 4×, NEON, oscuro, 20 s):**

- [ ] p95 de frame time ≤ 20 ms.
- [ ] Frames > 33 ms < 2 %.
- [ ] p95 "después" no es peor que p95 "antes".
- [ ] Durante los 20 s, `renders.shell`, `renders.screen` y `renders.gamepad` valen como mucho 2 × número de fines de partida (abrir y cerrar el modal; tras el `reset()` posterior al primer toque). Ningún render por puntuación, vidas o nivel.
- [ ] `renders.hud` es > 0 y ≤ número de cambios de puntuación, vidas o nivel en esos 20 s.

**Código:**

- [ ] `croac-player.tsx` no tiene `useState` para score, lives ni level.
- [ ] `onTogglePause`, `onEnd`, `onRestart`, `setKey` y el objeto `gamepad` de `CroacPlayer` mantienen la misma identidad durante toda la partida.
- [ ] No hay `shadowBlur` ni `setGlow` en ninguna función que se llame desde `loop` del motor.
- [ ] `canvas.width` es `800 × min(dpr, 2)`.
- [ ] `next.config.ts` tiene `reactCompiler: true` y `babel-plugin-react-compiler` está en `devDependencies`.

**Sin regresiones:**

- [ ] CROAC se ve igual a ojo en las tres skins y los dos temas, en 390×844, 844×390 y 1280×800.
- [ ] Cambiar skin o tema con la partida en curso, en pausa o en fin de partida aplica los colores sin reiniciar.
- [ ] El halo NEON no se ve recortado en ninguna pieza.
- [ ] Ocupar un nenúfar lo pinta ocupado en el siguiente frame; empezar ronda los vacía.
- [ ] ASTEROIDES, TETRIS, ARKANOID y SNAKE muestran puntuación, vidas y nivel igual que antes y guardan puntuación.
- [ ] El modal de fin de partida de CROAC muestra la puntuación final correcta y `GUARDAR PUNTUACIÓN` la envía.
- [ ] TOCA PARA EMPEZAR, pausa al girar, menú de pausa con estadísticas y pantalla completa funcionan como en SPEC 10.
- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] No hay errores en consola en `/`, `/games`, `/games/croac`, `/jugar/croac` y `/salon`.

**Patrón:**

- [ ] `references/performance-checklist.md` existe y cada regla tiene cómo verificarla.
- [ ] `CLAUDE.md` menciona la checklist, el registro y React Compiler.

---

## Decisiones

- **Sí:** medir antes de tocar. El síntoma es "tirones en móvil" sin cifras; sin baseline no se sabe qué cambio sirvió.
- **Sí:** instrumento commiteado y dev-only con `?perf=1`. Los otros cuatro juegos se medirán igual; reinstrumentar cada vez sería repetir trabajo.
- **No:** instrumento temporal sin commitear. Mismo motivo.
- **Sí:** React y canvas en la misma spec. Los tirones en móvil pueden venir de cualquiera de las dos capas.
- **Sí:** regla "state solo si se pinta". `paused` y `finalScore` se pintan y cambian pocas veces; el resto va en ref.
- **No:** `paused` en ref con la etiqueta cambiada a mano. Rompe el modelo declarativo por un render que ocurre solo al pulsar PAUSA.
- **Sí:** HUD con estado propio en `HudStats` memo, alimentado por `hudRef`. Si el estado viviera en el player, cada punto re-renderizaría el player y con él el shell, el mando y el canvas, aunque `HudStats` fuera memo.
- **No:** HUD escrito con `textContent` imperativo. Cero renders, pero el shell deja de ser declarativo para todos los juegos.
- **No:** store externo con `useSyncExternalStore` para el HUD. Funciona igual que `hudRef` con más piezas; `hudRef` basta para un solo productor.
- **Sí:** cambios de `PlayerShell` compatibles. `score`/`lives`/`level` siguen funcionando, así los otros cuatro juegos no se tocan en esta spec.
- **Sí:** React Compiler (`reactCompiler: true`, Babel estable). Decisión del usuario. Se mide aparte (fila "con Compiler") para saber qué aporta frente a los cambios manuales.
- **No:** `turbopackRustReactCompiler`. Experimental en Next 16.
- **Sí:** memo y callbacks estables a mano aunque haya Compiler. El Compiler se salta en silencio los componentes que no puede compilar; los cambios manuales no dependen de eso.
- **Sí:** tope de dpr a 2. A ojo no se distingue 2 de 3 en un canvas de 800×600 escalado, y son 2,25× menos píxeles por frame.
- **Sí:** glow pre-renderizado en sprites. Mismo aspecto, sin `shadowBlur` por frame.
- **No:** quitar o reducir el glow en móvil. NEON tiene que verse igual en todos los dispositivos.
- **No:** píxel a píxel idéntico. El escalado de sprites puede variar algún píxel en los bordes; se acepta.
- **Sí:** `alpha: false`. El fondo es opaco siempre; el navegador se ahorra componer transparencia.
- **Sí:** checklist en `references/` más registro, como `games-with-skins.md`. Cada juego siguiente es una spec corta que apunta a la checklist.
- **No:** subagente `perf-tuner` ahora. Se valora cuando la checklist haya funcionado en un segundo juego.
- **Sí:** medición con el MCP de Playwright, sin añadir Playwright al `package.json`. Es lo que ya usa `mobile-porter`.

---

## Riesgos

| Riesgo                                                                                  | Mitigación                                                                                                                                                                            |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Compiler cambia el comportamiento de algún componente que muta durante el render. | `npm run build`, `npm run lint` y recorrido sin errores por todas las rutas listadas. Si un componente falla, se excluye con la directiva `"use no memo"` y se anota en la checklist. |
| El Compiler se salta un componente en silencio y no aporta nada.                        | Medición separada "con Compiler". Los cambios manuales no dependen de él.                                                                                                             |
| `PlayerShell` rompe a los otros cuatro juegos.                                          | `hudRef` y `finalScore` opcionales; criterio de aceptación explícito para los cuatro.                                                                                                 |
| El halo NEON se recorta en el borde del sprite.                                         | Margen del sprite ≥ `glowBlur`; criterio visual explícito.                                                                                                                            |
| La capa de fondo no se rehace y un nenúfar ocupado no aparece.                          | Rehacer en los cuatro puntos listados (nenúfar, ronda, `initGame`, `setPalette`); criterio explícito.                                                                                 |
| Las cifras con throttling varían entre ejecuciones.                                     | Mismo guion exacto (viewport, throttling, skin, tema, 20 s, saltos cada 400 ms); se anota la mediana de 3 ejecuciones.                                                                |
| El objetivo p95 ≤ 20 ms no se alcanza solo con estos cambios.                           | Se registra la cifra real; si no se cumple, la spec no se marca `Implementado` y lo que falte va a otra spec (Worker, `OffscreenCanvas`).                                             |

---

## Lo que **no** entra en esta spec

- La parte propia (player, canvas, motor) de ASTEROIDES, TETRIS, ARKANOID y SNAKE.
- El subagente `perf-tuner`.
- El Compiler experimental en Rust.
- Web Worker u `OffscreenCanvas` transferido.
- Glow reducido en móvil.
- Cambios de jugabilidad.
- Playwright como dependencia del repo o tests en CI.

Cada una, si llega, va en su propia spec.
