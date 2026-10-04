# Juegos con skins

Registro del agente `skin-designer`. Una fila por juego que ya tiene sus tres skins
(`clasico` por defecto, `neon`, `retro`), cada una con paleta `light` y `dark`, y el
selector de skin activo en su player. Un juego que no aparece aquí todavía no tiene skins.

El agente solo añade o actualiza la fila del juego que se le pidió en esa invocación.

| ID | Título | Skins | Paleta | Selector | Sprites | Fecha | Notas |
|----|--------|-------|--------|----------|---------|-------|-------|
| `asteroides` | ASTEROIDES | clasico · neon · retro | `lib/games/asteroids/skins.ts` | OK | n/a | 2026-10-04 | Nave/roca <1.5:1 en clasico (mismo blanco, como el original), neon.light 1.20 y retro.dark 1.23: se distinguen por silueta y tono; neon.light power-up/roca 1.03, por rombo + rótulo 3x. |
| `snake` | SNAKE | clasico · neon · retro | `lib/games/snake/skins.ts` | OK | intactos | 2026-10-04 | clasico.dark conserva el original: cabeza/cuerpo 1.17:1 (se distinguen por brillo) y rejilla 1.10:1; clasico.light cuerpo 4.43:1. |
| `arkanoid` | ARKANOID | clasico · neon · retro | `lib/games/arkanoid/skins.ts` | OK | intactos en clasico; neon/retro pintan formas planas en las mismas cajas | 2026-10-04 | clasico conserva el spritesheet: en dark ladrillo gris 2.06 y magenta 2.66 de tono medio (original), en light lo recorta el contorno negro del sprite (17.9); retro con 4 tonos al límite (3.10/3.11). |
