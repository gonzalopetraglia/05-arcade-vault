# Rendimiento de los juegos

Registro de las mediciones de rendimiento por juego. Las reglas que se aplican están en
`references/performance-checklist.md`; aquí solo van las cifras. Un juego que no aparece
aquí todavía no se ha medido.

## Cómo se mide

Con el MCP de Playwright, contra `npm run dev`, en `/jugar/<id>?perf=1` (instrumento de
`lib/perf.ts`). Skin NEON y tema oscuro.

- **Móvil:** 390×844, `deviceScaleFactor` 3, touch emulado por CDP
  (`Emulation.setTouchEmulationEnabled`), `Emulation.setCPUThrottlingRate` 4. Tocar para
  empezar, `window.__avPerf.reset()`, 20 s de juego.
- **Escritorio:** 1280×800 en una pestaña nueva (la emulación táctil de otra sesión CDP
  sobrevive al `clearDeviceMetricsOverride`) y con la pestaña vieja en `about:blank` (si
  sigue corriendo un juego compite por la GPU), sin throttling, mismo guion.
- **Guion de juego:** salto hacia arriba cada 400 ms (botón ▲ del mando en móvil,
  `ArrowUp` en escritorio). Si aparece el modal de fin de partida, JUGAR DE NUEVO y seguir.
- Tres ejecuciones; se anota la mediana. `p50`/`p95` son de la duración de frame en ms;
  `>33 ms` es el % de frames por encima de 33 ms.
- `renders` cuenta los commits por id de `<Profiler>` tras el `reset()`. `hud` vale `—`
  mientras el HUD no tenga Profiler propio. `fines` son los fines de partida en los 20 s;
  `Δ HUD` los cambios de puntuación, vidas o nivel vistos en pantalla.

## CROAC (`croac`)

| Fase | Entorno | shell | screen | gamepad | hud | p50 | p95 | >33 ms | fines | Δ HUD | Fecha |
|------|---------|-------|--------|---------|-----|-----|-----|--------|-------|-------|-------|
| antes | móvil | 42 | 42 | 42 | — | 8.4 | 16.8 | 0 % | 5 | 31 | 2026-10-28 |
| antes | escritorio | 42 | 42 | 42 | — | 9.2 | 17.0 | 0 % | 5 | 31 | 2026-10-28 |
| con Compiler | móvil | 31 | 0 | 0 | — | 8.4 | 16.8 | 0 % | 5 | 31 | 2026-10-28 |
| con Compiler | escritorio | 31 | 0 | 0 | — | 8.4 | 16.8 | 0 % | 5 | 31 | 2026-10-28 |
| después | móvil | 10 | 0 | 0 | 31 | 8.5 | 17.1 | 0 % | 5 | 31 | 2026-10-28 |
| después | escritorio | 10 | 0 | 0 | 31 | 8.4 | 17.3 | 0 % | 5 | 31 | 2026-10-28 |

Notas:

- **antes:** cada cambio de HUD re-renderiza el shell, la pantalla y el mando, y hay 11
  commits más (42 frente a 31 cambios de HUD) que el Compiler elimina. El búfer del
  canvas en móvil es 2400 px de ancho (dpr 3, sin tope). En este equipo el CPU 4× no produce
  frames > 33 ms: la máquina de medición es mucho más rápida que un móvil real, así que
  las cifras sirven para comparar fases, no como valor absoluto del móvil.
- **con Compiler:** `screen` y `gamepad` bajan a 0: el Compiler memoiza el JSX del canvas
  y del mando, y sus props ya no cambian de identidad. `shell` queda en 31, igual que
  Δ HUD: el HUD aún vive en el shell. Abrir y cerrar el modal no suma aparte porque cae
  en el mismo commit que un cambio de HUD (vidas a 0, reinicio a 0 puntos). Los tiempos
  de frame no cambian. La fila "antes" de escritorio se midió con la pestaña
  vieja esperando en TOCA PARA EMPEZAR, no en `about:blank`; su p50 de 9.2 puede deberse
  a eso.
- **después:** `shell` = 2 × fines (abrir y cerrar el modal) y `hud` = Δ HUD: un punto
  solo re-renderiza `HudStats`. `screen` y `gamepad` siguen en 0. El búfer en móvil
  baja de 2400 a 1600 px de ancho (dpr topado a 2), el fondo es una capa cacheada y el
  glow NEON sale de sprites, sin `shadowBlur` por frame. Alocaciones del bucle con la
  rana quieta (muestreo de heap por CDP, incluyendo lo recolectado, 5 s): 3068 KB con
  los sprites y sin el paso 10, 539 KB después (−82 %); el resto es V8 empaquetando los
  doubles que se pasan a `drawImage`/`arc` (ver la checklist).
- Los tiempos de frame no se mueven en ninguna fase: en este equipo el p50 es el
  intervalo de refresco de la pantalla (120 Hz, 8,3 ms) incluso con CPU 4×, así que el
  frame time no puede reflejar el ahorro. Las cifras que sí cambian son los renders, el
  tamaño del búfer y las alocaciones. Falta una pasada en un móvil real.
