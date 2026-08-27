# SPEC 04 — Cableado base de Supabase

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-08-27
> **Objetivo:** Dejar Supabase conectado al proyecto —clientes de navegador y servidor, `proxy.ts` de refresco de sesión y una ruta de diagnóstico— sin cambiar ninguna pantalla ni crear ninguna tabla.

---

## Por qué existe esta spec

La SPEC 01 montó una sesión falsa: `components/session-provider.tsx` guarda el usuario y las puntuaciones en `localStorage`, y `app/auth/page.tsx` acepta cualquier cosa que escribas. Eso sostuvo el MVP visual, pero no sobrevive al primer despliegue: nadie tiene cuenta, las puntuaciones viven en un solo navegador y el salón de la fama es mock determinista.

Supabase resuelve las tres cosas, pero hacerlo de una sentada mezcla cuatro trabajos distintos: cablear el SDK, sustituir el flujo de auth, diseñar el esquema con RLS y reescribir el salón. Esta spec hace **solo el primero**. Al terminarla la aplicación se ve y se comporta exactamente igual que antes; lo único que cambia es que existe una conexión al proyecto de Supabase, verificable, sobre la que se apoyarán las specs siguientes.

Dos detalles que no salen de la documentación de Supabase tal cual:

- **Next.js 16 renombró `middleware.ts` a `proxy.ts`**, con la función exportada como `proxy`. La documentación de Supabase ya lo refleja; muchos tutoriales no. Aquí se escribe `proxy.ts`.
- **Las claves nuevas de Supabase son `sb_publishable_…`**, no la `anon` JWT heredada. Se usa la publicable, que es la que la documentación actual recomienda y se rota de forma independiente.

---

## Alcance

**Dentro:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Dos variables de entorno públicas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), documentadas en `.env.example` y reales en `.env.local`.
- `lib/supabase/client.ts`: cliente de navegador con `createBrowserClient`.
- `lib/supabase/server.ts`: cliente de servidor con `createServerClient` y `cookies()` de `next/headers`, para Server Components y Route Handlers.
- `lib/supabase/proxy.ts`: helper `updateSession(request)` con el cliente de `proxy`, que refresca el token y reescribe cookies.
- `proxy.ts` en la raíz del proyecto, con `matcher` que excluye estáticos e imágenes.
- `app/api/health/supabase/route.ts`: ruta de diagnóstico que confirma el cableado.
- Ampliar `.env.example` con las dos variables nuevas, junto a las tres de Resend que ya están.

**Fuera de alcance (para futuras specs):**

- **Sustituir la sesión falsa.** `components/session-provider.tsx`, `app/auth/page.tsx` y el estado del nav se quedan tal cual. El login sigue siendo teatro tras esta spec.
- **Registro, inicio de sesión, cierre de sesión y ruta de callback.** La decisión ya tomada para la spec de auth: email + contraseña, con «Confirm email» desactivado en el panel durante el desarrollo. No se implementa aquí.
- **OAuth con Google o GitHub.** Los botones de `/auth` siguen decorativos.
- **Cualquier tabla.** Ni `profiles`, ni `scores`, ni una tabla de humo. El esquema y sus políticas RLS se diseñan en la spec que los use.
- **Migrar las puntuaciones de `localStorage` a la base de datos**, y el salón de la fama que las leería.
- **Proteger rutas.** El `proxy.ts` de esta spec refresca la sesión y nada más: no redirige a nadie, no bloquea ninguna ruta.
- **Tipos generados de la base (`Database`).** Sin tablas no hay nada que generar.
- **Clave secreta (`sb_secret_…`) y cliente de administración.** Ninguna operación de esta spec la necesita.
- **Supabase CLI, stack local con Docker y migraciones versionadas.** Se trabaja contra el proyecto cloud existente.
- Tests automatizados.

---

## Modelo de datos

Esta spec **no introduce ninguna estructura persistida**. No se crean tablas, ni vistas, ni políticas.

Lo único que se define es la configuración de entorno y el contrato de la ruta de diagnóstico.

Variables de entorno, ambas públicas a propósito:

| Variable                               | Ejemplo                                    | Uso                                                                         |
| -------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `https://ovavqjmkteyaigcolbqv.supabase.co` | URL del proyecto. La consumen los tres clientes.                            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_xxx`                       | Clave publicable. Va al navegador por diseño; la protección real es la RLS. |

El prefijo `NEXT_PUBLIC_` es correcto aquí y es el opuesto exacto del criterio de la SPEC 03: las claves de Resend nunca deben salir del servidor, la publicable de Supabase está pensada para salir. Lo que **nunca** lleva `NEXT_PUBLIC_` es la clave secreta, que esta spec no usa.

Contrato de `GET /api/health/supabase`:

```ts
export type SupabaseHealth =
  | { ok: true; url: string; authService: "up"; claims: "none" | "present" }
  | { ok: false; error: "NOT_CONFIGURED" | "UNREACHABLE" };
```

`url` es el host del proyecto, sin la clave. `claims: "present"` solo si hay cookie de sesión válida —tras esta spec siempre será `"none"`, porque todavía no hay forma de iniciar sesión—. `NOT_CONFIGURED` responde 500 y `UNREACHABLE` responde 502.

---

## Plan de implementación

1. **Dependencias y entorno.** `npm install @supabase/supabase-js @supabase/ssr`. Añadir las dos variables a `.env.example` con valores de ejemplo y a `.env.local` con las reales del proyecto (URL y clave publicable se leen del panel, o vía el MCP de Supabase con `get_project_url` y `get_publishable_keys`). Comprobación: `npm run build` sigue pasando y `git status` no muestra `.env.local`.

2. **`lib/supabase/client.ts`.** Exporta `createClient()` que devuelve `createBrowserClient(url, key)`. Sin opciones extra: `createBrowserClient` ya es singleton, así que llamarlo en varios componentes no crea varias instancias. Comprobación: importarlo desde un componente `"use client"` compila.

3. **`lib/supabase/server.ts`.** Exporta `async function createClient()` que hace `const cookieStore = await cookies()` y devuelve `createServerClient(url, key, { cookies: { getAll, setAll } })`. El `setAll` va envuelto en `try/catch`: desde un Server Component escribir cookies lanza, y ese error se ignora a propósito porque el `proxy` ya refresca la sesión. Nunca crear el cliente en una variable de módulo: uno por request.

4. **`lib/supabase/proxy.ts`.** Exporta `async function updateSession(request: NextRequest): Promise<NextResponse>` siguiendo el patrón de la documentación: crea `supabaseResponse = NextResponse.next({ request })`, monta `createServerClient` con `getAll`/`setAll(cookiesToSet, headers)` —el `setAll` escribe en `request.cookies`, recrea `supabaseResponse` y vuelca cookies y `headers` sobre ella—, llama a `await supabase.auth.getClaims()` y devuelve `supabaseResponse`. Tres reglas que la propia documentación marca en mayúsculas y aquí se respetan: no meter código entre `createServerClient` y `getClaims()`, no devolver un `NextResponse` distinto del que llevan las cookies, y **no usar `getSession()` en código de servidor** —no garantiza revalidar el token—.

5. **`proxy.ts` en la raíz.** Exporta `async function proxy(request: NextRequest) { return await updateSession(request); }` y el `config.matcher` que excluye `_next/static`, `_next/image`, `favicon.ico` y los archivos de imagen. Va al mismo nivel que `app/`, no dentro. Comprobación: `npm run dev`, cargar `/` y ver en las DevTools que la respuesta no rompe nada y la página sigue igual.

6. **`app/api/health/supabase/route.ts`.** Route Handler `GET`. Comprueba que las dos variables existen y responde 500 `NOT_CONFIGURED` si falta alguna. Hace `fetch` a `${url}/auth/v1/health` con la cabecera `apikey`; si no responde 200, `console.error` con el detalle y 502 `UNREACHABLE`. Después crea el cliente de `lib/supabase/server.ts`, llama a `getClaims()` y responde 200 con `{ ok: true, url, authService: "up", claims }`. El cuerpo **nunca** incluye la clave. Comprobación: `curl localhost:3000/api/health/supabase` devuelve `{"ok":true,...,"claims":"none"}`.

7. **Repaso de no-regresión.** Recorrer `/`, `/games`, `/games/<id>`, `/jugar/<id>`, `/salon`, `/about` y `/auth` con el `proxy.ts` activo. Nada debe cambiar: el login falso sigue funcionando, las puntuaciones siguen en `localStorage` y el formulario de contacto sigue enviando.

---

## Criterios de aceptación

- [x] `npm run lint` termina sin errores ni advertencias.
- [x] `npm run build` termina sin errores ni advertencias de hidratación.
- [x] `package.json` lista `@supabase/supabase-js` y `@supabase/ssr`.
- [x] `.env.example` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con valores de ejemplo, no reales.
- [x] `git status` no lista `.env.local` como archivo sin seguimiento.
- [x] Existe `proxy.ts` en la raíz del proyecto y **no** existe ningún `middleware.ts`.
- [x] `GET /api/health/supabase` devuelve 200 con `{"ok":true,"authService":"up","claims":"none"}`.
- [x] Con `NEXT_PUBLIC_SUPABASE_URL` vacía, esa ruta devuelve 500 `NOT_CONFIGURED`.
- [x] Con una URL de proyecto inválida, esa ruta devuelve 502 `UNREACHABLE` y no lanza una excepción sin capturar.
- [x] La respuesta de esa ruta no contiene la cadena `sb_publishable_` ni ninguna clave.
- [x] `grep -rn "getSession" lib proxy.ts app` no devuelve resultados.
- [x] `grep -rn "SUPABASE" components app/auth` no devuelve resultados: ninguna pantalla usa Supabase todavía.
- [x] `components/session-provider.tsx` y `app/auth/page.tsx` no tienen ningún cambio respecto a la SPEC 01.
- [x] Iniciar sesión falsa en `/auth` sigue funcionando igual que antes y el nav sigue mostrando el usuario.
- [x] Guardar una puntuación en `/jugar/<id>` sigue persistiendo en `localStorage` y apareciendo en `/salon`.
- [x] `POST /api/contact` sigue funcionando con el `proxy.ts` activo.
- [x] El proyecto de Supabase no tiene ninguna tabla nueva en el esquema `public`.

---

## Decisiones

- **Sí:** una spec solo de cableado, sin tocar pantallas. Decisión del usuario frente a hacer auth completa de golpe. Deja un cambio pequeño y verificable, y evita que un fallo de configuración se confunda con un fallo del flujo de auth.
- **No:** auth, tablas y salón en la misma spec. Son cuatro trabajos con criterios de aceptación distintos; juntos, ninguno se revisa bien.
- **No:** tabla de humo para probar la lectura. La ruta de diagnóstico prueba lo mismo sin dejar basura que borrar después.
- **Sí:** ruta de diagnóstico `GET /api/health/supabase` como prueba del cableado. Decisión del usuario frente a conformarse con `lint` + `build`. Un helper que compila no demuestra que la URL y la clave sean correctas; un `curl` sí.
- **No:** script suelto en `scripts/`. No pasa por Next.js, así que no probaría ni las cookies ni el `proxy`.
- **Sí:** `proxy.ts`, no `middleware.ts`. Next 16 renombró el convenio; `middleware.ts` está deprecado. Escribirlo con el nombre viejo sería nacer con deuda y una advertencia en cada build.
- **Sí:** el `proxy` entra en esta spec y no en la de auth. El helper de servidor asume que alguien refresca el token; montarlo después obligaría a reescribir lo ya hecho.
- **Sí:** el `proxy` solo refresca, no protege rutas. No hay todavía ninguna sesión real que proteger, y una redirección prematura rompería el login falso que aún sostiene la aplicación.
- **Sí:** clave publicable `sb_publishable_…` en lugar de la `anon` JWT heredada. Es la recomendada hoy y se rota sin tocar el resto de claves. La `anon` sigue activa en el proyecto, pero no se usa.
- **Sí:** `getClaims()` en todo el código de servidor. La documentación es explícita: `getSession()` no garantiza revalidar el token, y confiar en él en el servidor es la causa típica de usuarios deslogueados al azar.
- **Sí:** tres archivos separados en `lib/supabase/`. Cada entorno de ejecución —navegador, servidor, proxy— tiene un manejo de cookies distinto; un único archivo con ramas sería más corto y más fácil de usar mal.
- **Sí:** proyecto cloud existente (`ovavqjmkteyaigcolbqv`), sin Supabase CLI ni Docker. Decisión del usuario. Se paga en reproducibilidad, pero esta spec no aplica ninguna migración, así que no hay esquema que versionar todavía.
- **Sí:** usar el MCP de Supabase solo para leer configuración (URL y clave). Nada se escribe en la base durante esta spec.

---

## Riesgos

| Riesgo                                                                                                         | Mitigación                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Se copia el patrón de un tutorial escrito para Next 15 y se crea `middleware.ts`                               | Criterio de aceptación explícito: existe `proxy.ts` y no existe `middleware.ts`. La documentación de Supabase ya usa el nombre nuevo. |
| Devolver desde el `proxy` un `NextResponse` distinto del que lleva las cookies deja sesiones que se caen solas | El paso 4 lo marca como regla; se verifica cuando la spec de auth lo ejercite con una sesión real.                                    |
| Alguien añade código entre `createServerClient` y `getClaims()` en el proxy                                    | Comentario en el propio archivo, copiado de la documentación, explicando por qué ese hueco está prohibido.                            |
| Confundir la clave publicable con la secreta y publicar la secreta con `NEXT_PUBLIC_`                          | Esta spec no usa la clave secreta en absoluto. La publicable está pensada para el navegador; la protección real llegará con la RLS.   |
| `.env.local` acaba commiteado                                                                                  | El `.gitignore` de `create-next-app` cubre `.env*.local`; ya se verificó en la SPEC 03 y es criterio de aceptación aquí.              |
| El `matcher` demasiado amplio hace que el proxy corra en archivos estáticos y penalice cada request            | El `matcher` excluye `_next/static`, `_next/image`, `favicon.ico` e imágenes, como recomienda la documentación.                       |
| Sin tablas ni RLS, la clave publicable expuesta parece un agujero                                              | Hoy no hay nada que leer. La spec que cree la primera tabla debe activar RLS en el mismo paso; queda anotado como su precondición.    |

---

## Lo que **no** entra en esta spec

- Registro, inicio de sesión y cierre de sesión reales.
- OAuth con Google o GitHub.
- Tablas, políticas RLS y tipos generados de la base.
- Migrar las puntuaciones de `localStorage` a la base de datos.
- Protección de rutas por sesión.

Cada una, si llega, en su propia spec.
