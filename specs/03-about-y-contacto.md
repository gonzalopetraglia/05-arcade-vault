# SPEC 03 — Acerca de y formulario de contacto

> **Estado:** Aceptado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-08-26
> **Objetivo:** Portar `references/templates/home-about/about.jsx` a la ruta `/about` y hacer que su formulario envíe un correo real al equipo mediante Resend.

---

## Por qué existe esta spec

La SPEC 02 dejó la entrada «Acerca de» en el nav apuntando a `/about`, una ruta que todavía no existe y que hoy cae en la pantalla 404. Esta spec la crea.

El template `about.jsx` (157 líneas) trae dos secciones —hero con misión y tres *highlights*, y un bloque de contacto con formulario— más el `HighlightIcon` con tres SVG pixel. El formulario del prototipo es teatro: valida que los tres campos no estén vacíos y pinta una terminal de éxito sin mandar nada. Aquí ese envío pasa a ser real contra la API de Resend.

Como en las specs 01 y 02: el diseño no se rediseña, se porta. Lo único que se añade al diseño es el estado de error, que el template no contempla.

---

## Alcance

**Dentro:**

- Ruta nueva `/about` con el port completo de `about.jsx`: hero (kicker, título en degradado, párrafo de misión, tres *highlights* con sus iconos pixel), divisor de píxeles animado y sección de contacto (intro con tres *tips* + formulario).
- Componente `HighlightIcon` con las tres variantes `HEART`, `BROWSER`, `PLANT`.
- Copy de la página en `lib/about-content.ts` (highlights y tips tipados), siguiendo el patrón de `lib/home-content.ts`.
- Bloque `/* ===== ABOUT PAGE ===== */` de `references/templates/home-about/styles.css` (líneas 1071–1150) anexado a `app/globals.css`, con sus `@media`.
- Formulario cliente con los tres estados del template —edición, *shake* de validación, terminal de éxito— más un cuarto estado nuevo: terminal de error.
- Envío real por correo: `POST /api/contact` como Route Handler, que valida el payload y llama a Resend.
- Dependencia nueva `resend` y tres variables de entorno (`RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`), documentadas en `.env.example`.
- Plantilla del correo (HTML + texto plano) en `lib/contact-email.ts`, con `replyTo` apuntando al remitente.
- Animación `.reveal` → `.in` reutilizando `components/home/reveal-section.tsx` de la SPEC 02.

**Fuera de alcance (para futuras specs):**

- Antispam de cualquier tipo: honeypot, rate limit, captcha. Decisión explícita del usuario; el proyecto no está publicado. Se cierra en otra spec antes de desplegar.
- Autorespuesta o acuse de recibo al remitente. Solo se envía un correo, al equipo.
- Persistir los mensajes en base de datos o fichero. El correo es el único destino.
- Los bloques CSS `GAMEPAD` y `Theme variants` de `styles.css`. Pese a lo que anticipaba la SPEC 02, `about.jsx` no usa ninguna clase `.gp-`; pertenecen a otra pantalla del prototipo y entrarán con ella.
- Verificar un dominio en Resend. Es una tarea de cuenta, no de código; hasta que se haga, el envío solo funciona con el remitente de pruebas y hacia la propia dirección del titular.
- Traducción o i18n del copy. Español, como el resto.
- Tests automatizados.

---

## Modelo de datos

No hay nada persistido. Se introducen dos tipos de contenido estático y un contrato de API.

`lib/about-content.ts`:

```ts
export type HighlightIconKind = "HEART" | "BROWSER" | "PLANT";

export type AboutHighlight = {
  icon: HighlightIconKind;
  text: string;                            // "HECHO CON ❤️ PARA JUGADORES"
  color: "cyan" | "magenta" | "green";     // clase del .highlight
};

export type ContactTip = {
  text: string;                            // "RESPUESTA EN 24-48H"
  led: "green" | "yellow" | "magenta";     // .tip-led, .tip-led.y, .tip-led.m
};
```

Exportaciones: `ABOUT_HIGHLIGHTS` (3, en el orden del template: magenta/HEART, cyan/BROWSER, green/PLANT), `ABOUT_TIPS` (3) y `ABOUT_MISSION` (el párrafo de misión como string).

Contrato de `POST /api/contact` (`lib/contact-email.ts` alberga los tipos):

```ts
export type ContactPayload = { name: string; email: string; message: string };

export type ContactResponse =
  | { ok: true }
  | { ok: false; error: "INVALID" | "SEND_FAILED" | "NOT_CONFIGURED" };
```

Límites de validación: `name` 1–80 caracteres, `email` 1–160 y con formato válido, `message` 1–2000. Todo se recorta con `trim()` antes de validar. `INVALID` responde 400, `SEND_FAILED` 502 y `NOT_CONFIGURED` 500.

Variables de entorno, las tres obligatorias en el servidor:

| Variable | Ejemplo | Uso |
| -------- | ------- | --- |
| `RESEND_API_KEY` | `re_xxx` | Autenticación con Resend |
| `CONTACT_TO_EMAIL` | `equipo@arcadevault.gg` | Destinatario del aviso |
| `CONTACT_FROM_EMAIL` | `Arcade Vault <onboarding@resend.dev>` | Remitente. Mientras no haya dominio verificado, el de pruebas de Resend |

Ninguna lleva prefijo `NEXT_PUBLIC_`: no deben llegar al navegador.

---

## Plan de implementación

1. **Dependencia y entorno.** `npm install resend`. Crear `.env.example` con las tres variables y valores de ejemplo, y `.env.local` con las reales (no se commitea; verificar que `.gitignore` ya cubre `.env*.local` —el `.gitignore` de `create-next-app` lo hace—). Comprobación: `npm run build` sigue pasando.

2. **CSS.** Anexar a `app/globals.css` el bloque `/* ===== ABOUT PAGE ===== */` (líneas 1071–1150 de `home-about/styles.css`), incluidos los `@media (max-width: 820px)` y `(max-width: 900px)` y los `@keyframes pxblink` y `shake`. No copiar `GAMEPAD` ni `Theme variants`. Las reglas ya presentes (`.btn`, `.kicker`, `.fade-in`, y el `@keyframes blink` que usa `.caret`) no se duplican. Añadir al final del bloque las reglas nuevas del estado de error, que el template no trae:

   ```css
   .terminal-success.is-error { border-color: var(--magenta); box-shadow: 0 0 22px rgba(255,0,110,0.25); }
   .terminal-success.is-error .term-body .line { color: var(--magenta); }
   .terminal-success.is-error .term-body .success { color: var(--magenta); text-shadow: 0 0 6px rgba(255,0,110,0.45); }
   ```

3. **`lib/about-content.ts`.** Portar los arrays inline de `about.jsx` con los tipos de arriba, texto literal incluido.

4. **`lib/contact-email.ts`.** Exportar `ContactPayload`, `ContactResponse`, `validateContact(input: unknown): ContactPayload | null` (recorta, aplica los límites y la regex de email; devuelve `null` si algo falla) y `buildContactEmail(payload)` que devuelve `{ subject, html, text }`. El asunto: `[Arcade Vault] Mensaje de <nombre>`. El HTML escapa `&`, `<`, `>`, `"` de los tres campos antes de interpolarlos y convierte los saltos de línea del mensaje en `<br>`; la versión `text` va sin escapar. Comprobación: un nombre con `<script>` sale escapado en el HTML.

5. **`app/api/contact/route.ts`.** Route Handler `POST`. Lee el JSON del body, lo pasa por `validateContact` y responde 400 con `INVALID` si vuelve `null`. Comprueba las tres variables de entorno y responde 500 con `NOT_CONFIGURED` si falta alguna. Instancia `new Resend(process.env.RESEND_API_KEY)` y envía con `from: CONTACT_FROM_EMAIL`, `to: CONTACT_TO_EMAIL`, `replyTo: payload.email` y el `subject`/`html`/`text` de `buildContactEmail`. Si Resend devuelve error o lanza, `console.error` con el detalle y responde 502 con `SEND_FAILED` —el mensaje crudo del proveedor no se filtra al cliente—. En éxito, 200 con `{ ok: true }`. Comprobación: `curl -X POST localhost:3000/api/contact` con un body válido devuelve `{"ok":true}` y el correo llega.

6. **`components/about/highlight-icon.tsx`.** Server Component. Port literal de `HighlightIcon` con las tres variantes; `strokeWidth` en camelCase, `aria-hidden` en los SVG.

7. **`components/about/contact-form.tsx`** (`"use client"`). El formulario y sus cuatro estados:
   - `idle`: los tres campos controlados, botón «▶ ENVIAR MENSAJE».
   - Validación vacía en cliente → `shake` durante 400 ms, sin petición.
   - `sending`: botón deshabilitado con texto «ENVIANDO…»; evita el doble envío.
   - `sent`: terminal de éxito del template, con el nombre en mayúsculas y el botón «ENVIAR OTRO MENSAJE» que limpia el formulario.
   - `error`: misma terminal con `is-error`, líneas `[FAIL] No se pudo enviar el mensaje.` y el botón «REINTENTAR», que vuelve a `idle` **conservando lo escrito** —el estado del formulario no se limpia en el camino de error—.

8. **`app/about/page.tsx`.** Server Component con `metadata` (título «Acerca de — Arcade Vault»). Compone el hero (`ABOUT_MISSION`, `ABOUT_HIGHLIGHTS` con su `transitionDelay` escalonado de 80 ms), el divisor de 24 píxeles envuelto en `<RevealSection className="about-divider">` y la sección de contacto, también en `<RevealSection>`, con la intro (`ABOUT_TIPS`) y `<ContactForm />`. Sin `useEffect` de `IntersectionObserver` propio: lo aporta `RevealSection`.

9. **Repaso responsive y de nav.** Comprobar `.highlight-row` a 820 px y `.contact-grid` a 900 px, y que en `/about` el nav marca activa la entrada «Acerca de» —ya contemplada en el `isActive` de la SPEC 02—.

---

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores ni advertencias.
- [ ] `npm run build` termina sin errores ni advertencias de hidratación.
- [ ] `/about` responde 200 y ya no cae en la pantalla 404.
- [ ] El nav marca «Acerca de» como entrada activa en `/about`.
- [ ] El hero muestra el kicker «▸ ACERCA DE», el título en degradado, el párrafo de misión y los tres highlights con sus iconos pixel y sus colores (magenta, cyan, verde).
- [ ] El divisor muestra 24 píxeles parpadeando con retardo escalonado.
- [ ] La sección de contacto muestra los tres tips con sus LED verde, amarillo y magenta.
- [ ] Enviar con cualquiera de los tres campos vacío dispara el `shake` y **no** genera petición de red.
- [ ] Un envío válido con las variables de entorno configuradas devuelve 200, pinta la terminal verde con el nombre en mayúsculas y el correo llega a `CONTACT_TO_EMAIL`.
- [ ] Ese correo tiene como asunto `[Arcade Vault] Mensaje de <nombre>` y responder a él escribe a la dirección que puso el usuario.
- [ ] Con `RESEND_API_KEY` vacía, el endpoint devuelve 500 `NOT_CONFIGURED` y la interfaz pinta la terminal de error, no la de éxito.
- [ ] Con la clave inválida, el endpoint devuelve 502 `SEND_FAILED` y la interfaz pinta la terminal de error.
- [ ] Desde la terminal de error, «REINTENTAR» vuelve al formulario con los tres campos tal y como estaban.
- [ ] Un `POST /api/contact` con `message` de 2001 caracteres devuelve 400 `INVALID`.
- [ ] Un `POST /api/contact` con `email` sin `@` devuelve 400 `INVALID`.
- [ ] Un nombre con `<script>alert(1)</script>` llega escapado en el HTML del correo.
- [ ] Durante el envío el botón está deshabilitado y pulsarlo dos veces no manda dos correos.
- [ ] Al cargar `/about`, el divisor y la sección de contacto empiezan ocultos y aparecen al hacer scroll.
- [ ] A 375 px de ancho `/about` no produce scroll horizontal.
- [ ] `app/globals.css` no contiene ninguna clase `.gp-`.
- [ ] `grep -rn "RESEND_API_KEY" components app/about` no devuelve resultados (la clave nunca toca el cliente).

---

## Decisiones

- **Sí:** Route Handler `POST /api/contact`. Decisión del usuario frente a la Server Action. Deja el envío detrás de un contrato HTTP explícito y verificable con `curl`, a costa de un endpoint público y del `fetch` manual en el cliente.
- **No:** Server Action. Habría evitado el endpoint público y dado *progressive enhancement*, pero se descartó a favor del contrato HTTP.
- **Sí:** las tres direcciones y la clave por variables de entorno, con `.env.example` en el repo. Nada de correos hardcodeados; el `.env.example` es lo que hace reproducible el arranque en otra máquina.
- **Sí:** estado de error con terminal en rojo reutilizando `.terminal-success` más un modificador. El template solo contempla el éxito, y un formulario que llama a un tercero necesita decir cuándo ese tercero falló. Reutilizar la terminal mantiene la estética y cuesta tres reglas CSS.
- **No:** banner de error sobre el formulario, ni el `shake` genérico como única señal de fallo de envío. El `shake` ya significa «rellena los campos»; darle un segundo significado deja al usuario sin saber qué pasó.
- **Sí:** el camino de error conserva lo escrito. Perder un mensaje largo porque la API del proveedor tuvo un mal minuto es la peor forma de fallar.
- **No:** antispam en esta spec —ni honeypot, ni rate limit, ni captcha—. Decisión explícita del usuario. Es asumible mientras el proyecto no esté publicado, pero un endpoint de correo abierto es un coste real en cuanto se despliegue: queda anotado en riesgos.
- **No:** autorespuesta al remitente. Un solo envío por mensaje. Sin dominio verificado, un correo a un tercero ni sale de Resend, así que la funcionalidad sería invisible hasta ese momento.
- **Sí:** validación manual en TypeScript en vez de Zod. Tres campos con reglas triviales no justifican la primera dependencia no-framework del proyecto.
- **Sí:** plantilla HTML + texto plano escrita a mano en `lib/contact-email.ts`, en lugar de `@react-email/components`. Un único correo interno no paga dos dependencias más.
- **Sí:** `replyTo` con el correo del usuario. Permite responder desde el cliente de correo sin copiar direcciones a mano; es la razón por la que se pide el campo.
- **Sí:** escapar los campos en el HTML del correo. El contenido lo escribe un desconocido y termina renderizado en el cliente de correo del equipo.
- **Sí:** copy en `lib/about-content.ts`, como hizo la SPEC 02 con `lib/home-content.ts`. Un patrón ya establecido en el proyecto.
- **Sí:** reutilizar `RevealSection` de la SPEC 02 en lugar del `useEffect` global del template. Mismo argumento que allí: cada sección observa su propio `ref`.
- **No:** portar los bloques `GAMEPAD` ni `Theme variants` pese a lo que anunciaba la SPEC 02. Se revisó `about.jsx`: no usa ninguna clase `.gp-`. La SPEC 02 los asignó a esta por error.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Endpoint de correo sin ningún antispam: un bot puede vaciar la cuota de Resend o inundar el buzón del equipo | Aceptado por decisión explícita mientras el proyecto no esté publicado. Debe cerrarse (honeypot + rate limit como mínimo) en una spec previa al despliegue. |
| Sin dominio verificado en Resend, el remitente de pruebas solo entrega a la dirección del titular de la cuenta | `CONTACT_TO_EMAIL` apunta a esa dirección durante el desarrollo. El criterio de aceptación del correo se verifica con ella. |
| Las variables de entorno faltan en producción y el formulario falla en silencio | El endpoint devuelve `NOT_CONFIGURED` y la interfaz lo hace visible; además queda como criterio de aceptación. |
| La respuesta de Resend cambia de forma y el `console.error` es lo único que queda del fallo | Se registra el objeto completo del error en servidor; el cliente solo ve el código. Suficiente para un formulario de contacto. |
| Copiar el bloque CSS del about pisa reglas ya presentes (`.btn.press`, `.divider`, `@keyframes shake`) | Antes de anexar, comparar los selectores nuevos con los de `globals.css` y no duplicar. |
| El divisor de 24 píxeles con `animationDelay` inline hace que servidor y cliente rindan estilos distintos | El retardo se calcula del índice del `map`, no de nada dinámico: es determinista y no rompe la hidratación. |
| `.env.local` acaba commiteado con la clave real | `.gitignore` de `create-next-app` ya cubre `.env*.local`; verificarlo en el paso 1 antes de escribir la clave. |
