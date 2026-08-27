# SPEC 06 — Leaderboard real y tabla de juegos

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 04, SPEC 05
> **Fecha:** 2026-08-27
> **Objetivo:** Llevar el catálogo y las puntuaciones a Supabase con RLS, servirlos por una API propia (`/api/games`, `/api/scores`), convertir el salón de la fama en un ranking real y añadir a `/games` una vista de tabla ordenable junto a las tarjetas.

---

## Por qué existe esta spec

La SPEC 04 dejó Supabase cableado y sin una sola tabla. La SPEC 05 dejó un juego real que genera puntuaciones reales… y las guarda en `localStorage`, donde nadie más las ve. El salón de la fama sigue siendo `seededScores()`: doce filas deterministas generadas a partir de la longitud del `id` del juego. Es decir: hay partidas de verdad, hay base de datos conectada, y entre las dos no hay nada.

Esta spec cierra ese hueco. Crea las dos tablas que faltan, mueve el catálogo a la base, hace que el modal de fin de partida escriba en Postgres a través de un Route Handler que valida, y reescribe `/salon` para que muestre lo que realmente ha ocurrido. De paso, ya que las métricas (`best`, `plays`) pasan a calcularse de las puntuaciones reales, `/games` gana una vista de tabla donde esos números se pueden comparar y ordenar, cosa que la cuadrícula de portadas no permite.

Tres consecuencias que conviene aceptar antes de empezar:

- **La biblioteca se queda casi vacía de números.** `best` y `plays` dejan de ser los 28.450 puntos y las 12.4K partidas inventadas del MVP visual y pasan a ser `MAX(score)` y `COUNT(*)`. Los ocho juegos simulados mostrarán lo poco que el simulacro haya generado, y ASTEROIDES lo que la gente juegue de verdad. Es el precio de dejar de mentir.
- **Entra la clave secreta de Supabase.** La SPEC 04 la dejó explícitamente fuera. Aquí hace falta: la RLS deniega el `INSERT` a todo el mundo, así que solo el servidor, con `sb_secret_…`, puede escribir puntuaciones.
- **`/games` y `/salon` pasan a ser componentes cliente.** Al servirse los datos por Route Handlers propios, las pantallas hacen `fetch` y tienen estados de carga y error. `app/games/[id]/page.tsx` mantiene su `generateStaticParams` leyendo el seed de `lib/games.ts`, para no volver dinámicas nueve rutas de detalle.

---

## Alcance

**Dentro:**

- Tablas `public.games` y `public.scores` en el proyecto cloud de Supabase, con RLS activada.
- Vista `public.game_stats` (`game_id`, `best`, `plays`) con `security_invoker = true`.
- Migraciones aplicadas por el MCP de Supabase (`apply_migration`) y guardadas también en `supabase/migrations/` para que el esquema quede versionado en git.
- Seed de los nueve juegos de `GAMES` en la tabla `games`, dentro de la misma migración.
- Variable de entorno `SUPABASE_SECRET_KEY` (sin `NEXT_PUBLIC_`) y `lib/supabase/admin.ts` con el cliente de servicio, solo para el `INSERT` de puntuaciones.
- `GET /api/games`: catálogo con métricas derivadas.
- `GET /api/scores?game=<id>&limit=<n>`: top de un juego.
- `POST /api/scores`: alta de puntuación validada (juego existente, score entero en rango, nombre saneado, límite de frecuencia por IP).
- `components/session-provider.tsx`: `saveScore` pasa a llamar a `POST /api/scores` y deja de escribir `av_scores`.
- `/salon` reescrito sobre datos reales: pestañas por juego, podio 1-3 y top 10, con estado vacío cuando el juego no tiene puntuaciones.
- `/games`: conmutador CUADRÍCULA / TABLA. La tabla lista título, categoría, mejor puntuación y partidas, ordenable por columna.
- `lib/games.ts` se queda como fuente del seed y de los tipos (`Game`, `GameCategory`, `GameColor`, `CATS`); `seededScores` y `ScoreRow` se eliminan.

**Fuera de alcance (para futuras specs):**

- **Auth real.** El nombre del jugador sigue saliendo de la sesión falsa (`av_user` en `localStorage`) o del campo del modal. No hay `user_id`, ni `profiles`, ni propiedad verificada de una puntuación.
- **Panel de administración del catálogo.** Los juegos se siembran por migración; no hay CRUD ni interfaz para editarlos.
- **Portar los otros ocho juegos.** Siguen con el simulacro de la SPEC 05, que ahora escribirá sus puntuaciones falsas en la base como cualquier otra.
- **Antifraude serio.** Sin auth no hay forma de impedir que alguien llame a la API con una puntuación inventada. El tope por juego y el límite por IP cortan el spam trivial, nada más.
- **Realtime.** El salón no se actualiza solo: se refresca al montar y tras guardar.
- **Paginación e histórico.** Top 10 por juego y punto; no hay «ver más», ni ranking global, ni evolución temporal.
- **Migrar las puntuaciones de `av_scores`.** Lo ya guardado en cada navegador se abandona.
- **Borrar o editar puntuaciones.** La API solo lee e inserta.
- Tests automatizados.

---

## Modelo de datos

### Tabla `public.games`

| Columna      | Tipo          | Notas                                                       |
| ------------ | ------------- | ----------------------------------------------------------- |
| `id`         | `text` PK     | El mismo slug que hoy: `asteroides`, `serpentina`, …        |
| `title`      | `text`        | No nulo                                                     |
| `short`      | `text`        | No nulo                                                     |
| `long`       | `text`        | No nulo                                                     |
| `cat`        | `text`        | `check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS'))`     |
| `cover`      | `text`        | Clase CSS existente (`cover-rocas`, …)                      |
| `color`      | `text`        | `check (color in ('cyan','magenta','yellow','green'))`      |
| `sort_order` | `int`         | Orden de la biblioteca; conserva el orden actual de `GAMES` |
| `created_at` | `timestamptz` | `default now()`                                             |

### Tabla `public.scores`

| Columna       | Tipo          | Notas                                                        |
| ------------- | ------------- | ------------------------------------------------------------ |
| `id`          | `uuid` PK     | `default gen_random_uuid()`                                  |
| `game_id`     | `text`        | `references public.games(id) on delete cascade`, no nulo     |
| `player_name` | `text`        | No nulo, `check (char_length(player_name) between 1 and 10)` |
| `score`       | `int`         | No nulo, `check (score >= 0)`                                |
| `created_at`  | `timestamptz` | `default now()`                                              |

Índice `scores_game_score_idx on public.scores (game_id, score desc, created_at asc)`: es exactamente la consulta del salón, y el `created_at` ascendente hace que, a igualdad de puntuación, gane quien la consiguió antes.

### Vista `public.game_stats`

```sql
create view public.game_stats
with (security_invoker = true) as
select g.id as game_id,
       coalesce(max(s.score), 0) as best,
       count(s.id) as plays
from public.games g
left join public.scores s on s.game_id = g.id
group by g.id;
```

`security_invoker = true` es obligatorio: sin él la vista se ejecutaría con los permisos de su propietario y se saltaría la RLS de las tablas que agrega.

### RLS

Ambas tablas con `enable row level security`. Políticas:

- `games`: `select` permitido a `anon` y `authenticated` (`using (true)`). Nada más.
- `scores`: `select` permitido a `anon` y `authenticated` (`using (true)`). **Ninguna política de `insert`, `update` ni `delete`**, así que la clave publicable no puede escribir. El `INSERT` lo hace el servidor con la clave secreta, que salta la RLS.

### Variables de entorno

| Variable                               | Prefijo público | Uso                                              |
| -------------------------------------- | --------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Sí (ya existe)  | Los cuatro clientes                              |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí (ya existe)  | Lectura desde navegador, servidor y proxy        |
| `SUPABASE_SECRET_KEY`                  | **No**          | Solo `lib/supabase/admin.ts`, solo para insertar |

### Contratos de la API

```ts
// GET /api/games
export type GameWithStats = Game & { best: number; plays: number };
type GamesResponse = { ok: true; games: GameWithStats[] } | { ok: false; error: string };

// GET /api/scores?game=<id>&limit=<n>   (limit: 1..50, por defecto 10)
export type ScoreEntry = {
  id: string;
  rank: number; // calculado en el handler sobre el orden devuelto
  name: string; // player_name
  score: number;
  at: string; // created_at en ISO
};
type ScoresResponse = { ok: true; scores: ScoreEntry[] } | { ok: false; error: string };

// POST /api/scores   body: { game: string; score: number; name: string }
type PostScoreResponse =
  | { ok: true; entry: ScoreEntry }
  | { ok: false; error: "INVALID_BODY" | "UNKNOWN_GAME" | "RATE_LIMITED" | "DB_ERROR" };
```

Códigos: `INVALID_BODY` y `UNKNOWN_GAME` → 400, `RATE_LIMITED` → 429, `DB_ERROR` → 500. `plays` viaja como número; el formato «12.4K» desaparece, y en la interfaz se muestra con `toLocaleString("es-ES")`.

El tipo `Game` sigue siendo el de `lib/games.ts`, pero pierde los campos `best` y `plays`: ahora llegan de `game_stats` y se componen en `GameWithStats`.

### Reglas de validación del `POST`

1. `game` debe existir en `games`. La comprobación se hace contra la tabla, no contra el array del seed.
2. `score` entero, `>= 0` y `<= 10_000_000`. Tope único para todos los juegos: es un cortacircuitos contra el desbordamiento, no un balanceo por juego.
3. `name`: se recorta, se pasa a mayúsculas, se limita a 10 caracteres y se filtra a `[A-Z0-9 ÁÉÍÓÚÜÑ.-]`. Si queda vacío, `INVALID_BODY`. Es la misma regla que ya aplica `signIn` en el `session-provider`, ahora también en el servidor.
4. Límite de frecuencia: 10 inserciones por minuto y IP, en un `Map` en memoria del módulo, con la IP tomada de `x-forwarded-for`. Se asume su limitación —no sobrevive a un reinicio ni se comparte entre instancias— y se documenta en el propio archivo.

---

## Plan de implementación

1. **Migración del esquema.** Escribir `supabase/migrations/0001_games_scores.sql` con las dos tablas, el índice, la vista `game_stats`, la activación de RLS y las políticas de solo lectura. Aplicarla con el MCP (`apply_migration`). Comprobación: `list_tables` muestra `games` y `scores` con RLS activada, y `get_advisors` no señala ninguna tabla sin RLS ni ninguna vista con `security definer`.

2. **Seed del catálogo.** Segunda migración, `0002_seed_games.sql`, con los nueve `insert` derivados de `GAMES` —los ocho del MVP más `asteroides`—, cada uno con su `sort_order` según el orden actual del array, y `on conflict (id) do nothing` para que sea reejecutable. Comprobación: `select count(*) from games` devuelve 9 y `select id from games order by sort_order` coincide con el orden de `lib/games.ts`.

3. **Clave secreta y cliente de administración.** Añadir `SUPABASE_SECRET_KEY` a `.env.local` (valor real, leído del panel) y a `.env.example` (valor de ejemplo, con el comentario de que **nunca** lleva `NEXT_PUBLIC_`). Crear `lib/supabase/admin.ts` que exporta `createAdminClient()` con `createClient(url, secret, { auth: { persistSession: false } })` y un comentario en la primera línea advirtiendo de que este archivo no debe importarse jamás desde un componente cliente. Comprobación: `grep -rn "SUPABASE_SECRET_KEY" app components` solo aparece en Route Handlers.

4. **`GET /api/games`.** Route Handler que, con el cliente de servidor (clave publicable), lee `games` ordenado por `sort_order` y `game_stats`, une ambas por `game_id` y responde `GameWithStats[]`. Sin caché (`export const dynamic = "force-dynamic"`), porque las métricas cambian con cada partida. Comprobación: `curl localhost:3000/api/games` devuelve nueve juegos con `best` y `plays` numéricos.

5. **`GET /api/scores`.** Lee `game` y `limit` de la query, valida `limit` en 1..50 con 10 por defecto, consulta `scores` filtrando por `game_id` con `order by score desc, created_at asc` y `limit`, y numera el `rank` en el propio handler. Si falta `game`, 400. Comprobación: `curl "localhost:3000/api/scores?game=asteroides"` devuelve `{"ok":true,"scores":[]}` mientras no haya nada guardado.

6. **`POST /api/scores`.** Aplica las cuatro reglas de validación en el orden en que están escritas —el límite por IP primero, para no consultar la base en una ráfaga—, inserta con el cliente de administración y devuelve la entrada creada con su `rank` recalculado. Comprobación: un `curl` con `score: -1` responde 400 `INVALID_BODY`; uno con `game: "no-existe"` responde 400 `UNKNOWN_GAME`; once seguidos correctos, el undécimo responde 429.

7. **Prueba de la RLS.** Desde el navegador, con el cliente publicable, intentar `insert` en `scores` y comprobar que lo rechaza. Comprobación: la operación devuelve error de política y la fila no aparece. Es el criterio que demuestra que el paso 6 es la única puerta de escritura.

8. **`saveScore` contra la API.** En `components/session-provider.tsx`, `saveScore` pasa a ser `async` y hace `POST /api/scores`. Deja de escribir y de leer `av_scores`; `scores` sale del contexto, junto con el tipo `SavedScore`. `av_user` no se toca. Los consumidores del modal reciben el resultado para poder mostrar un error si el guardado falla, en vez de cerrar el modal como si hubiera ido bien. Comprobación: guardar una puntuación en `/jugar/asteroides` y verla con `curl "localhost:3000/api/scores?game=asteroides"`.

9. **Salón real.** Reescribir `components/hall-of-fame.tsx`: al montar y al cambiar de pestaña, `fetch` a `/api/scores?game=<id>&limit=10`. El podio usa las tres primeras filas y la tabla las diez. Tres estados explícitos: cargando (esqueleto o cartel `CARGANDO…`), vacío (`AÚN NADIE HA JUGADO A ESTE JUEGO`) y error (`NO SE PUDO CARGAR EL SALÓN`, con botón de reintentar). Con menos de tres filas el podio se rellena con huecos, no con nombres inventados. Eliminar `seededScores` y `ScoreRow` de `lib/games.ts`. Sin CSS nuevo salvo lo mínimo para los estados; se reutilizan `hall-tabs`, `podium` y la tabla que ya existen.

10. **`GET` del catálogo en la biblioteca.** `app/games/page.tsx` pasa a montar un componente cliente que hace `fetch` a `/api/games` con sus estados de carga y error. `library-grid.tsx` deja de recibir `GAMES` por props y pasa a recibir `GameWithStats[]`. `app/games/[id]/page.tsx` **no cambia de estrategia**: sigue generando las nueve rutas estáticas desde el seed de `lib/games.ts`; solo lee `best` y `plays` de `/api/games` si los muestra. Comprobación: `/games` sigue mostrando nueve tarjetas y `/games/asteroides` sigue siendo estática.

11. **Vista de tabla en `/games`.** Conmutador CUADRÍCULA / TABLA sobre los filtros de categoría existentes, con la elección recordada en `localStorage` (`av_games_view`). La tabla tiene cuatro columnas —JUEGO, CATEGORÍA, MEJOR, PARTIDAS— con encabezados que ordenan al pulsarlos, ascendente y descendente, y una fila por juego enlazada a `/games/<id>`. Respeta el filtro de categoría activo. En pantallas estrechas, la tabla desplaza horizontalmente dentro de su propio contenedor; la página no. Comprobación: ordenar por MEJOR coloca arriba el juego con la puntuación más alta de la base, y el filtro SHOOTER deja solo los juegos de esa categoría en las dos vistas.

12. **Repaso final.** Recorrer `/`, `/games` en las dos vistas, `/games/asteroides`, `/jugar/asteroides`, `/jugar/serpentina`, `/salon`, `/about` y `/auth`. Jugar una partida real de Asteroides, guardarla, verla aparecer en el salón y comprobar que `plays` de ASTEROIDES ha subido en uno en la tabla de `/games`.

---

## Criterios de aceptación

- [x] `npm run lint` termina sin errores ni advertencias.
- [x] `npm run build` termina sin errores ni advertencias de hidratación.
- [x] `list_tables` muestra `public.games` y `public.scores`, ambas con RLS activada.
- [x] `get_advisors` no reporta tablas sin RLS ni vistas `security definer`.
- [x] `supabase/migrations/` contiene el SQL de las dos migraciones y está commiteado.
- [x] `select count(*) from games` devuelve 9 y el orden por `sort_order` coincide con `lib/games.ts`.
- [x] Reejecutar la migración de seed no duplica ninguna fila.
- [x] `.env.example` incluye `SUPABASE_SECRET_KEY` con valor de ejemplo y sin prefijo `NEXT_PUBLIC_`.
- [x] `grep -rn "SUPABASE_SECRET_KEY" components lib/supabase/client.ts` no devuelve resultados.
- [x] Ninguna respuesta de la API contiene la cadena `sb_secret_`.
- [x] `GET /api/games` devuelve nueve juegos, cada uno con `best` y `plays` numéricos.
- [x] `GET /api/scores?game=asteroides` devuelve las puntuaciones de ese juego ordenadas de mayor a menor, con `rank` empezando en 1.
- [x] `GET /api/scores` sin parámetro `game` responde 400.
- [x] `POST /api/scores` con `score: -1`, con `score: 20000000` o sin `name` responde 400 `INVALID_BODY`.
- [x] `POST /api/scores` con un `game` inexistente responde 400 `UNKNOWN_GAME`.
- [x] `POST /api/scores` con `name: "  ana lópez  "` guarda `ANA LÓPEZ` recortado a 10 caracteres.
- [x] La undécima petición correcta desde la misma IP en un minuto responde 429 `RATE_LIMITED`.
- [x] Un `insert` en `scores` con la clave publicable desde el navegador es rechazado por la RLS y no crea ninguna fila.
- [x] `grep -rn "av_scores\|seededScores\|SavedScore" app components lib` no devuelve resultados.
- [x] Guardar una puntuación en el modal de fin de partida la inserta en la base y aparece en `/salon` sin recargar la página a mano.
- [x] Si el `POST` falla, el modal muestra un error y no finge que se guardó.
- [x] Iniciar sesión falsa en `/auth` sigue funcionando y `av_user` sigue en `localStorage`.
- [x] `/salon` muestra el podio y el top 10 reales del juego seleccionado.
- [x] Un juego sin puntuaciones muestra el estado vacío, no filas inventadas ni un podio con nombres.
- [x] Con la API caída, `/salon` y `/games` muestran su estado de error con opción de reintentar, sin pantalla en blanco.
- [x] `/games` muestra nueve tarjetas en la vista de cuadrícula, con `best` y `plays` procedentes de la base.
- [x] El conmutador CUADRÍCULA / TABLA cambia de vista y la elección sobrevive a una recarga.
- [x] Pulsar el encabezado MEJOR ordena la tabla por puntuación, y volver a pulsarlo invierte el orden.
- [x] El filtro de categoría se aplica igual en las dos vistas.
- [x] En un móvil emulado, la tabla desplaza horizontalmente dentro de su contenedor y la página no.
- [x] `/games/asteroides` sigue siendo una ruta estática generada desde el seed.
- [x] `/jugar/asteroides` y `/jugar/serpentina` siguen jugándose igual que en la SPEC 05.
- [x] `proxy.ts` y `GET /api/health/supabase` siguen funcionando como en la SPEC 04.

---

## Decisiones

- **Sí:** tablas reales en Supabase para catálogo y puntuaciones. Decisión del usuario frente a quedarse en `localStorage` y mejorar solo la interfaz. Es lo que la SPEC 04 dejó preparado y sin lo cual el salón nunca deja de ser atrezo.
- **Sí:** la base manda y `lib/games.ts` sobrevive como seed y como origen de los tipos. Decisión del usuario frente a borrarlo. El seed tiene que venir de algún sitio, `generateStaticParams` necesita la lista en tiempo de build, y mantener los tipos en TypeScript evita generar el tipo `Database` en esta spec.
- **Sí:** `best` y `plays` derivados de `scores` mediante la vista `game_stats`. Decisión del usuario frente a migrar los números inventados como columnas. Se asume que la biblioteca se ve pobre al principio; a cambio, nada de lo que muestra es falso.
- **No:** columnas `base_best`/`base_plays` decorativas por encima de las reales. Es la opción que mejor se ve y la que peor se explica seis meses después.
- **Sí:** insert por Route Handler con clave secreta, y RLS que deniega el `INSERT` a la clave publicable. Decisión del usuario frente a `INSERT` público con RLS. Con la clave publicable en el navegador, una política de insert abierta convierte cualquier validación del servidor en decorativa: bastaría con llamar a Supabase directamente.
- **Sí:** entra `SUPABASE_SECRET_KEY`, que la SPEC 04 dejó fuera. Es la consecuencia directa de la decisión anterior y vive en un único archivo, `lib/supabase/admin.ts`, para que sea trivial auditar quién la usa.
- **No:** clave secreta también para leer. Dejaría la RLS sin ejercitar y convertiría cualquier error del handler en una fuga completa.
- **Sí:** las tres reglas de validación en el `POST` —juego y score, nombre saneado, límite por IP—. Decisión del usuario. El límite en memoria se sabe imperfecto en serverless; se acepta como cortacircuitos contra el spam trivial, no como antifraude.
- **Sí:** tope de 10.000.000 puntos, único para todos los juegos. Un tope por juego exigiría calibrar nueve números, ocho de ellos de un simulacro que no significa nada.
- **Sí:** las puntuaciones de `av_scores` se abandonan. Decisión del usuario frente a migrarlas al primer acceso. Son datos de un simulacro repartidos por navegadores, sin forma de deduplicarlos, y el coste de migrarlos supera lo que valen.
- **Sí:** `saveScore` deja de escribir en `localStorage`. Con dos fuentes, el salón y el navegador divergirían al primer fallo de red y no habría forma de saber cuál es la buena.
- **Sí:** fuera el mock `seededScores`, con estado vacío honesto. Decisión del usuario frente a sembrar puntuaciones falsas en la base. Falsos en la base son indistinguibles de reales y habría que limpiarlos después.
- **Sí:** Route Handlers propios como capa de datos, y páginas cliente que hacen `fetch`. Decisión del usuario frente a Server Components leyendo Supabase directamente. Deja un único punto de entrada a los datos —el mismo que usa el modal para escribir— a cambio de estados de carga en `/games` y `/salon`.
- **No:** hacer `fetch` a la propia API desde un Server Component. Sería una petición HTTP contra uno mismo; si alguna pantalla necesita rendirse en servidor, usará el cliente de servidor directamente.
- **Sí:** `app/games/[id]/page.tsx` sigue estática desde el seed. Volverla dinámica por un `best` y un `plays` cambiaría nueve rutas de detalle a cambio de dos números.
- **Sí:** podio 1-3 más top 10 por juego, sin pestaña global. Decisión del usuario. Comparar 184.220 puntos de CAÍDA con 2.400 de ASTEROIDES no dice nada de nadie.
- **Sí:** vista de tabla conviviendo con las tarjetas en `/games`, con conmutador. Decisión del usuario frente a una ruta nueva o a sustituir la cuadrícula. La cuadrícula de portadas es el MVP visual de la SPEC 01 y no se sacrifica; la tabla existe porque ahora hay números que merece la pena ordenar.
- **Sí:** `sort_order` en `games`. Sin él, el orden de la biblioteca dependería del `id` o de la fecha de inserción, y el catálogo perdería la secuencia con la que se diseñó.
- **Sí:** `security_invoker = true` en `game_stats`. Sin ese ajuste, una vista es un agujero en la RLS de las tablas que agrega y el advisor lo marca.
- **Sí:** migraciones por el MCP y también en `supabase/migrations/`. Decisión del usuario. La SPEC 04 descartó la CLI y Docker; guardar el SQL en el repo recupera el versionado sin recuperar la infraestructura.
- **Sí:** `plays` viaja como número, no como `"12.4K"`. El formato es cosa de la interfaz; una cadena en la API impediría ordenar la tabla por esa columna.

---

## Riesgos

| Riesgo                                                                                               | Mitigación                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La clave secreta acaba importada desde un componente cliente y viaja al navegador                    | Vive solo en `lib/supabase/admin.ts`, con aviso en la primera línea; criterio de aceptación por `grep` y comprobación de que ninguna respuesta contiene `sb_secret_`.   |
| Sin auth, cualquiera hace `POST /api/scores` con una puntuación inventada                            | Asumido y declarado fuera de alcance. Validación de rango y límite por IP cortan lo trivial; el antifraude real llega con la spec de auth.                              |
| El límite por IP en memoria no funciona en serverless con varias instancias                          | Aceptado y documentado en el archivo. Es un cortacircuitos, no una garantía.                                                                                            |
| La biblioteca queda con todo a cero y parece rota                                                    | El estado vacío es explícito («AÚN NADIE HA JUGADO»), no un 0 suelto. Es una decisión consciente, no un fallo.                                                          |
| Al pasar `/games` y `/salon` a cliente aparece un parpadeo de carga donde antes había HTML inmediato | Estados de carga explícitos en vez de pantalla en blanco, y `/games/<id>` se mantiene estática para que la ruta más visitada no pierda el render inmediato.             |
| La vista `game_stats` sin `security_invoker` se salta la RLS                                         | Se crea con `security_invoker = true` y se verifica con `get_advisors` como criterio de aceptación.                                                                     |
| Quitar `scores` del contexto de sesión rompe algún consumidor que hoy lo lee                         | El paso 8 recorre los consumidores; el `grep` de `SavedScore` y `av_scores` sin resultados es criterio de aceptación.                                                   |
| Un fallo de red al guardar deja al jugador creyendo que su puntuación está en el salón               | `saveScore` devuelve el resultado y el modal muestra el error en vez de cerrarse; criterio de aceptación explícito.                                                     |
| El simulacro de los ocho juegos empieza a ensuciar la base con puntuaciones sin sentido              | Asumido: hasta que se porten, sus puntuaciones son tan reales como su juego. Las filas son borrables y `on delete cascade` las limpia si algún día desaparece un juego. |
| `on conflict do nothing` en el seed oculta cambios posteriores del catálogo                          | Aceptado: el seed siembra, no sincroniza. Cualquier cambio del catálogo será su propia migración.                                                                       |
| El orden de la tabla y el de la cuadrícula divergen y confunden                                      | La cuadrícula ordena siempre por `sort_order`; la tabla solo cambia de orden cuando el usuario pulsa un encabezado, y arranca también por `sort_order`.                 |

---

## Lo que **no** entra en esta spec

- Auth real, perfiles y puntuaciones atribuidas a un usuario verificado.
- Antifraude serio, moderación o borrado de puntuaciones.
- Realtime en el salón, paginación e histórico de partidas.
- Portar los ocho juegos que siguen simulados.
- Panel de administración del catálogo.

Cada una, si llega, en su propia spec.
