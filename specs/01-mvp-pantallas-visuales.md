# SPEC 01 — MVP visual: las cinco pantallas de Arcade Vault

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-08-26
> **Objetivo:** Portar las cinco pantallas de `references/templates/` a Next.js 16 con App Router, solo la capa visual, sin implementar ningún juego.

---

## Por qué existe esta spec

El proyecto es todavía el scaffold de `create-next-app`. Existe un prototipo completo en `references/templates/`: un SPA de React 18 servido por Babel Standalone desde un HTML estático, con routing por hash y componentes colgados de `window`. Ese prototipo define el diseño final, pero ninguna de sus decisiones técnicas sirve en producción.

Esta spec convierte ese prototipo en una app Next.js real: rutas de archivo en lugar de hash, Server Components donde no hace falta interactividad, y datos tipados en TypeScript. El diseño no se rediseña — se respeta píxel a píxel.

El CSS ya está portado: `app/globals.css` contiene las 950 líneas de `references/templates/styles.css`, adaptadas a los tokens de fuente de `next/font` y con un bloque `@theme inline` para Tailwind v4. `app/layout.tsx` ya monta las tres fuentes y los divs `.av-bg` / `.av-noise`. Esta spec **no toca ninguno de esos dos archivos salvo para añadir el footer al layout**.

---

## Alcance

**Dentro:**

- Cinco rutas de App Router: biblioteca, detalle de juego, reproductor, autenticación y salón de la fama.
- Barra de navegación compartida, con menú lateral móvil y estado con/sin sesión.
- Footer compartido en el layout.
- Página 404 en estilo arcade para ids de juego inexistentes.
- Datos mock tipados en `lib/games.ts` (8 juegos, categorías, generador determinista de puntuaciones).
- Sesión falsa y puntuaciones persistidas en `localStorage` a través de un Context de cliente.
- Simulación visual de partida en el reproductor: marcador que sube solo, HUD, pausa, modal de fin de partida y guardado de puntuación.
- Comportamiento responsive equivalente al del template.

**Fuera de alcance (para futuras specs):**

- Cualquier juego jugable. El reproductor es una simulación decorativa.
- Backend, base de datos o API. Todo el dato es mock en el cliente.
- Autenticación real. Los botones de Google y GitHub son decorativos y no hacen nada.
- Sistema de créditos funcional. El contador `CRÉDITOS · 03` del nav es texto fijo.
- Modo claro. La app es dark-only, igual que el template.
- Internacionalización. Todo el texto va en español, escrito directamente en los componentes.
- Sonido y música.
- Tests automatizados.

---

## Modelo de datos

Todo vive en `lib/games.ts`.

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;          // "bloque-buster" — también es el segmento de URL
  title: string;       // "BLOQUE BUSTER"
  short: string;       // una línea, para la card de la biblioteca
  long: string;        // párrafo, para el detalle
  cat: GameCategory;
  cover: string;       // clase CSS existente: "cover-bricks", "cover-tetro", ...
  color: GameColor;    // tinte del botón JUGAR de la card
  best: number;
  plays: string;       // ya formateado: "12.4K"
};

export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;        // "07/03/2026"
};
```

Los ocho juegos, el array `CATS` (con `"TODOS"` al frente), el array `PLAYERS` y la función `seededScores(seed: number, count?: number): ScoreRow[]` se copian literalmente de `references/templates/data.jsx`. `seededScores` es determinista por diseño (LCG con semilla) — esa propiedad es la que permite llamarla en el servidor sin provocar desajustes de hidratación. **No sustituir su `rand()` por `Math.random()`.**

Estado persistido en `localStorage`, con las mismas claves que el template:

```ts
// clave "av_user"
type SessionUser = { name: string };   // "PX_KAI", mayúsculas, máx. 10 caracteres

// clave "av_scores"
type SavedScore = {
  game: string;    // Game["id"]
  score: number;
  name: string;
  at: number;      // Date.now()
};
```

Sin versionado de esquema: son datos de demo y se pueden tirar. Toda lectura y escritura va envuelta en `try/catch`, porque `localStorage` lanza en modo privado en algunos navegadores.

---

## Plan de implementación

1. **`lib/games.ts`** — Portar `data.jsx` a TypeScript con los tipos de arriba. Exportaciones con nombre, sin `window`. Añadir `getGame(id: string): Game | undefined`.

2. **`components/session-provider.tsx`** (`"use client"`) — Context con `{ user, signIn(name), signOut(), saveScore(entry), scores }`. Hidrata desde `localStorage` en un `useEffect` (nunca durante el render, para no romper la hidratación) y escribe en cada cambio. Exportar el hook `useSession()`. Montarlo en `app/layout.tsx` envolviendo `{children}`.

3. **`components/nav.tsx`** (`"use client"`) — Portar `nav.jsx`. Los enlaces pasan a `next/link`; el estado activo se calcula con `usePathname()` en lugar del objeto `route` (`/juegos/*` y `/jugar/*` marcan «Biblioteca» como activa). Consume `useSession()` para alternar entre el botón «Iniciar Sesión» y el del nombre de usuario. Conserva el panel lateral móvil con su `useState`.

4. **`app/layout.tsx`** — Añadir `<Nav />` y `<main className="av-main">` alrededor de `{children}`, más el footer de `app.jsx` (`© 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0`). Los estilos inline del footer se mueven a una clase `.av-footer` en `globals.css`. Comprobación manual: `npm run dev` muestra el nav y el footer sobre la página de inicio todavía sin tocar.

5. **`app/page.tsx` — Biblioteca** — Server Component que renderiza `<LibraryGrid games={GAMES} />`. El componente `components/library-grid.tsx` (`"use client"`) porta `Library` y `GameCard` de `biblioteca.jsx`: hero, buscador, chips de categoría, grid con efecto tilt y estado vacío «NO HAY RESULTADOS». La card entera y su botón JUGAR navegan a `/juegos/[id]`. Borrar el contenido del scaffold y el `import Image`.

6. **`app/juegos/[id]/page.tsx` — Detalle** — Server Component con `PageProps<"/juegos/[id]">`. Recuerda que en Next 16 `params` es una promesa: hay que hacer `await params`. Si `getGame(id)` devuelve `undefined`, llamar a `notFound()`. Renderiza la portada, los tags, la ficha, la tira de estadísticas y la tabla lateral `seededScores(id.length * 17 + 3, 10)`. Los dos botones son `next/link` a `/jugar/[id]` y `/`. Añadir `generateStaticParams()` con los ocho ids.

7. **`app/not-found.tsx`** — Pantalla 404 en estilo arcade («GAME OVER», «ESE CARTUCHO NO ESTÁ EN EL VAULT», enlace de vuelta a la biblioteca). Reutiliza las clases `pixel`, `neon-magenta` y `btn` existentes. Comprobación manual: `/juegos/inventado` la muestra dentro del layout con nav y footer.

8. **`app/auth/page.tsx` — Autenticación** — Página de cliente que porta `auth.jsx`: pestañas ENTRAR/CREAR CUENTA, campos, botón de invitado, divisor y botones sociales decorativos. Al enviar, llama a `signIn(usuario || "PLAYER1")` y hace `router.push("/")`. «JUGAR COMO INVITADO» hace `signOut()` y navega a `/`. Los botones sociales llevan `type="button"` y no hacen nada.

9. **`app/jugar/[id]/page.tsx` — Reproductor** — Server Component que resuelve el juego (`notFound()` si no existe) y renderiza `<GamePlayer game={game} />`. El componente `components/game-player.tsx` (`"use client"`) porta `reproductor.jsx`: HUD, marco CRT con la arena decorativa, superposición de pausa, y el `setInterval` de 220 ms que suma entre 10 y 90 puntos. El nivel sube cada 2 500 puntos. El botón FIN abre el modal de fin de partida.

10. **Modal de fin de partida** — Dentro de `game-player.tsx`: puntuación final, campo de iniciales precargado con el nombre de sesión (o `INVITADO`), botón que llama a `saveScore()` y muestra el aviso «▸ PUNTUACIÓN GUARDADA_», y los botones de reiniciar y volver a la biblioteca. Comprobación manual: guardar una puntuación y verla en `localStorage.av_scores`.

11. **`app/salon/page.tsx` — Salón de la Fama** — Server Component que pasa `GAMES` a `components/hall-of-fame.tsx` (`"use client"`), que porta `salon.jsx`: pestañas por juego, podio de tres puestos y tabla de doce filas desde `seededScores(tab.length * 23 + 7, 12)`.

12. **Fila «TU MEJOR MARCA»** — En `hall-of-fame.tsx`, leer `scores` de `useSession()`, filtrar por el juego activo y quedarse con la puntuación más alta. La fila muestra esa puntuación real, la fecha de `at` formateada como `dd/mm/aaaa` y la posición que le corresponde intercalada entre las filas mock. Si no hay ninguna partida guardada de ese juego, no se renderiza ni la fila ni su etiqueta.

13. **Repaso responsive y limpieza** — Comprobar los cortes del template en móvil (nav colapsado, grid a una columna, detalle apilado, tabla del salón). Borrar `app/page.tsx` residual del scaffold y los SVG de `public/` que ya no se usan (`next.svg`, `vercel.svg`).

---

## Criterios de aceptación

- [x] `npm run lint` termina sin errores ni advertencias.
- [x] `npm run build` termina sin errores y sin advertencias de hidratación.
- [x] `/` muestra el hero, el buscador, los cinco chips y las ocho cards.
- [x] Escribir «serp» en el buscador deja una sola card visible.
- [x] Pulsar el chip PUZZLE deja solo CAÍDA.
- [x] Una búsqueda sin resultados muestra el bloque «NO HAY RESULTADOS».
- [x] Pulsar una card navega a `/juegos/<id>` y la URL es compartible: recargar la reconstruye igual.
- [x] El detalle muestra portada, cuatro tags, párrafo largo, tira de estadísticas y diez filas de puntuaciones.
- [x] Las mismas diez filas aparecen tras recargar el detalle (`seededScores` es determinista).
- [x] `/juegos/inventado` devuelve 404 y muestra la pantalla arcade dentro del layout.
- [x] «▶ JUGAR AHORA» navega a `/jugar/<id>`.
- [x] En el reproductor el marcador sube solo y el nivel avanza al pasar 2 500 puntos.
- [x] PAUSA detiene el marcador y muestra la superposición «EN PAUSA»; REANUDAR lo reactiva.
- [x] FIN abre el modal con la puntuación final formateada en es-ES.
- [x] Guardar la puntuación muestra «▸ PUNTUACIÓN GUARDADA_» y añade una entrada a `localStorage.av_scores`.
- [x] «JUGAR DE NUEVO» reinicia marcador, vidas, nivel y cierra el modal.
- [x] Enviar el formulario de `/auth` con el usuario `px_kai` redirige a `/` y el nav muestra «PX_KAI ▾».
- [x] Recargar cualquier página conserva la sesión.
- [x] Pulsar el botón del nombre en el nav cierra la sesión y devuelve el botón «Iniciar Sesión».
- [x] `/salon` muestra el podio, las doce filas y cambia de datos al pulsar otra pestaña de juego.
- [x] Sin partidas guardadas en el juego activo, la fila «TU MEJOR MARCA» no aparece.
- [x] Con una partida guardada, esa fila muestra la puntuación real guardada, no un valor inventado.
- [x] A 375 px de ancho el nav muestra el botón ≡ y abre el panel lateral.
- [x] A 375 px de ancho ninguna pantalla produce scroll horizontal.
- [x] Ninguna partida ni juego real existe en el código: buscar `requestAnimationFrame` o `canvas` en `app/` y `components/` no devuelve nada.

---

## Decisiones

- **Sí:** App Router con rutas de archivo (`/`, `/juegos/[id]`, `/jugar/[id]`, `/auth`, `/salon`). URLs compartibles y Server Components por defecto, como pide CLAUDE.md.
- **No:** el routing por hash de `app.jsx`. Era una necesidad del HTML estático, no una decisión de diseño.
- **Sí:** reusar las clases de `app/globals.css` (`card`, `av-nav`, `crt`, `podium`…). El CSS ya está portado y verificado; traducirlo a utilidades Tailwind es trabajo grande con riesgo alto de deriva visual.
- **No:** reescribir los 950 renglones de CSS como utilidades Tailwind. Se reconsidera cuando el diseño se estabilice, en otra spec.
- **Sí:** conservar la simulación falsa del reproductor. Deja visibles todos los estados del HUD y del modal sin implementar ningún juego.
- **Sí:** Context de cliente más `localStorage` con las claves `av_user` y `av_scores`. Hace visibles las variantes con y sin sesión, y sobrevive a la recarga.
- **No:** autenticación real, ni siquiera con librería. Queda fuera del MVP visual.
- **Sí:** `lib/games.ts` como módulo único. Son unas 120 líneas; partirlo en dos archivos no aporta.
- **Sí:** `notFound()` con `app/not-found.tsx` propio. Un 404 blanco de Next sobre el fondo neón rompería el conjunto.
- **Sí:** llamar a `seededScores` en el servidor. Es determinista, así que el HTML del servidor y el del cliente coinciden.
- **Sí:** la fila «TU MEJOR MARCA» lee `av_scores`. El rango inventado del template hacía invisible la puntuación que el usuario acababa de guardar.
- **No:** tests automatizados. Añadir Vitest y Testing Library para verificar maquetación estática no compensa; la verificación es build, lint y checklist visual.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Desajuste de hidratación al leer `localStorage` durante el render | El Context lee solo dentro de `useEffect`; el primer render siempre es el estado sin sesión. |
| `localStorage` lanza excepción en modo privado | Toda lectura y escritura va en `try/catch`. La app funciona, simplemente no persiste. |
| `toLocaleString("es-ES")` formatea distinto en servidor y cliente | Los números formateados se renderizan solo en componentes de cliente, o se formatea con un helper fijo `es-ES` compartido. |
| El efecto tilt de las cards depende de `mousemove` y no existe en táctil | Es puramente decorativo. En táctil la card se ve estática y sigue navegando al pulsar. |
| `params` como promesa en Next 16 rompe páginas copiadas de ejemplos antiguos | Todas las páginas dinámicas hacen `await params` y usan los tipos globales `PageProps<"/ruta">`. |
| El `setInterval` del reproductor sigue corriendo al navegar fuera | El `useEffect` devuelve su `clearInterval`. |

---

## Lo que **no** entra en esta spec

- Juegos jugables. Ninguno de los ocho.
- Backend, base de datos o API.
- Autenticación real, incluidos Google y GitHub.
- Sistema de créditos funcional.
- Modo claro.
- Internacionalización.
- Sonido.
- Tests automatizados.

Cada uno de esos, si llega, va en su propia spec.
