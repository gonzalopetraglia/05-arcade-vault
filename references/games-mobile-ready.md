# Juegos listos para móvil

Registro del agente `mobile-porter`. Una fila por juego que cumple el layout táctil de
la SPEC 10 (`specs/10-mando-tactil-movil.md`): mando común con `gamepad` en su player,
sin controles táctiles propios, verificado en vertical y horizontal y sin cambios en
escritorio. Un juego implementado que no aparece aquí todavía no está portado a móvil.

El agente solo añade o actualiza la fila del juego que se le pidió en esa invocación.

| ID | Título | Cruceta | A | B | Motor | Verificado | Fecha | Notas |
|----|--------|---------|---|---|-------|------------|-------|-------|
| `asteroides` | ASTEROIDES | ◀ ▶ girar, ▲ propulsar | DISPARO | — | intacto | Playwright 390×844 · 844×390 + Android | 2026-10-04 | Portado en la SPEC 10. |
| `tetris` | TETRIS | ◀ ▶ mover, ▼ bajar, ▲ rotar | CAÍDA | ROTAR | intacto | Playwright 390×844 · 844×390 + Android | 2026-10-04 | Portado en la SPEC 10. Sin skins: el menú de pausa no muestra selector. |
| `arkanoid` | ARKANOID | ◀ ▶ mover | — | — | `held` | Playwright 390×844 · 844×390 + Android | 2026-10-04 | Portado en la SPEC 10. |
| `snake` | SNAKE | las cuatro, girar | — | — | `held` | Playwright 390×844 · 844×390 + Android | 2026-10-04 | Portado en la SPEC 10. |
