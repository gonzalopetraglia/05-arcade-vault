# SPEC 02 — Landing: la portada de Arcade Vault

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-08-26
> **Objetivo:** Portar `references/templates/home-about/home.jsx` a la ruta `/` como landing, moviendo la biblioteca a `/games` y el detalle a `/games/[id]`.

---

## Por qué existe esta spec

La SPEC 01 dejó `/` ocupada por la biblioteca porque no había portada. El prototipo evolucionó: `references/templates/home-about/` trae un `home.jsx` de 338 líneas —hero a pantalla completa, cuatro features, rail de juegos, franja de estadísticas, actividad en vivo, pricing y CTA final— y un `nav.jsx` que añade dos entradas nuevas al menú, «Inicio» y «Acerca de».

Esta spec porta esa landing y reorganiza las rutas para dejarle sitio. La página «Acerca de» (`about.jsx`, 157 líneas, con el gamepad SVG interactivo y el formulario de contacto) queda para la SPEC 03; el enlace del nav se añade ahora igualmente y apunta a una ruta que todavía no existe.

Como en la SPEC 01: el diseño no se rediseña, se porta.

---

## Alcance

**Dentro:**

- Landing nueva en `/`, portando `home.jsx` completo: hero con siluetas pixel flotantes, sección «¿POR QUÉ ARCADE VAULT?», rail de seis juegos, franja de estadísticas, actividad en vivo (ticker + top jugadores), pricing con FAQ y CTA final.
- Animación de aparición al hacer scroll (`.reveal` → `.in`) vía `IntersectionObserver`.
- Migración de rutas: biblioteca de `/` a `/games`, detalle de `/juegos/[id]` a `/games/[id]`.
- Actualización de todos los enlaces internos afectados (`nav.tsx`, `library-grid.tsx`, `game-player.tsx`, `hall-of-fame.tsx`, `not-found.tsx`, página de detalle).
- Nav con las dos entradas nuevas: «Inicio» (`/`) y «Acerca de» (`/about`), en la barra y en el panel móvil.
- Datos de la landing como mock literal en `lib/home-content.ts`.
- Bloques `HOME PAGE`, `ACTIVITY` y `PRICING` de `references/templates/home-about/styles.css` anexados a `app/globals.css`, con sus `@media`.
- Helper `formatScore()` en `lib/games.ts` para que las cifras se formateen igual en servidor y cliente.

**Fuera de alcance (para futuras specs):**

- La página «Acerca de» (`about.jsx`) y su CSS: bloques `ABOUT PAGE`, `GAMEPAD` y `Theme variants`. Van en la SPEC 03.
- Renombrar `/jugar/[id]` o `/salon`. Se quedan en español; solo migra la rama de juegos.
- Datos reales en el ticker, el top de jugadores o las estadísticas. Son copy de marketing, no telemetría.
- Redirecciones desde las URLs viejas (`/juegos/[id]`). El proyecto no está publicado, no hay enlaces que preservar.
- Suscripciones, pagos o cualquier lógica detrás de la sección de pricing. Es una tarjeta informativa con un CTA a `/auth`.
- Tests automatizados.

---

## Modelo de datos

No hay estructuras persistidas nuevas. La landing solo añade contenido estático tipado en `lib/home-content.ts`, copiado literalmente de los arrays inline de `home.jsx`:

```ts
export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export type HomeFeature = {
  icon: FeatureIconKind;
  title: string;                                   // "JUEGOS CLÁSICOS"
  desc: string;
  color: "cyan" | "yellow" | "magenta" | "green";  // clase del .feature-card
};

export type HomeStat = { n: string; u: string; s: string };   // "12+" / "JUEGOS" / "Y CONTANDO"

export type TickerEntry = {
  player: string;      // "NEONFOX"
  game: string;        // "Caída" — título mostrado, no un Game["id"]
  score: number;
  when: string;        // "hace 2 min" — texto fijo, no se calcula
  color: "cyan" | "magenta" | "yellow" | "green";
};

export type TopPlayer = { rank: number; player: string; score: number };

export type FaqItem = { q: string; a: string };
```

Exportaciones: `HOME_FEATURES` (4), `HOME_STATS` (3), `HOME_TICKER` (7), `HOME_TOP_PLAYERS` (5), `PLAN_FEATURES` (`string[]`, 6 líneas del `.pc-list`) y `HOME_FAQ` (3).

`when` es texto fijo a propósito: calcularlo desde un timestamp haría que servidor y cliente rindieran valores distintos y rompería la hidratación, y además envejecería mal en una página que puede quedarse abierta.

El rail de juegos no lleva mock propio: usa `GAMES.slice(0, 6)` de `lib/games.ts`.

---

## Plan de implementación

1. **Migrar la rama de juegos.** `git mv app/juegos app/games`. En `app/games/[id]/page.tsx`, cambiar el tipo a `PageProps<"/games/[id]">` y el enlace de vuelta de `/` a `/games`. `generateStaticParams()` no cambia. Comprobación: `/games/serpentina` responde y `/juegos/serpentina` da 404.

2. **Mover la biblioteca a `/games`.** Crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` (`<LibraryGrid games={GAMES} />`). Dejar `app/page.tsx` temporalmente vacío o con un marcador; se reemplaza en el paso 6.

3. **Actualizar los enlaces internos.** `components/library-grid.tsx` → `/games/${game.id}`; `components/game-player.tsx` → `/games/${game.id}` y el botón de volver a `/games`; `components/hall-of-fame.tsx` → `/games`; `app/not-found.tsx` → `/games`. Comprobación: `grep -rn "/juegos" app components` no devuelve nada.

4. **`components/nav.tsx`.** Añadir «Inicio» (`/`) al principio y «Acerca de» (`/about`) al final, en la barra y en el panel móvil, siguiendo el orden de `home-about/nav.jsx`. Ampliar `isActive` a `"home" | "biblioteca" | "salon" | "about" | "auth"`: `home` solo con `pathname === "/"`; `biblioteca` con `/games` y sus subrutas más `/jugar/`. El logo pasa a apuntar a `/`.

5. **CSS.** Anexar a `app/globals.css` los bloques `/* ===== HOME PAGE ===== */` (líneas 930–1070 de `home-about/styles.css`), `/* ===== ACTIVITY (leaderboard + ticker) ===== */` (1621–1671) y `/* ===== PRICING ===== */` (1672–1744, hasta el fin de `.faq-a`), con sus `@media` incluidos. **No** copiar `ABOUT PAGE`, `GAMEPAD` ni `Theme variants`. Las reglas que ya existan en `globals.css` (`.fade-in`, `.spinner`) no se duplican.

6. **`lib/home-content.ts`.** Portar los arrays inline de `home.jsx` con los tipos de arriba.

7. **`formatScore()` en `lib/games.ts`.** `Intl.NumberFormat("es-ES")` con instancia única, exportada como `formatScore(n: number): string`. Usarla en la landing en lugar de `toLocaleString`, para que un servidor con otro locale por defecto no genere HTML distinto al del cliente.

8. **`components/home/reveal-section.tsx`** (`"use client"`) — Recibe `className` y `children`, renderiza un `<section className={"reveal " + className}>` y monta el `IntersectionObserver` (`threshold: 0.12`, `unobserve` tras entrar) sobre su propio `ref`, no sobre un `querySelectorAll` global. Es la única isla de cliente de la página.

9. **`components/home/silhouettes.tsx` y `components/home/feature-icon.tsx`** — Server Components. Puertos literales de `FloatingSilhouettes` (8 SVGs, `aria-hidden`) y `FeatureIcon` (4 variantes según `FeatureIconKind`). `strokeWidth` en camelCase, como ya exige JSX.

10. **`app/page.tsx` — la landing.** Server Component que compone las siete secciones. Hero con `<Silhouettes />` y los dos CTA como `next/link` a `/games` y `/auth`. Las secciones 01–04 y la final envueltas en `<RevealSection>`. El rail usa `GAMES.slice(0, 6)` y cada `MiniCard` es un `Link` a `/games/${g.id}`. Ningún `onClick`: todas las navegaciones son enlaces.

11. **Repaso responsive.** Comprobar los cortes propios de la landing: `.feature-grid` a 980 px y 520 px, `.mini-rail` a 1100 px y 600 px, `.stats-inner` y `.home-title` a 720 px, `.activity-grid` a 900 px, `.tick-row` a 520 px, `.pricing-grid` a 900 px.

---

## Criterios de aceptación

- [x] `npm run lint` termina sin errores ni advertencias.
- [x] `npm run build` termina sin errores ni advertencias de hidratación.
- [x] `grep -rn "/juegos" app components` no devuelve resultados.
- [x] `/` muestra el hero con el título en tres líneas y los dos botones «EXPLORAR JUEGOS» y «CREAR CUENTA».
- [x] «EXPLORAR JUEGOS» navega a `/games` y esa ruta muestra el grid con las ocho cards y los cinco chips.
- [x] «CREAR CUENTA» navega a `/auth`.
- [x] `/games/serpentina` muestra el detalle; `/juegos/serpentina` devuelve la pantalla 404.
- [x] La landing muestra las cuatro tarjetas de features con sus iconos pixel y sus cuatro colores.
- [x] El rail muestra exactamente seis juegos y cada uno navega a `/games/<id>`.
- [x] «VER TODOS LOS JUEGOS →» navega a `/games`.
- [x] La sección de actividad muestra las siete filas del ticker y las cinco del top, con las barras de `.tp-fill` decrecientes.
- [x] «VER SALÓN →» navega a `/salon`.
- [x] La sección de pricing muestra el sello «FREE PLAY», las seis líneas del plan y las tres preguntas del FAQ.
- [x] «EMPEZAR GRATIS →» e «INSERTAR MONEDA →» navegan a `/auth` y a `/games` respectivamente.
- [x] Al cargar `/`, las secciones bajo el hero empiezan ocultas y aparecen al hacer scroll (la clase `in` se añade al entrar en viewport).
- [x] El nav muestra cinco entradas: Inicio, Biblioteca, Salón, Acerca de y el botón de sesión.
- [x] En `/` está activa «Inicio»; en `/games`, `/games/<id>` y `/jugar/<id>` está activa «Biblioteca».
- [x] Las cifras del ticker y del top se ven con separador de miles español (`184.220`).
- [x] A 375 px de ancho la landing no produce scroll horizontal y el nav abre el panel lateral.
- [x] `app/globals.css` no contiene ninguna clase `.gp-`, `.about-` ni `.contact-`.

---

## Decisiones

- **Sí:** biblioteca en `/games` y detalle en `/games/[id]`. Grid y detalle en la misma rama, y la portada libre para la landing.
- **No:** dejar el detalle en `/juegos/[id]` mientras el grid pasa a `/games`. Mezclar idiomas dentro de la misma rama de URLs es el tipo de detalle que después nadie recuerda por qué está así.
- **No:** renombrar `/jugar/[id]` ni `/salon`. Ninguna de las dos estorba a esta spec; una migración completa a inglés es una decisión aparte.
- **No:** redirecciones desde `/juegos/*`. Nada está publicado; añadir `redirects` en `next.config` sería arrastrar deuda desde el día uno.
- **Sí:** mock literal para ticker, top y estadísticas. Es copy de una landing. Derivarlo de `seededScores` daría números coherentes con `/salon` pero quitaría el control del texto y no lo haría más verdadero.
- **Sí:** `when` como texto fijo («hace 2 min»). Calcularlo desde un timestamp rompe la hidratación y envejece en una pestaña abierta.
- **Sí:** Server Component con una única isla de cliente (`RevealSection`). Es una landing casi estática; mandar 338 líneas de React al navegador para animar un scroll no se justifica.
- **No:** `useReveal` con `querySelectorAll` global, como el template. Cada sección observa su propio `ref`, que es lo correcto en React y no depende del orden de montaje.
- **No:** reveal por CSS puro con `animation-timeline: view()`. Soporte irregular todavía, y el efecto quedaría distinto al template.
- **Sí:** copiar solo los tres bloques de CSS que usa la landing. El resto entra con la página que lo necesita.
- **Sí:** `formatScore()` compartido. La SPEC 01 ya identificó el riesgo de `toLocaleString` en servidor; la landing es la primera página estática que muestra cifras, así que aquí se cierra.
- **Sí:** enlace «Acerca de» ya en el nav aunque `/about` no exista todavía. El nav se porta una vez, y el 404 arcade es una caída aceptable durante una spec.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| «Acerca de» apunta a `/about`, que no existe hasta la SPEC 03 | Muestra la pantalla 404 arcade, no un error crudo. Se cierra al implementar la SPEC 03. |
| `git mv app/juegos app/games` deja enlaces colgando | El paso 3 lo verifica con un `grep` que además es criterio de aceptación. |
| Colisión de nombres de clase al anexar el CSS (`.active`, `.cyan`, `.btn` aparecen en ambos bloques) | Antes de anexar, comparar los selectores nuevos con los ya presentes en `globals.css` y no duplicar reglas existentes. |
| `IntersectionObserver` no dispara y las secciones quedan invisibles | `.reveal` parte con opacidad reducida, no con `display: none`; aun así, verificar el estado `in` en el navegador antes de dar por cerrada la spec. |
| El hero usa `min-height: calc(100vh - 60px)` y en móvil la barra del navegador descuadra el alto | Es el comportamiento del template. Si molesta, se cambia a `100svh` en un ajuste posterior. |
| Los tipos `PageProps<"/games/[id]">` no resuelven hasta regenerar `.next/types` | Ejecutar `npm run dev` o `npm run build` una vez después del `git mv`. |
