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
  sobrevive al `clearDeviceMetricsOverride`), sin throttling, mismo guion.
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

Notas:

- **antes:** cada cambio de HUD y cada apertura o cierre del modal re-renderiza el shell,
  la pantalla y el mando (42 ≈ 31 + 2 × 5). El búfer del canvas
  en móvil es 2400 px de ancho (dpr 3, sin tope). En este equipo el CPU 4× no produce
  frames > 33 ms: la máquina de medición es mucho más rápida que un móvil real, así que
  las cifras sirven para comparar fases, no como valor absoluto del móvil.
