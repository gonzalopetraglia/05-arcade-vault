---
name: add-game
description: Diseña la spec de un juego nuevo del Arcade Vault — port del motor, player, entrada de catálogo, migración de seed y leaderboard — partiendo de una carpeta de references/started-games/ o desde cero. Escribe la spec siguiendo el método de /spec; no implementa nada.
disable-model-invocation: true
argument-hint: '<carpeta de references/started-games/ o descripción del juego>'
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(wc:*)
---

# /add-game — Diseñador de specs de juegos del Arcade Vault

## Session context

- Fecha de hoy: !`date +%F`
- Specs existentes: !`ls specs/ 2>/dev/null || echo "(no hay carpeta specs/)"`
- Juegos de referencia: !`ls references/started-games/ 2>/dev/null || echo "(no hay carpeta references/started-games/)"`
- Migraciones existentes: !`ls supabase/migrations/ 2>/dev/null || echo "(no hay carpeta supabase/migrations/)"`

---

## Qué hace este comando

Convierte un juego —normalmente un `game.js` suelto de `references/started-games/`— en una **spec lista para implementar**: port del motor a TypeScript, player montado sobre el shell compartido, entrada de catálogo, migración de seed en Supabase y leaderboard real.

Este comando **solo escribe la spec**. La implementación la ejecuta después `/spec-impl`.

Tus respuestas deben estar en el mismo idioma que el prompt inicial.

## Flujo del comando

Cinco fases, en orden estricto. No adelantes ninguna.

---

### Fase 1 — Inventariar el material de partida

Si `$ARGUMENTS` nombra una carpeta de `references/started-games/` (o la describe de forma reconocible), léela entera y anota:

- Archivos y su tamaño en líneas.
- Id(s) y dimensiones de cada `<canvas>` del `index.html`.
- Forma del código: ¿clases o funciones sueltas? ¿un script o varios concatenados por orden de `<script>`?
- Estado global: qué variables, dónde se declaran.
- Bootstrap: ¿se ejecuta al final del archivo, o dentro de un callback de carga de assets?
- Bucle: `requestAnimationFrame`, cálculo de `dt`, si hay tope de `dt`.
- Puntuación: dónde se suma, dónde se pinta, si hay HUD en DOM además del canvas.
- Assets binarios (sprites, sonidos) y las rutas relativas con las que se cargan.
- Uso de `localStorage`, `postMessage` o cualquier salida fuera de la página.

Las tres referencias del repo tienen formas distintas y la spec debe reflejar la del juego concreto:

- `02-asteroids` — clases con `update`/`draw`, arranque a nivel de módulo, sin HUD en DOM. Ya portado; sirve de patrón.
- `03-tetris` — sin clases, HUD en DOM (`#score`, `#lines`, `#level`), dos canvas (`#board`, `#next-canvas`), `localStorage` solo para el tema.
- `04-arkanoid` — tres scripts globales concatenados, arranque asíncrono dentro de `loadSpritesheet(cb)`, spritesheet PNG y sonidos MP3 con rutas relativas.

Si no hay carpeta de referencia, el juego se diseña desde cero: sustituye este inventario por preguntas sobre la mecánica, y déjalo dicho en la spec.

Lee además, siempre:

- `lib/games.ts` — ids y orden del catálogo ya ocupados.
- `reference.md` de esta misma skill (`.claude/skills/add-game/reference.md`) — los contratos de la plataforma que la spec debe respetar.

**No modifiques nada de `references/started-games/`.** Es material de partida y se conserva intacto para poder comparar el port.

---

### Fase 2 — Cargar el método de `/spec` (obligatoria)

Antes de redactar una sola línea de la spec, lee la skill `spec`, que es la autoridad sobre el formato y el proceso:

1. `.claude/skills/spec/SKILL.md` — fases, reglas duras y, sobre todo, el procedimiento de guardado (numeración, slug, campo de fecha, estado inicial, `specs/.spec-config.yml`).
2. `.claude/skills/spec/template.md` — estructura sección por sección y reglas globales del documento.

Si esas rutas no resuelven (son symlinks), prueba con `.agents/skills/spec/SKILL.md` y `.agents/skills/spec/template.md`. Si tampoco existen, **dilo y detente**: no inventes el formato de la spec.

`add-game` no duplica el formato: aporta el contenido específico del Arcade Vault y delega en `/spec` la forma, el orden de las secciones, el nombre del archivo y las reglas de guardado. Si `/spec` cambia, esta skill hereda el cambio sin tocarse.

---

### Fase 3 — Preguntar lo que no se puede deducir

Usa `AskUserQuestion`, agrupando preguntas. Como mucho dos rondas.

**Lo que siempre hay que preguntar:**

- **Id y título.** El id es el slug de la URL (`/games/<id>`, `/jugar/<id>`) y la clave primaria en la tabla `games`; el título va en mayúsculas, como el resto del catálogo.
- **Categoría y color.** `ARCADE` | `PUZZLE` | `SHOOTER` | `VERSUS`, y `cyan` | `magenta` | `yellow` | `green`.
- **Portada.** Reutilizar una clase `cover-*` existente de `app/globals.css` o crear una nueva.
- **Controles táctiles.** Si sí, cuáles y qué tecla alimenta cada botón.
- **Sonido.** Dentro o fuera del alcance. Si el original lo tiene, hay que decidirlo explícitamente.
- **Port fiel o rebalanceo.** Por defecto, port fiel: mismos números, misma paleta, misma dificultad.
- **Entrada simulada equivalente.** Si el catálogo ya tiene una entrada que describe ese mismo juego (`caida` para tetris, `bloque-buster` para arkanoid), preguntar qué se hace con ella. Advierte de lo mismo que la SPEC 05: renombrar un id existente rompe URLs y las puntuaciones ya guardadas con esa clave; añadir una entrada nueva no rompe nada.

**Cómo preguntar:** una decisión por pregunta, con la opción recomendada primero y el motivo en la descripción. No preguntes lo que ya está decidido por la arquitectura (por ejemplo, cómo se guardan las puntuaciones: eso ya lo fija `POST /api/scores`).

---

### Fase 4 — Escribir la spec

Sigue la estructura y las reglas globales de `template.md`. Rellena las secciones con este contenido específico del Vault.

**Modelo de datos**

- Entrada nueva en `GAMES` (`lib/games.ts`), con el tipo `Game` tal cual está: sin `best` ni `plays` (esos vienen de la vista `game_stats` a través de `GET /api/games`).
- Tipo `<Juego>State` que el motor emite al HUD de React, con la forma de `AsteroidsState`.
- API pública del motor, calcada de `AsteroidsEngine` (`lib/games/asteroids/engine.ts`): `start()`, `pause()`, `resume()`, `restart()`, `forceGameOver()`, `setKey(code, down)`, `destroy()`, más los callbacks `onState` y `onGameOver`.

**Plan de implementación** — pasos fijos, en este orden:

1. Port de las entidades a `lib/games/<id>/entities.ts`: constantes del mundo (`W`, `H`) en el módulo, `draw(ctx)` recibe el contexto por parámetro, `update(dt, keys)` recibe el mapa de teclas. Traducción literal de números y fórmulas.
2. Port del motor a `lib/games/<id>/engine.ts` con la API de arriba: guarda el id de `requestAnimationFrame` para cancelarlo en `pause()` y `destroy()`, `resume()` pone `lastTime = null`, y se elimina cualquier reinicio por tecla —reiniciar es cosa del botón—.
3. `components/games/<id>-canvas.tsx` con `"use client"`: `ref` al `<canvas>`, `useEffect` que crea el motor y devuelve `destroy()` en la limpieza, búfer multiplicado por `devicePixelRatio`, `preventDefault()` en las teclas de juego, y pausa automática por `visibilitychange` y `blur`.
4. Controles táctiles, si los hay: reutilizar `.touch-pad` y `.touch-btn` de `app/globals.css`, traduciendo `pointerdown`/`pointerup`/`pointercancel` a `setKey`, para que el motor no distinga dedo de tecla.
5. `components/games/<id>-player.tsx` montado sobre `components/player-shell.tsx`: HUD, marco CRT, botones PAUSA/FIN/SALIR y modal de fin de partida ya vienen del shell y no se duplican. La puntuación, las vidas y el nivel salen del motor, nunca de un cálculo propio.
6. Despacho en `app/jugar/[id]/page.tsx`. Hoy es un `if (game.id === "asteroides")`; al aparecer el segundo juego real, ese `if` pasa a ser un mapa `id → componente` en el mismo archivo, con `GamePlayer` como respaldo para los juegos aún simulados.
7. Entrada en `GAMES` y **migración de seed** `supabase/migrations/000N_seed_<id>.sql`: `insert into public.games ... on conflict (id) do nothing`, con `sort_order` igual al siguiente libre. Se aplica con el MCP de Supabase (`apply_migration`) y el `.sql` queda commiteado.
8. Portada: reutilizar una clase `cover-*` o añadir la nueva junto a las que ya están en `app/globals.css`.
9. **Verificación:** `npm run lint`, `npm run build`, `curl localhost:3000/api/games` (el juego nuevo aparece con `best` y `plays` numéricos), jugar una partida real y guardarla, `curl "localhost:3000/api/scores?game=<id>"`, y comprobar que aparece en `/salon` y que `plays` sube en la tabla de `/games`.

**Alcance — fuera por defecto** (a menos que el usuario diga lo contrario en la fase 3):

- Auth real y puntuaciones atribuidas a un usuario verificado.
- Rutas de API nuevas: el leaderboard ya funciona con `GET`/`POST /api/scores`.
- Tocar la RLS o el esquema de `scores`.
- Modificar `references/started-games/`.
- Portar cualquier otro juego del catálogo.
- Tests automatizados.

**Criterios de aceptación** — además de los propios del juego (puntos por elemento, vidas, niveles), incluye siempre estos, parametrizados por `<id>`:

- `npm run lint` y `npm run build` terminan sin errores ni advertencias de hidratación.
- `/games` muestra el juego nuevo con su portada, y `/games/<id>` sigue siendo estática.
- `grep -rn "getElementById" lib components` no devuelve resultados: el canvas llega por `ref`.
- Salir de `/jugar/<id>` no deja ningún `requestAnimationFrame` corriendo; volver a entrar no acelera el juego.
- El HUD de React y el que dibuja el canvas coinciden en todo momento.
- PAUSA congela el juego entero y REANUDAR no mata a nadie por el salto de tiempo; FIN abre el modal con la puntuación acumulada; JUGAR DE NUEVO reinicia el estado inicial.
- Guardar en el modal inserta la puntuación en la base y aparece en `/salon` sin recargar a mano; si el `POST` falla, el modal muestra un error y no finge que se guardó.
- Reejecutar la migración de seed no duplica ninguna fila.
- `references/started-games/<carpeta>/` no tiene ningún cambio.
- `/jugar/asteroides` y `/jugar/serpentina` siguen funcionando igual que antes.

**Decisiones** y **Riesgos**: en el formato del template, recogiendo lo que se decidió en la fase 3 y lo que se descartó, con el motivo.

---

### Fase 5 — Guardar

Aplica el procedimiento de guardado de la fase 4 de `/spec` tal como lo has leído: siguiente número libre en `specs/`, fecha tomada del contexto de sesión, estado inicial `Borrador` (no aprobado), y `specs/.spec-config.yml` sembrado solo si falta.

El slug es `juego-<id>`, así que el archivo queda en `specs/NN-juego-<id>.md`.

Cierra confirmando la ruta del archivo, recordando que está en `Borrador`, y diciendo que el siguiente paso —una vez revisado y aprobado— es `/spec-impl NN-juego-<id>`. **Detente ahí.**

---

## Reglas duras

- **Nunca escribas código ni toques la aplicación.** El único archivo que crea este comando es la spec.
- **Nunca redactes la spec sin haber leído antes `spec/SKILL.md` y `spec/template.md`.** Manda `/spec` en formato y proceso; `add-game` solo aporta el contenido del Vault.
- **Nunca modifiques `references/started-games/`.**
- **Nunca propongas rutas de API nuevas para puntuaciones**, ni cambios en la RLS ni en el contrato de `/api/scores`.
- **El motor cumple la API estándar** (`start`/`pause`/`resume`/`restart`/`forceGameOver`/`setKey`/`destroy`), para que `PlayerShell` sirva sin cambios.
- **No marques la spec como aprobada.** Eso lo hace el usuario tras releerla.
- **No propongas implementar la spec después de guardarla.** Tu trabajo termina con la confirmación.

## Argumentos

`$ARGUMENTS` es la carpeta de referencia (`03-tetris`, `references/started-games/04-arkanoid`) o una descripción corta del juego a diseñar desde cero. Si viene vacío, empieza preguntando cuál de las carpetas de `references/started-games/` se va a portar, o si el juego es nuevo.
