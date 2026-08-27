-- SPEC 06 — Esquema del catálogo y de las puntuaciones.
--
-- Crea las dos tablas del dominio (`games`, `scores`), el índice que sirve la
-- consulta del salón de la fama, la vista agregada `game_stats` y la RLS.
--
-- La RLS solo abre el `select`. No hay política de `insert`, `update` ni
-- `delete`: la clave publicable del navegador no puede escribir. El alta de
-- puntuaciones la hace el servidor en `POST /api/scores` con la clave secreta,
-- que salta la RLS. Añadir aquí una política de insert convertiría toda la
-- validación del Route Handler en decorativa.

-- Catálogo de juegos. El `id` es el mismo slug que ya usan las rutas.
create table if not exists public.games (
  id text primary key,
  title text not null,
  short text not null,
  "long" text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  sort_order int not null,
  created_at timestamptz not null default now()
);

-- Puntuaciones. Sin `user_id`: no hay auth todavía, el nombre viaja como texto
-- saneado por el Route Handler.
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id) on delete cascade,
  player_name text not null check (char_length(player_name) between 1 and 10),
  score int not null check (score >= 0),
  created_at timestamptz not null default now()
);

-- Es exactamente la consulta del salón: filtra por juego y ordena por
-- puntuación. El `created_at` ascendente rompe los empates a favor de quien
-- consiguió la puntuación antes.
create index if not exists scores_game_score_idx
  on public.scores (game_id, score desc, created_at asc);

-- Métricas derivadas del catálogo. `left join` para que un juego sin partidas
-- siga apareciendo con best = 0 y plays = 0.
--
-- `security_invoker = true` es obligatorio: sin él la vista se ejecutaría con
-- los permisos de su propietario y se saltaría la RLS de las tablas que agrega.
create or replace view public.game_stats
with (security_invoker = true) as
select
  g.id as game_id,
  coalesce(max(s.score), 0) as best,
  count(s.id) as plays
from public.games g
left join public.scores s on s.game_id = g.id
group by g.id;

alter table public.games enable row level security;
alter table public.scores enable row level security;

-- Lectura pública en ambas tablas. Nada más.
drop policy if exists "games_select_public" on public.games;
create policy "games_select_public"
  on public.games
  for select
  to anon, authenticated
  using (true);

drop policy if exists "scores_select_public" on public.scores;
create policy "scores_select_public"
  on public.scores
  for select
  to anon, authenticated
  using (true);
