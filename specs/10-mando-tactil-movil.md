# SPEC 10 — Mando táctil y layout móvil para los juegos

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Fecha:** 2026-10-04
> **Objetivo:** En dispositivos táctiles (`pointer: coarse`), los cuatro juegos reales se juegan con la pantalla arriba y un mando común debajo (cruceta + A + B), sin HUD, con pausa, pantalla completa y arranque por toque, sin cambiar nada en escritorio.

---

## Por qué existe esta spec

Las SPEC 05, 07, 08 y 09 ya dieron controles táctiles a cada juego, pero probados en un Android real (Chrome, 412 px de ancho) fallan como experiencia de juego:

- **Los botones tapan el juego.** Cada `<name>-canvas.tsx` pinta sus `.touch-pad` en posición absoluta _dentro_ de la pantalla 4:3 del CRT. A 412 px de ancho esa pantalla mide unos 300×225 px y los botones ocupan casi un tercio.
- **Cada juego tiene un mando distinto.** Asteroides pone ⟲ ⟳ / PROPULSAR DISPARAR, Tetris cinco botones, Snake reparte la cruceta en dos pads. El jugador reaprende el mando en cada juego.
- **El HUD se come media pantalla.** En vertical, `.player-hud` se apila en tres filas (stats, skin, PAUSA/FIN/SALIR) antes de que aparezca el CRT.
- **El juego arranca sin que lo veas.** El motor llama a `start()` al montar; en móvil se pierde una vida mientras se hace scroll hasta el canvas.
- **La página se mueve.** Doble toque hace zoom y arrastrar fuera de un botón hace scroll o pull-to-refresh.

La solución es un layout táctil único en `PlayerShell` y un mando único en `components/touch-gamepad.tsx`. Los motores no cambian: el mando emite los mismos códigos de tecla que ya entienden.

---

## Alcance

**Dentro:**

- Hook `lib/use-coarse-pointer.ts`: dice si el puntero principal es grueso (`matchMedia("(pointer: coarse)")`), escuchando cambios.
- Componente cliente `components/touch-gamepad.tsx`: cruceta de cuatro direcciones y dos botones de acción A y B, igual para todos los juegos.
- `components/player-shell.tsx`, solo bajo `pointer: coarse`:
  - el player ocupa todo el viewport (`position: fixed; inset: 0; height: 100dvh`), por encima de la navegación del sitio;
  - el HUD `.player-hud` y la tira `.crt-bottom` no se muestran;
  - pantalla del juego arriba, mando abajo en vertical; pantalla en el centro y mando partido a los lados en horizontal;
  - dos iconos superpuestos en la esquina superior derecha de la pantalla: pausa (⏸) y pantalla completa (⛶);
  - cartel "TOCA PARA EMPEZAR" antes de la primera partida;
  - menú de pausa con puntuación, vidas, nivel, REANUDAR, FIN, SALIR y el selector de skin si el juego tiene skins;
  - pausa automática al cambiar de orientación;
  - bloqueo de zoom, scroll, pull-to-refresh y selección de texto mientras el player está montado.
- Nueva prop opcional `gamepad` en `PlayerShell`, que pasan los cuatro players reales con sus etiquetas.
- Retirar `TouchButton` y los `.touch-pad` de `asteroids-canvas.tsx`, `tetris-canvas.tsx`, `arkanoid-canvas.tsx` y `snake-canvas.tsx`.
- `app/globals.css`: retirar `.touch-pad` y `.touch-btn`; añadir los estilos del layout táctil y del mando, en los dos temas.

**Fuera de alcance (para specs futuras):**

- Cualquier cambio visible en escritorio o con ratón (`pointer: fine`). El layout actual se queda exactamente igual.
- El player simulado `components/game-player.tsx` de los juegos que aún son mock.
- Gestos (deslizar, tocar el canvas para mover). Solo botones.
- Vibración (`navigator.vibrate`).
- Más de dos botones de acción, o botones remapeables por el usuario.
- Cambios en los motores `lib/games/*/engine.ts` o en sus códigos de tecla.
- Bloquear la orientación con `screen.orientation.lock()`.
- Gamepads físicos (Gamepad API).
- La IP de `allowedDevOrigins` en `next.config.ts`; es configuración local de desarrollo.
- Tests automatizados.

---

## Modelo de datos

### Configuración del mando — `components/touch-gamepad.tsx`

```ts
/** Lo que un player le dice al mando. Las teclas son fijas; solo cambian las etiquetas. */
export type GamepadConfig = {
  /** Misma firma que `engine.setKey`: el dedo entra por la puerta de la tecla. */
  setKey: (code: string, down: boolean) => void;
  /** Etiqueta del botón A (emite "Space"). Sin etiqueta, A se ve atenuado y no emite. */
  a?: string;
  /** Etiqueta del botón B (emite "KeyX"). Sin etiqueta, B se ve atenuado y no emite. */
  b?: string;
};
```

Códigos fijos que emite el mando:

| Control | Código       |
| ------- | ------------ |
| ▲       | `ArrowUp`    |
| ▼       | `ArrowDown`  |
| ◀       | `ArrowLeft`  |
| ▶       | `ArrowRight` |
| A       | `Space`      |
| B       | `KeyX`       |

### Etiquetas por juego

| Juego        | Cruceta                     | A         | B       |
| ------------ | --------------------------- | --------- | ------- |
| `asteroides` | ◀ ▶ girar, ▲ propulsar      | `DISPARO` | —       |
| `tetris`     | ◀ ▶ mover, ▼ bajar, ▲ rotar | `CAÍDA`   | `ROTAR` |
| `arkanoid`   | ◀ ▶ mover                   | —         | —       |
| `snake`      | las cuatro, girar           | —         | —       |

Todos esos códigos ya los lee el motor correspondiente (`Space` y `KeyX` en Tetris, `Space` y `ArrowUp` en Asteroides).

### Props nuevas de `PlayerShell`

```ts
type Props = {
  // ...las de hoy, sin cambios
  /** Mando táctil. Si falta, el layout táctil no se activa y el juego se ve como hoy. */
  gamepad?: GamepadConfig;
};
```

### Estado local nuevo de `PlayerShell`

```ts
const coarse = useCoarsePointer(); // false en servidor y en el primer render
const [started, setStarted] = useState(false); // solo cuenta con coarse === true
const [fullscreen, setFullscreen] = useState(false); // refleja document.fullscreenElement
```

Nada se persiste. No hay claves nuevas en `localStorage`.

---

## Plan de implementación

1. **Hook.** Crear `lib/use-coarse-pointer.ts`. Devuelve `false` hasta montar, luego el valor de `matchMedia("(pointer: coarse)")`, y se actualiza con su evento `change`. Comprobación: en DevTools con emulación táctil el valor cambia sin recargar.
2. **Mando.** Crear `components/touch-gamepad.tsx` con la cruceta y A/B según la tabla del modelo de datos. Cada botón usa `onPointerDown` → `setKey(code, true)` con `setPointerCapture`, y `pointerup`/`pointercancel`/`pointerleave` → `setKey(code, false)`, igual que el `TouchButton` actual. Botón sin etiqueta: clase `is-off`, `aria-disabled`, no emite. Etiquetas accesibles (`aria-label`) en los seis controles. Aún no se monta en ningún sitio.
3. **CSS del mando.** En `app/globals.css`, bloque `/* ===== mando táctil ===== */`: carcasa, cruceta en cruz, A y B redondos en diagonal, estado `:active`, `.is-off`. Usa los tokens neón (`--cyan`, `--magenta`, `--yellow`) y `--font-pixel`; se define para tema oscuro y claro. Botones de al menos 56×56 px.
4. **Layout táctil en el shell.** `PlayerShell` acepta `gamepad`. Si `gamepad` existe, añade la clase `has-gamepad` a `.av-player` y renderiza `<TouchGamepad>` después del `.crt`. Todo el layout va en CSS bajo `@media (pointer: coarse)` sobre `.av-player.has-gamepad`: viewport fijo, HUD y `.crt-bottom` ocultos, CRT sin padding decorativo, mando visible (fuera de ese media query el mando tiene `display: none`). Comprobación: escritorio idéntico; en emulación táctil se ve la pantalla arriba y el mando abajo, aunque todavía con los pads viejos encima.
5. **Orientación horizontal.** Bajo `@media (pointer: coarse) and (orientation: landscape)`: la pantalla toma el alto disponible manteniendo 4:3, centrada; la cruceta va a la izquierda y A/B a la derecha. El mando se parte en dos grupos con `display: contents` o dos contenedores; la decisión se toma al implementar y se deja comentada.
6. **Bloqueo de página.** Con `coarse && gamepad`, el shell pone la clase `av-touch-lock` en `<html>` al montar y la quita al desmontar. CSS: `overflow: hidden; overscroll-behavior: none` en `html.av-touch-lock` y `body`; `touch-action: none` y `user-select: none` en `.av-player.has-gamepad` salvo el `<input>` del modal de guardado.
7. **Iconos de pausa y pantalla completa.** Dentro de `.crt-screen`, solo con `coarse`, dos botones en la esquina superior derecha con `z-index` sobre el canvas. Pausa llama a `onTogglePause`. Pantalla completa llama a `requestFullscreen()` sobre `.av-player` o `exitFullscreen()`; se escucha `fullscreenchange` para el estado; el icono no se renderiza si `document.fullscreenEnabled` es falso (iPhone).
8. **Menú de pausa táctil.** Con `coarse`, el cartel "EN PAUSA" pasa a ser un menú: puntuación, vidas y nivel con el formato del HUD; botones REANUDAR (`onTogglePause`), FIN (`onEnd`), SALIR (enlace a `/games/[id]`); y `SkinSelector` si llegan `skin` y `onSkinChange`. En escritorio el cartel sigue como hoy.
9. **Toca para empezar.** Con `coarse && gamepad && !started`, el shell llama una vez a `onTogglePause()` tras montar para dejar el motor en pausa y muestra el cartel "TOCA PARA EMPEZAR" en lugar del menú de pausa. Un toque en el cartel pone `started = true` y llama a `onTogglePause()`. JUGAR DE NUEVO no vuelve a pedir el toque.
10. **Pausa al girar.** Con `coarse`, el shell escucha `matchMedia("(orientation: portrait)")` `change` y, si el juego está en marcha (`!paused && !over && started`), llama a `onTogglePause()`. La pausa por `visibilitychange`/`blur` que ya hacen los canvas no cambia.
11. **Players.** Pasar `gamepad` en los cuatro players con `setKey: (code, down) => engineRef.current?.setKey(code, down)` (estable con `useCallback`) y las etiquetas de la tabla.
12. **Retirar los pads viejos.** Borrar `TouchButton`, los dos `.touch-pad` y su `setKey` local de los cuatro `*-canvas.tsx`, y `.touch-pad`/`.touch-btn` de `globals.css`. `touchAction: "none"` en el `<canvas>` se queda.
13. **Verificación.** Playwright emulando un móvil táctil a 390×844 y 844×390 en los cuatro juegos, con captura de cada uno; después, prueba manual en el Android por la LAN.

---

## Criterios de aceptación

**Escritorio (`pointer: fine`):**

- [ ] `/jugar/asteroides`, `/jugar/tetris`, `/jugar/arkanoid` y `/jugar/snake` se ven igual que antes de esta spec: HUD completo, CRT con `.crt-bottom`, sin mando, sin iconos en la pantalla.
- [ ] Los juegos arrancan al montar, sin cartel "TOCA PARA EMPEZAR".
- [ ] El teclado sigue funcionando igual en los cuatro juegos.

**Táctil, vertical (390×844):**

- [ ] No hay HUD (`.player-hud`) ni `.crt-bottom` visibles.
- [ ] La pantalla del juego ocupa el ancho y está arriba; el mando (cruceta + A + B) está debajo y no se solapa con la pantalla.
- [ ] Ningún botón del mando está dentro de `.crt-screen`.
- [ ] La página no hace scroll vertical ni horizontal; la navegación del sitio no se ve.
- [ ] El mando es el mismo en los cuatro juegos; solo cambian las etiquetas de A/B según la tabla.
- [ ] En Arkanoid y Snake, A y B se ven atenuados y pulsarlos no cambia nada en el juego.
- [ ] Asteroides: ◀ ▶ giran, ▲ propulsa, A dispara.
- [ ] Tetris: ◀ ▶ mueven, ▼ baja, ▲ rota, A hace caída dura, B rota.
- [ ] Arkanoid: ◀ ▶ mueven la paleta.
- [ ] Snake: las cuatro direcciones giran la serpiente.
- [ ] Mantener pulsado un botón y arrastrar el dedo fuera lo suelta (la tecla no se queda pegada).

**Táctil, horizontal (844×390):**

- [ ] La pantalla mantiene 4:3, cabe entera en el alto y no hay scroll.
- [ ] La cruceta está a la izquierda de la pantalla y A/B a la derecha.

**Táctil, comportamiento:**

- [ ] Al entrar en `/jugar/<id>` se ve "TOCA PARA EMPEZAR" y la puntuación no cambia hasta tocarlo.
- [ ] Tras tocarlo el juego corre; JUGAR DE NUEVO tras el fin no vuelve a mostrar el cartel.
- [ ] El icono ⏸ pausa y muestra el menú con puntuación, vidas, nivel, REANUDAR, FIN y SALIR.
- [ ] En los juegos con skins (hoy Asteroides, Arkanoid y Snake), el menú de pausa muestra el selector de skin y cambiarla repinta el juego sin reiniciarlo.
- [ ] En Tetris, que no tiene skins, el menú de pausa no muestra selector.
- [ ] FIN abre el modal de fin de partida y se puede guardar la puntuación escribiendo el nombre con el teclado del móvil.
- [ ] SALIR lleva a `/games/<id>` y la página vuelve a hacer scroll normal (`av-touch-lock` retirada de `<html>`).
- [ ] Girar el dispositivo durante la partida la pausa.
- [ ] En Android Chrome, ⛶ entra y sale de pantalla completa; en un navegador sin `document.fullscreenEnabled` el icono no aparece.
- [ ] Doble toque sobre el mando o la pantalla no hace zoom.
- [ ] Funciona en tema claro y oscuro: el mando es legible en los dos.

**General:**

- [ ] `TouchButton`, `.touch-pad` y `.touch-btn` ya no existen en el código (`grep` vacío).
- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] La consola no muestra errores ni avisos de hidratación en `/jugar/<id>` con emulación táctil.

---

## Decisiones

- **Sí:** un único mando en el shell para los cuatro juegos. El usuario lo pidió así y elimina cuatro implementaciones casi idénticas de `TouchButton`.
- **No:** pads superpuestos sobre el canvas, como hoy. Tapan el juego en pantallas de ~360–412 px.
- **No:** gestos. Van bien en Snake y Arkanoid y mal en Asteroides y Tetris; un mando uniforme gana a cuatro esquemas distintos.
- **Sí:** cruceta + dos botones. La mayoría de los arcades necesitan dos acciones como mucho.
- **Sí:** teclas fijas (A = `Space`, B = `KeyX`) con etiqueta por juego. Los motores no se tocan y ya entienden esos códigos. Un botón que el juego no usa se ve atenuado para que el mando sea siempre el mismo.
- **No:** mapa de teclas por juego. Más flexible, pero innecesario con los cuatro juegos actuales.
- **Sí:** detección por `pointer: coarse`. Es el criterio que ya usaban los pads; tablets incluidas.
- **No:** `pointer: coarse` + ancho máximo. Dejaría a las tablets con el layout de escritorio y sin mando.
- **Sí:** el layout se decide en CSS (`@media (pointer: coarse)`) y el comportamiento con `useCoarsePointer`. El CSS evita que el primer render del servidor muestre el HUD y luego salte; el hook solo activa lógica (arranque, pausa al girar, iconos).
- **Sí:** HUD oculto por completo en táctil. La puntuación, las vidas y el nivel se ven en el menú de pausa y en el modal final.
- **No:** barra compacta ni HUD dentro del mando. Pedido explícito: pantalla arriba, mando abajo, nada más.
- **Sí:** el player ocupa todo el viewport y tapa la navegación del sitio. Es la consecuencia directa de "pantalla arriba, mando abajo" sin HUD; SALIR en el menú de pausa es la vuelta.
- **Sí:** pausa y pantalla completa como iconos en la esquina de la pantalla. Elección del usuario frente a START/SELECT en el mando.
- **Sí:** "TOCA PARA EMPEZAR" solo en táctil. En escritorio todo se queda igual, como pidió el usuario.
- **Sí:** el arranque en espera se hace pausando el motor con `onTogglePause()`, sin tocar `start()`. No cambia el contrato de los motores ni de los canvas.
- **Sí:** pantalla completa con la Fullscreen API sobre `.av-player`, oculta donde no existe. iOS Safari no la soporta fuera de `<video>`.
- **No:** `screen.orientation.lock()`. Solo funciona en pantalla completa y en Android; vertical y horizontal tienen layout propio.
- **No:** vibración. No funciona en iOS y no se pidió.
- **No:** el player simulado `GamePlayer`. Solo los cuatro juegos reales.

---

## Riesgos

| Riesgo                                                                       | Mitigación                                                                                                                                                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `100vh` en móvil incluye la barra del navegador y corta el mando             | Usar `100dvh`.                                                                                                                                                           |
| El shell pausa en su efecto y el motor ya pintó un frame                     | Los efectos del padre corren tras los del hijo, así que la pausa llega antes del primer `requestAnimationFrame` útil. Si no, se ve un frame quieto, sin pérdida de vida. |
| `av-touch-lock` se queda en `<html>` si el componente falla                  | Se retira en el cleanup del efecto; SALIR es un `<Link>` que desmonta el shell.                                                                                          |
| `touch-action: none` en todo el player impide escribir el nombre en el modal | El `<input>` del modal y el propio modal quedan fuera de esa regla.                                                                                                      |
| El teclado virtual al guardar puntuación encoge el viewport fijo             | El modal ya es `position: fixed`; se comprueba en el móvil real en el paso 13.                                                                                           |
| `pointer: coarse` en portátiles táctiles con ratón                           | `matchMedia` mira el puntero principal; un portátil con ratón reporta `fine`.                                                                                            |

---

## Lo que **no** entra en esta spec

- Cambios en escritorio.
- El player simulado de los juegos mock.
- Gestos, vibración, gamepads físicos, botones remapeables.
- Cambios en los motores.
- Bloqueo de orientación.
- `allowedDevOrigins` en `next.config.ts`.
- Tests automatizados.

Cada uno de esos, si llega, va en su propia spec.
