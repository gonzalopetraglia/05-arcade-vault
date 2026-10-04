# SPEC 11 — Apariencia del mando táctil (Gamepad MK-II)

> **Estado:** Implementado
> **Depende de:** SPEC 10
> **Fecha:** 2026-10-04
> **Objetivo:** El mando táctil común de la SPEC 10 adopta el aspecto del diseño Gamepad MK-II de `references/gamepad-assets/` en tema oscuro, con una versión propia para tema claro, sin cambiar su comportamiento ni nada en escritorio.

---

## Por qué existe esta spec

La SPEC 10 resolvió el _qué_ del mando (cruceta + A + B, teclas fijas, layout táctil) con un estilo funcional: teclas planas con borde cian, A magenta y B amarillo sobre `--bg-2`. Ahora hay un diseño de referencia, el **Gamepad MK-II** (`references/gamepad-assets/gamepad.html` y la captura `gamepad-neon.png`): carcasa con degradado, doble borde y textura de puntos; teclas de cruceta en relieve con buje central y una gema que pulsa; A y B como botones esféricos con brillo interior y resplandor.

Esta spec solo cambia la piel del mando. El marcado gana dos elementos decorativos y el CSS del bloque `/* ===== mando táctil ===== */` se reescribe; códigos de tecla, eventos de puntero, `GamepadConfig`, layout táctil y motores quedan igual.

---

## Alcance

**Dentro:**

- `components/touch-gamepad.tsx`, solo marcado decorativo:
  - el buje central de la cruceta pasa de `::before` a un elemento real `.pad-hub` con una gema `.pad-hub-gem` dentro (`aria-hidden`);
  - cada botón de acción gana un anillo `.act-ring` (`aria-hidden`) que aparece al pulsar.
- `app/globals.css`, bloque `/* ===== mando táctil ===== */` reescrito según el diseño:
  - **carcasa** (`.touch-gamepad`): degradado vertical, borde exterior con `--line`, borde interior a 4px (`::before`), textura de puntos de 8px (`::after`), radio 22px, sombra exterior cian;
  - **cruceta**: teclas en relieve con degradado, canto inferior de 4px que se hunde al pulsar, triángulos `.pad-arrow` en tono apagado que se iluminan al pulsar; buje con gema romboidal que pulsa (`pulse-led`, 2s);
  - **A y B**: círculos con relleno radial (brillo arriba a la izquierda + color medio + color profundo), borde de 2px del color del botón, letra en `--font-pixel` blanca, canto inferior de 6px y resplandor exterior; al pulsar se hunden y aparece el anillo discontinuo;
  - **B pasa de amarillo a cian**; A sigue magenta;
  - la disposición de A y B pasa de diagonal a **horizontal**, B a la izquierda y A a la derecha, como en el diseño;
  - las etiquetas `.act-label` (DISPARO, CAÍDA, ROTAR) se conservan bajo cada botón, restyle en `--font-pixel` pequeño;
  - `.is-off` (botón sin uso) sigue atenuado, sin resplandor, sin anillo y sin hundirse.
- **Vertical:** la carcasa es un panel con margen dentro del área que el layout táctil deja bajo la pantalla, cruceta a la izquierda y A/B a la derecha.
- **Horizontal:** con el mando partido por `display: contents`, la cruceta y el grupo A/B llevan cada uno su **media carcasa** (mismo degradado, doble borde, textura y sombra), centrada en su lado del CRT.
- **Tema claro:** paleta propia de carcasa papel con botones en relieve (ver Modelo de datos).
- `@media (prefers-reduced-motion: reduce)`: la gema queda fija y sin pulso.
- `.claude/skills/add-game/reference.md`: añadir `.pad-hub` y `.act-ring` a la línea del mando táctil.

**Fuera de alcance (para specs futuras):**

- Cualquier cambio en escritorio o con `pointer: fine`. El mando sigue sin existir fuera de `@media (pointer: coarse)`.
- Mostrar el mando en escritorio o iluminarlo con el teclado (las clases `.on` del diseño y su `keydown`/`keyup`).
- Estados `:hover` del diseño: en táctil no existen.
- Cambios en `GamepadConfig`, en los códigos de tecla, en la lógica de `PadButton` (pointer down/move/up/cancel/leave) o en `PlayerShell`.
- Cambios en el layout táctil de la SPEC 10 (tamaño de la pantalla, iconos ⏸ ⛶, menú de pausa, TOCA PARA EMPEZAR, bloqueo de página).
- Skins para el mando (la SPEC de skins es por juego; el mando es común).
- Cambios en los motores, en los `*-canvas.tsx` o en los `*-player.tsx`.
- Copiar `gamepad.html` tal cual o su `<script>`: se usa como referencia visual, no como código.
- Tests automatizados.

---

## Modelo de datos

No hay datos nuevos ni persistencia. Lo nuevo son elementos decorativos en el marcado y tokens CSS locales al mando.

### Marcado — `components/touch-gamepad.tsx`

```tsx
<div className="touch-gamepad">
  <div className="gamepad-dpad">
    {/* cuatro PadButton .pad-btn.up/.left/.right/.down sin cambios */}
    <div className="pad-hub" aria-hidden>
      <span className="pad-hub-gem" />
    </div>
  </div>
  <div className="gamepad-actions">
    {/* PadButton .act-btn.b y .act-btn.a: añaden <span className="act-ring" aria-hidden /> */}
  </div>
</div>
```

Se mantienen todos los nombres de clase de la SPEC 10 (`.touch-gamepad`, `.gamepad-dpad`, `.gamepad-actions`, `.pad-btn`, `.pad-arrow`, `.act-btn`, `.act-key`, `.act-label`, `.is-off`): el agente `mobile-porter` y `add-game/reference.md` los usan.

### Tokens del mando — `app/globals.css`

Variables locales en `.touch-gamepad` (oscuro, valores del diseño) y redefinidas en `:root[data-theme="light"] .touch-gamepad`. Como en horizontal `.touch-gamepad` pasa a `display: contents`, sus hijos siguen heredando las variables.

| Token             | Oscuro (diseño MK-II)            | Claro                    | Uso                                     |
| ----------------- | -------------------------------- | ------------------------ | --------------------------------------- |
| `--gp-shell-top`  | `#1c1c28`                        | `--bg-2` (`#ebe7da`)     | degradado de la carcasa, arriba         |
| `--gp-shell-bot`  | `#0c0c14`                        | `--bg-3` (`#e0dbc9`)     | degradado de la carcasa, abajo          |
| `--gp-shell-glow` | `rgba(0, 245, 255, 0.4)`         | `rgba(20, 20, 31, 0.18)` | sombra exterior (en claro, sombra gris) |
| `--gp-dots`       | `rgba(255, 255, 255, 0.03)`      | `rgba(20, 20, 31, 0.05)` | textura de puntos                       |
| `--gp-key-top`    | `#1a1a25`                        | `#f7f4ec`                | degradado de tecla, arriba              |
| `--gp-key-bot`    | `#0a0a12`                        | `#e0dbc9`                | degradado de tecla, abajo               |
| `--gp-key-edge`   | `#050507`                        | `#b9b3a0`                | canto inferior de teclas y A/B          |
| `--gp-arrow`      | `--ink-dim` (`#8a8fb5`)          | `--ink-dim` (`#45496a`)  | triángulo en reposo                     |
| `--gp-lit`        | `--cyan` (`#00f5ff`)             | `--cyan` (`#006f7c`)     | triángulo pulsado, borde pulsado, gema  |
| `--gp-glow-on`    | resplandor cian (como el diseño) | `none`                   | resplandor de tecla/A/B pulsada         |
| `--act` (A)       | `--magenta` (`#ff006e`)          | `--magenta` (`#b8005a`)  | borde, relleno y canto de A             |
| `--act` (B)       | `--cyan` (`#00f5ff`)             | `--cyan` (`#006f7c`)     | borde, relleno y canto de B             |

Reglas de la versión clara:

- Carcasa papel con sombra gris suave, sin resplandor de color: en claro el glow ensucia en vez de iluminar.
- A y B conservan el relleno de color (versiones tintadas de tema claro de `--magenta`/`--cyan`) con letra blanca y sin `text-shadow`. Blanco sobre `#b8005a` y sobre `#006f7c` supera 4.5:1.
- Tecla pulsada: fondo teñido de `--cyan` claro y triángulo `--cyan`, sin resplandor.
- La gema pulsa igual, en `--cyan` claro, sin `box-shadow` luminoso.
- Contraste: triángulos en reposo y bordes de botón ≥ 3:1 contra la tecla/carcasa; `.act-label` ≥ 4.5:1 contra la carcasa.

### Medidas

El diseño usa teclas de 50px (46px en su versión móvil); la SPEC 10 exige un mínimo de 56×56 px. Manda el mínimo y el resto se escala en proporción:

| Elemento         | Diseño     | Esta spec                              |
| ---------------- | ---------- | -------------------------------------- |
| Tecla de cruceta | 50×50, r10 | 56×56, r11                             |
| Cruz completa    | 156×156    | 3 × 56 + 2 × 3 de separación ≈ 174×174 |
| Buje             | 50×50, r6  | 56×56, r7                              |
| Gema             | 12×12      | 13×13                                  |
| A / B            | 74×74      | 72×72 (64×64 si el ancho < 380px)      |
| Separación A–B   | 22px       | 22px (16px si el ancho < 380px)        |
| Radio carcasa    | 22px       | 22px (16px si el ancho < 380px)        |

---

## Plan de implementación

1. **Marcado.** En `components/touch-gamepad.tsx`, añadir `.pad-hub` con `.pad-hub-gem` como último hijo de `.gamepad-dpad`, y `<span className="act-ring" aria-hidden />` dentro de cada `PadButton` de acción. `PadButton` no cambia. Comprobación: el mando se sigue viendo y funcionando igual (el buje se ve doble hasta el paso 3).
2. **Tokens.** En el bloque `/* ===== mando táctil ===== */` de `app/globals.css`, declarar las variables `--gp-*` en `.touch-gamepad` con los valores oscuros del Modelo de datos. Aún no se usan.
3. **Cruceta.** Reescribir `.gamepad-dpad`, `.pad-btn`, `.pad-arrow`, `.pad-btn:active` y añadir `.pad-hub`, `.pad-hub-gem` y `@keyframes pulse-led` según el diseño y las medidas de esta spec. Retirar `.gamepad-dpad::before`. La cruz se mantiene con `grid-template-areas` (el buje ocupa `hub`). Comprobación: en emulación táctil a 390×844, la cruceta coincide con `gamepad-neon.png`.
4. **A y B.** Reescribir `.gamepad-actions` (fila horizontal, B a la izquierda, A a la derecha), `.act-btn` (relleno radial, borde, canto, resplandor), `.act-btn.b` con `--act: var(--cyan)`, `.act-key`, `.act-ring`, `.act-btn:active` (hundido + anillo visible) y `.act-label` bajo el botón. Ajustar `.is-off`: atenuado, sin resplandor, sin anillo, sin hundirse. Comprobación: A/B como en la captura; en Arkanoid y Snake atenuados.
5. **Carcasa en vertical.** `.touch-gamepad` con degradado, borde, `::before` (borde interior a 4px), `::after` (textura de puntos, `pointer-events: none`) y sombra. Dentro del `@media (pointer: coarse)` del layout táctil, la carcasa deja un margen alrededor y sigue tomando el alto sobrante (`flex: 1 1 auto; min-height: 0`); los controles quedan por encima de la textura (`z-index`). Comprobación: a 390×844 la carcasa se ve como panel bajo la pantalla, sin scroll y sin solaparse con el CRT.
6. **Media carcasa en horizontal.** En `@media (pointer: coarse) and (orientation: landscape)`, con `.touch-gamepad` en `display: contents`, aplicar a `.gamepad-dpad` y `.gamepad-actions` el mismo fondo, doble borde, textura y sombra, con su propio relleno, centrados en su lado del CRT. La regla de anchura de `.crt-screen` (`100vw - 360px`) se revisa para que cada media carcasa quepa entera. Comprobación: a 844×390 la cruceta y A/B están cada uno en su panel, la pantalla mantiene 4:3 y no hay scroll.
7. **Pantallas estrechas.** Bajo `max-width: 379px` (dentro del media query táctil): A/B a 64px, separación 16px, radio de carcasa 16px. La cruceta no baja de 56px.
8. **Tema claro.** Redefinir las variables `--gp-*` en `:root[data-theme="light"] .touch-gamepad` con los valores claros, y quitar resplandores y `text-shadow` de A/B. Retirar la regla actual `:root[data-theme="light"] .act-key` si queda redundante. Comprobación de contraste con los valores de la tabla.
9. **Movimiento reducido.** `@media (prefers-reduced-motion: reduce)`: `.pad-hub-gem` sin animación.
10. **Referencia.** Añadir `.pad-hub` y `.act-ring` a la línea del mando táctil en `.claude/skills/add-game/reference.md`.
11. **Verificación.** Playwright con emulación táctil (CDP) a 390×844 y 844×390 en los cuatro juegos, en tema oscuro y claro, con captura de cada combinación; escritorio a 1280×800 sin emulación en los cuatro juegos; `npm run build` y `npm run lint`.

---

## Criterios de aceptación

**Escritorio (`pointer: fine`, 1280×800):**

- [ ] En los cuatro juegos el mando no se ve y el player es idéntico al de antes de esta spec.

**Táctil, tema oscuro, vertical (390×844):**

- [x] La carcasa tiene degradado, borde exterior, borde interior a 4px y textura de puntos, y se ve como panel bajo la pantalla sin solaparse con `.crt-screen`.
- [x] La cruceta tiene cuatro teclas en relieve de al menos 56×56 px y un buje central con una gema romboidal cian que pulsa.
- [x] A es magenta y B es cian; están en fila horizontal, B a la izquierda y A a la derecha, con relleno radial, letra blanca en `--font-pixel` y resplandor de su color.
- [x] Pulsar una tecla de la cruceta la hunde y pone su triángulo y su borde en cian con resplandor; al soltar vuelve al reposo.
- [x] Pulsar A o B lo hunde y muestra el anillo discontinuo; al soltar desaparece.
- [x] Las etiquetas DISPARO (Asteroides), CAÍDA y ROTAR (Tetris) se ven bajo su botón.
- [x] En Arkanoid y Snake, A y B se ven atenuados, sin resplandor, y pulsarlos no los hunde ni muestra el anillo.
- [x] Captura comparada con `references/gamepad-assets/gamepad-neon.png`: misma carcasa, cruceta, buje y A/B (salvo medidas escaladas y etiquetas).
- [x] La página no hace scroll.

**Táctil, horizontal (844×390):**

- [x] La cruceta está a la izquierda del CRT y A/B a la derecha, cada grupo dentro de su propia media carcasa con degradado, doble borde y textura.
- [x] La pantalla mantiene 4:3, cabe entera y no hay scroll.

**Táctil, tema claro (390×844 y 844×390):**

- [x] La carcasa es de tono papel con sombra gris, sin resplandor de color.
- [x] Las teclas de la cruceta son claras en relieve; al pulsar se tiñen de cian claro, sin resplandor.
- [x] A y B tienen relleno magenta/cian de tema claro con letra blanca, sin `text-shadow` ni resplandor.
- [x] Triángulos en reposo y bordes de botón tienen contraste ≥ 3:1 y `.act-label` ≥ 4.5:1 contra su fondo.

**Comportamiento (sin cambios respecto a la SPEC 10):**

- [x] Los controles de cada juego hacen lo mismo que en la SPEC 10 (tabla de etiquetas por juego).
- [x] Mantener pulsado y arrastrar fuera suelta la tecla.
- [x] Con `prefers-reduced-motion: reduce` la gema no pulsa.

**General:**

- [x] `.gamepad-dpad::before` ya no existe en `globals.css`.
- [x] `GamepadConfig`, los códigos de tecla y la lógica de `PadButton` no cambian (`git diff` de `touch-gamepad.tsx` solo añade `.pad-hub`, `.pad-hub-gem` y `.act-ring`).
- [x] `npm run build` y `npm run lint` pasan sin errores.
- [x] La consola no muestra errores ni avisos de hidratación en `/jugar/<id>` con emulación táctil.

---

## Decisiones

- **Sí:** reescribir solo la piel del mando; comportamiento y layout de la SPEC 10 intactos. El diseño es visual y la SPEC 10 ya está verificada en Android.
- **Sí:** B cian, A magenta, como el diseño. Abandona el amarillo de la SPEC 10.
- **Sí:** A y B en fila horizontal (B izquierda, A derecha) como en el diseño, en vez de la diagonal de la SPEC 10.
- **Sí:** conservar las etiquetas `.act-label` bajo A/B aunque el diseño no las tenga. Sin ellas el jugador no sabe qué hace cada botón en cada juego.
- **Sí:** versión clara propia (carcasa papel, botones en relieve, A/B con relleno de color tintado y letra blanca, sin resplandores). Pedido explícito del usuario frente a dejar el mando siempre oscuro como `.crt`.
- **No:** mando siempre oscuro en tema claro. Habría sido más fiel al diseño y más barato, pero el usuario quiere que siga el tema.
- **No:** A/B neón puro con glow en tema claro. El resplandor sobre papel ensucia, y los neón puros no pasan contraste en claro.
- **Sí:** media carcasa por lado en horizontal. Mantiene el lenguaje del diseño cuando el mando se parte.
- **No:** carcasa envolviendo cruceta + CRT + A/B en horizontal. Cambiaría el layout de la SPEC 10, no solo la piel.
- **No:** quitar la carcasa en horizontal. Perdería el aspecto del diseño en la orientación más usada para jugar.
- **Sí:** mínimo táctil de 56px en la cruceta, escalando el resto del diseño en proporción. La SPEC 10 lo fija y el diseño (50/46px) queda por debajo.
- **Sí:** gema con pulso y anillo al pulsar, desactivando el pulso con `prefers-reduced-motion`.
- **Sí:** el buje pasa de `::before` a elemento real `.pad-hub`. Libera los pseudoelementos de `.gamepad-dpad` para la media carcasa en horizontal (borde interior y textura) y permite animar la gema.
- **Sí:** mantener los nombres de clase de la SPEC 10. El agente `mobile-porter` y `add-game/reference.md` los usan para verificar y documentar.
- **Sí:** triángulos con `clip-path` como hoy, no los SVG del diseño. Se ven igual y no añaden marcado.
- **Sí:** estado pulsado con `:active`, como en la SPEC 10, y no con la clase `.on` del diseño. Ya está verificado en Android; ver Riesgos.
- **No:** iluminar el mando con el teclado ni mostrarlo en escritorio. Merece su propia spec.
- **No:** `:hover`. En táctil no existe y en escritorio el mando no se ve.

---

## Riesgos

| Riesgo                                                                                                | Mitigación                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `e.preventDefault()` en `pointerdown` impide `:active` en algún navegador y el botón no se ve pulsado | La SPEC 10 ya usa `:active` y pasó en Android Chrome. Si Playwright o el móvil real muestran que no se aplica, `PadButton` añade una clase `is-on` mientras `held` es verdadero (sin cambiar los `setKey`) y se anota en Decisiones. |
| La carcasa con margen en vertical resta alto y el mando no cabe en móviles bajos                      | El margen sale del alto sobrante (`flex: 1 1 auto`); se comprueba a 390×844 y a 360×640. Si no cabe, el margen se reduce antes que las teclas.                                                                                       |
| La media carcasa en horizontal no cabe junto a un CRT de 4:3 a todo el alto                           | Se revisa la regla `width: min(100dvh * 4 / 3, 100vw - 360px)` de `.crt-screen` para reservar el ancho de cada panel.                                                                                                                |
| La textura `::after` o el borde `::before` capturan los toques                                        | Ambos con `pointer-events: none` y los controles con `z-index` por encima.                                                                                                                                                           |
| `display: contents` en horizontal rompe la herencia de las variables `--gp-*`                         | Las variables se heredan por el árbol DOM, no por la caja, así que los grupos las siguen recibiendo. Se comprueba en la captura horizontal en los dos temas.                                                                         |
| Resplandores y sombras múltiples cuestan rendimiento en móviles modestos                              | Solo `box-shadow` y `filter` en el estado pulsado; la única animación continua es la gema (`opacity` + `transform`).                                                                                                                 |
