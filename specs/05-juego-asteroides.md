# SPEC 05 — Asteroides, el primer juego real

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-08-27
> **Objetivo:** Portar el juego de canvas de `references/started-games/02-asteroids/` a un motor TypeScript integrado en la plataforma, jugable en `/jugar/asteroides` con teclado o controles táctiles, cuya puntuación se guarda con el flujo que ya existe.

---

## Por qué existe esta spec

Hoy ningún juego del Vault se juega. `components/game-player.tsx` es un simulacro: la puntuación sube sola con un `setInterval`, la «arena» son cuatro `div` animados por CSS y el botón FIN abre el modal de fin de partida sin que haya habido partida. Eso sostuvo el MVP visual de la SPEC 01, pero la plataforma promete jugar y competir por puntos, y hasta ahora las dos mitades son atrezo.

En `references/started-games/02-asteroids/` ya existe un Asteroids completo y jugable: 510 líneas de JavaScript sin dependencias, canvas 800×600, bucle `requestAnimationFrame`, clases `Bullet`, `Asteroid`, `Ship`, `Particle` y `PowerUp`, wrap toroidal, división de asteroides y power-up de disparo triple. No hay que diseñar un juego: hay que meterlo dentro de Next.js sin estropearlo.

Esta spec hace exactamente eso, para **un** juego. Los otros ocho del catálogo siguen con el simulacro y no se tocan.

Tres detalles que condicionan el trabajo:

- El original es un script global que asume `document.getElementById('canvas')` y arranca solo al cargarse. Dentro de React eso no vale: hace falta una instancia con ciclo de vida (`start`, `stop`, `pause`, `restart`) atada al montaje y desmontaje del componente, o el bucle sigue corriendo después de salir de la página.
- El original no tiene pausa y reinicia con ESPACIO en el game over. La plataforma tiene botones PAUSA, FIN y JUGAR DE NUEVO, y un modal que guarda la puntuación. Manda React; el ESPACIO pasa a disparar y nada más.
- La carpeta de `references/` es material de partida y **no se modifica**. El port vive en `lib/` y `components/`.

---

## Alcance

**Dentro:**

- Port de `game.js` a TypeScript en `lib/games/asteroids/`: entidades, constantes y una clase `AsteroidsEngine` con API explícita y callbacks de estado.
- `components/games/asteroids-canvas.tsx`: componente cliente que monta el `<canvas>`, instancia el motor, conecta teclado y controles táctiles y lo destruye al desmontar.
- `components/games/asteroids-player.tsx`: el player de este juego, montado sobre el shell compartido.
- Extraer `components/player-shell.tsx` con lo común: cabecera de HUD, marco CRT, botones PAUSA/FIN/SALIR y modal de fin de partida con guardado.
- Refactorizar `components/game-player.tsx` (el simulacro de los otros ocho juegos) para que use ese mismo shell, sin cambiar nada de lo que se ve ni de cómo se comporta.
- `app/jugar/[id]/page.tsx` elige qué player montar según el `id`.
- Entrada nueva `asteroides` en `GAMES` (`lib/games.ts`), la novena.
- Controles táctiles superpuestos al canvas en punteros gruesos: rotar izquierda, rotar derecha, propulsar, disparar.
- Pausa automática al ocultar la pestaña o perder el foco.
- HUD en los dos sitios: el que dibuja el canvas (`drawHUD`, overlay de GAME OVER) se mantiene tal cual, y además el HUD de React de la cabecera refleja los mismos valores emitidos por el motor.

**Fuera de alcance (para futuras specs):**

- **Portar los otros ocho juegos.** BLOQUE BUSTER, CAÍDA, SERPENTINA, GLOTÓN, INVASORES, ROCAS, RANARIA y DUELO PIXEL siguen con la arena falsa y la puntuación por `setInterval`.
- **Tocar la entrada `rocas`.** Se queda en el catálogo con sus datos actuales, aunque describa un juego de asteroides. Renombrarla rompería URLs y las puntuaciones ya guardadas con esa clave.
- **Guardar puntuaciones en Supabase.** Sigue siendo `saveScore()` sobre `localStorage`, como en la SPEC 01. El esquema, la RLS y el salón real van en su propia spec.
- **Auth real.** El nombre del jugador sale de la sesión falsa o del campo del modal.
- **Cambiar el juego.** Ni dificultad, ni velocidades, ni número de asteroides, ni paleta: port fiel.
- **Sonido.** El original no tiene y aquí tampoco.
- **Pantalla completa, tabla de récords dentro del juego, guardado de partida.**
- **Portada nueva.** `asteroides` reutiliza la clase CSS `cover-rocas`.
- Tests automatizados.

---

## Modelo de datos

No hay nada nuevo persistido. Las puntuaciones siguen guardándose con la forma que ya define `components/session-provider.tsx` (`SavedScore`: `game`, `score`, `name`, `at`) bajo la clave `av_scores`, con `game: "asteroides"`.

Lo que sí se define son tres estructuras en memoria y una entrada de catálogo.

**Entrada nueva en `GAMES` (`lib/games.ts`):**

```ts
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "El clásico de 1979, jugable de verdad.",
  long: "...",
  cat: "SHOOTER",
  cover: "cover-rocas",
  color: "yellow",
  best: 0,
  plays: "NUEVO",
}
```

`best: 0` y `plays: "NUEVO"` a propósito: es el único juego jugable y no tiene historial que inventar. `plays` ya es `string`, así que el literal `"NUEVO"` no cambia el tipo `Game`.

**Estado que el motor emite al HUD de React:**

```ts
export type AsteroidsState = {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
};
```

**API pública del motor:**

```ts
export class AsteroidsEngine {
  constructor(
    canvas: HTMLCanvasElement,
    opts: {
      onState: (s: AsteroidsState) => void;
      onGameOver: (finalScore: number) => void;
    },
  );
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  forceGameOver(): void; // botón FIN
  setKey(code: string, down: boolean): void; // teclado y táctil entran por aquí
  destroy(): void;
}
```

`W = 800` y `H = 600` siguen siendo constantes del módulo: la lógica, el wrap toroidal y los radios de colisión no dependen del tamaño en pantalla.

`onState` se llama solo cuando alguno de los cuatro campos cambia respecto al frame anterior, no en los 60 frames por segundo: cada llamada provoca un `setState` en React.

---

## Plan de implementación

1. **Entrada de catálogo.** Añadir `asteroides` a `GAMES` en `lib/games.ts` con los valores de arriba. Comprobación: aparece como novena tarjeta en `/games`, con la portada de `cover-rocas`, y `/games/asteroides` y `/jugar/asteroides` responden en vez de dar 404 —`generateStaticParams` ya recorre `GAMES`—.

2. **Port de las entidades.** `lib/games/asteroids/entities.ts` con `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle` tipadas, más `wrap`, `dist`, `rand`, `randInt`, `RADII`, `SPEEDS`, `POINTS` y las constantes de power-up. Traducción literal: mismos números, mismos trazos, mismas fórmulas. `draw(ctx)` recibe el contexto por parámetro en lugar de leer un global, y `Ship.update(dt, keys)` recibe el mapa de teclas. Comprobación: `npx tsc --noEmit` limpio y ningún `any`.

3. **Port del motor.** `lib/games/asteroids/engine.ts` con `AsteroidsEngine`: encierra `ship`, `bullets`, `asteroids`, `particles`, `powerUps`, `score`, `lives`, `level`, `state`, `deadTimer`, `powerUpSpawned` y `killsSinceSpawn` como campos privados, y `spawnAsteroids`, `initGame`, `nextLevel`, `explode`, `killShip`, `update`, `drawHUD`, `drawOverlay` y `draw` como métodos. Cambios respecto al original, y solo estos:
   - El bucle guarda el id de `requestAnimationFrame` para poder cancelarlo en `pause()` y `destroy()`; `resume()` pone `lastTime = null` para que el primer `dt` tras la pausa sea 0 y nadie muera por el salto.
   - Se elimina el reinicio con ESPACIO en `gameover` (`if (pressed('Space')) initGame()`). Reiniciar es cosa del botón.
   - `killShip()` llama a `onGameOver(score)` cuando `lives` llega a 0.
   - `forceGameOver()` pone `state = 'gameover'` y dispara el mismo callback.
   - El resto —`drawHUD`, el overlay `GAME OVER`, los 20/50/100 puntos, el power-up 3x, la invencibilidad de 3 s— se queda idéntico.

   Comprobación: montar el motor en `/jugar/asteroides` sin HUD de React y jugar una partida completa con teclado.

4. **Componente de canvas.** `components/games/asteroids-canvas.tsx`, con `"use client"`. Un `useRef` al `<canvas>` y un `useEffect` que crea el motor, llama a `start()` y devuelve `destroy()` en la limpieza —sin eso, en desarrollo el doble montaje de React deja dos bucles corriendo a la vez—. El búfer se fija en 800×600 multiplicado por `devicePixelRatio` con `ctx.scale`, y el CSS lo estira con `width: 100%` y `aspect-ratio: 4 / 3`. Los `keydown`/`keyup` se registran en `window` y llaman a `setKey`, con `preventDefault()` en `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` y `Space` para que la página no haga scroll mientras se juega. `visibilitychange` y `blur` pausan.

5. **Controles táctiles.** Cuatro botones superpuestos al canvas, visibles solo bajo `@media (pointer: coarse)`: `◀` y `▶` abajo a la izquierda, `PROPULSAR` y `DISPARAR` abajo a la derecha. Cada uno traduce `pointerdown`/`pointerup`/`pointercancel` a `setKey('ArrowLeft'|'ArrowRight'|'ArrowUp'|'Space', bool)`, así que el motor no distingue dedo de tecla. `touch-action: none` y `user-select: none` en los botones para evitar el zoom por doble toque y la selección accidental. Comprobación: emular un móvil en las DevTools y completar un nivel sin teclado.

6. **Shell compartido.** Extraer de `components/game-player.tsx` un `components/player-shell.tsx` con la cabecera de HUD (jugador, puntuación, vidas, nivel), el marco CRT, los botones PAUSA/FIN/SALIR, el cartel EN PAUSA y el modal de fin de partida con el campo de nombre y `saveScore()`. Recibe por props los valores del HUD, los manejadores de los botones y, como `children`, el contenido de la pantalla. Sin CSS nuevo: se reutilizan las clases que ya están en `app/globals.css`.

7. **Reconectar el simulacro.** `components/game-player.tsx` pasa a ser el simulacro montado sobre el shell: mantiene su `setInterval`, su `level` derivado de `score / 2500` y su arena de `div`. Comprobación de no-regresión: `/jugar/serpentina` se ve y se comporta exactamente igual que antes.

8. **Player de Asteroides.** `components/games/asteroids-player.tsx` monta el shell con `<AsteroidsCanvas>` dentro y una `ref` al motor. PAUSA llama a `pause()`/`resume()`, FIN a `forceGameOver()`, JUGAR DE NUEVO a `restart()`. El HUD de React se alimenta de `onState`; `onGameOver` abre el modal. Puntuación, vidas y nivel salen del motor, nunca de un cálculo propio.

9. **Despacho en la ruta.** `app/jugar/[id]/page.tsx` monta `AsteroidsPlayer` si `id === "asteroides"` y `GamePlayer` en cualquier otro caso. Comprobación: `/jugar/asteroides` juega y `/jugar/gloton` sigue simulando.

10. **Repaso final.** Recorrer `/`, `/games`, `/games/asteroides`, `/jugar/asteroides`, `/jugar/rocas`, `/salon`, `/about` y `/auth`. Jugar una partida entera de Asteroides, perder las tres vidas, guardar la puntuación y comprobar que aparece en `/salon`.

---

## Criterios de aceptación

- [x] `npm run lint` termina sin errores ni advertencias.
- [x] `npm run build` termina sin errores ni advertencias de hidratación.
- [x] `/games` muestra nueve tarjetas y una es ASTEROIDES.
- [x] `/jugar/asteroides` pinta el canvas con la nave y cuatro asteroides grandes, sin arena de CSS detrás.
- [x] Las flechas rotan y propulsan, ESPACIO dispara, y ninguna de esas teclas hace scroll en la página.
- [x] Disparar a un asteroide grande lo parte en dos medianos y suma 20 puntos; un mediano da 50 y uno pequeño 100.
- [x] Al destruir todos los asteroides sube el nivel y aparecen más.
- [x] El power-up 3x aparece, se recoge y durante 5 s la nave dispara tres balas.
- [x] Chocar con un asteroide resta una vida, hay explosión de partículas y la nave reaparece parpadeando.
- [x] Al perder la tercera vida se abre el modal de fin de partida con la puntuación real del motor, no una inventada.
- [x] Guardar la puntuación en ese modal la hace aparecer en `/salon` con el nombre introducido.
- [x] ESPACIO en la pantalla de game over **no** reinicia la partida.
- [x] El botón PAUSA congela el juego por completo —nave, asteroides y partículas— y REANUDAR lo continúa sin muertes por el salto de tiempo.
- [x] Cambiar de pestaña pausa la partida automáticamente.
- [x] El botón FIN abre el modal con la puntuación acumulada hasta ese momento.
- [x] JUGAR DE NUEVO reinicia con 3 vidas, nivel 1 y puntuación 0.
- [x] Salir de `/jugar/asteroides` no deja ningún `requestAnimationFrame` corriendo: volver a entrar no acelera el juego.
- [x] La puntuación, las vidas y el nivel de la cabecera de React coinciden en todo momento con los que dibuja el canvas.
- [x] Con la ventana emulada como móvil aparecen los cuatro botones táctiles y se puede jugar una partida entera sin teclado.
- [x] En escritorio los botones táctiles no se ven.
- [x] El canvas se adapta al ancho del marco CRT manteniendo la proporción 4:3, sin deformarse ni desbordar horizontalmente.
- [x] `/jugar/serpentina` y el resto de juegos siguen funcionando con el simulacro, con el mismo aspecto que antes.
- [x] `references/started-games/02-asteroids/` no tiene ningún cambio.
- [x] `grep -rn "getElementById" lib components` no devuelve resultados: el canvas llega por `ref`.
- [x] La entrada `rocas` de `lib/games.ts` no ha cambiado.

---

## Decisiones

- **Sí:** portar `game.js` a un módulo TypeScript. Decisión del usuario frente a copiarlo a `public/` o embeberlo en un `<iframe>`. Pasa por ESLint y por el compilador, permite que React lea la puntuación sin `postMessage`, y evita un segundo documento con su propio CSS dentro del marco CRT.
- **No:** `iframe`. Aislaría bien el juego, pero no hay forma limpia de leer la puntuación ni de guardarla en el salón de la fama, que es justo lo que la plataforma promete.
- **Sí:** entrada nueva `asteroides` en el catálogo. Decisión del usuario frente a reutilizar `rocas`. Renombrar `rocas` rompería las URLs existentes y las puntuaciones guardadas bajo esa clave; añadir una entrada no rompe nada.
- **Sí:** HUD duplicado, en el canvas y en React. Decisión del usuario frente a dejar solo uno. El motor es la única fuente de `score`, `lives` y `level` y los dos HUD leen de ahí, así que la duplicación es visual, no de estado.
- **Sí:** React manda sobre el motor. PAUSA, FIN y JUGAR DE NUEVO controlan la partida y el ESPACIO solo dispara. Con el reinicio original por ESPACIO, un jugador perdía la puntuación antes de poder guardarla.
- **Sí:** un componente de player por juego, despachado desde `app/jugar/[id]/page.tsx`. Decisión del usuario frente a un campo `engine` en el tipo `Game`. Cada juego portado podrá tener sus propias necesidades sin llenar `GamePlayer` de condicionales.
- **Sí:** `PlayerShell` compartido, como consecuencia de lo anterior. Sin él, HUD, marco CRT, modal y guardado quedarían duplicados en dos archivos y se desincronizarían al primer retoque visual.
- **Sí:** búfer fijo de 800×600 escalado por CSS. La física, las distancias de spawn y los radios de colisión están calibrados para ese tamaño; hacer el mundo elástico obligaría a rebalancear el juego, que es justo lo que esta spec no hace.
- **Sí:** `devicePixelRatio` en el búfer. Sin eso, el trazo vectorial de 1,5 px se ve borroso en pantallas Retina.
- **Sí:** controles táctiles con cuatro botones que alimentan el mismo mapa de teclas. Decisión del usuario frente a dejar el juego solo para teclado. Reutilizan la entrada existente, así que el motor no distingue dedo de tecla y no hay una segunda ruta de control que probar.
- **No:** joystick virtual ni control por inclinación. Más código y, en el caso de la inclinación, permisos de sensores en iOS para un juego dentro de un marco pequeño.
- **Sí:** pausa automática al perder el foco. El tope de `dt` en 50 ms evita la espiral de la muerte, pero no evita morir mientras se mira otra pestaña.
- **Sí:** port fiel, sin tocar dificultad ni paleta. Si algo se siente mal después, se sabrá que es el envoltorio y no un cambio de balanceo mezclado con él.
- **Sí:** `best: 0` y `plays: "NUEVO"` en el catálogo. Es el único juego real; inventarle 15.6K partidas sería mentir justo donde ya no hace falta.
- **No:** leer `best` de `localStorage` en la biblioteca. Convertiría la página en cliente y arriesgaría un desajuste de hidratación por un dato de escaparate.
- **No:** guardar en Supabase todavía. El cableado está hecho (SPEC 04), pero el esquema con RLS y la auth real son otra spec; mezclarlas haría irrevisables las dos.
- **Sí:** `references/started-games/02-asteroids/` intacto. Es el material de partida y sirve de referencia para comparar el port.

---

## Riesgos

| Riesgo                                                                                                 | Mitigación                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El doble montaje de React en desarrollo deja dos bucles `requestAnimationFrame` y el juego va al doble | `destroy()` en la limpieza del `useEffect`, cancelando el frame pendiente. Criterio de aceptación explícito: entrar y salir de la página no acelera el juego.    |
| `onState` en cada frame provoca 60 renders por segundo y el HUD tirita                                 | El motor solo llama a `onState` cuando alguno de los cuatro campos cambia respecto al frame anterior.                                                            |
| Al reanudar tras una pausa larga, un `dt` enorme teletransporta la nave dentro de un asteroide         | `resume()` pone `lastTime = null`, así que el primer frame tiene `dt = 0`. El tope de 50 ms del original se mantiene como segunda red.                           |
| El HUD del canvas y el de React muestran valores distintos                                             | Ambos leen del mismo estado del motor; React nunca calcula la puntuación ni el nivel por su cuenta. Es criterio de aceptación que coincidan.                     |
| Extraer `PlayerShell` rompe sin querer los otros ocho juegos                                           | El paso 7 es una comprobación de no-regresión explícita y no cambia ninguna clase CSS.                                                                           |
| Las flechas y el espacio hacen scroll de la página mientras se juega                                   | `preventDefault()` en las cinco teclas de juego, solo mientras el player está montado.                                                                           |
| Los botones táctiles disparan zoom por doble toque o selección de texto                                | `touch-action: none` y `user-select: none` en los botones, y `pointercancel` tratado como `pointerup` para que ninguna tecla se quede pegada.                    |
| ASTEROIDES y ROCAS conviven en la biblioteca describiendo el mismo juego                               | Asumido: `rocas` es atrezo y `asteroides` es real. El texto de `short` deja claro cuál se juega de verdad. Consolidarlos, si llega, será una spec de limpieza.   |
| Un `game.js` de 510 líneas traducido a mano introduce erratas numéricas silenciosas                    | El port es literal y `references/` queda intacto para comparar. Los criterios de aceptación fijan los números observables: 20/50/100 puntos, 3 vidas, 3 s de 3x. |

---

## Lo que **no** entra en esta spec

- Portar los ocho juegos restantes.
- Guardar puntuaciones en Supabase y salón de la fama real.
- Auth real y nombre de jugador verificado.
- Sonido, pantalla completa y guardado de partida.
- Cualquier ajuste de dificultad o repintado con la paleta neón.

Cada una, si llega, en su propia spec.
