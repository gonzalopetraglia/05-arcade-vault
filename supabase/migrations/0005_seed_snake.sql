-- SPEC 09 — Seed de SNAKE.
--
-- La duodécima entrada del catálogo, con `sort_order` 11 para que quede al
-- final, detrás de ARKANOID. Convive con `serpentina`, que describe el mismo
-- género: renombrarla o borrarla rompería /games/serpentina,
-- /jugar/serpentina y las puntuaciones ya guardadas con esa clave.
--
-- `on conflict (id) do nothing` hace la migración reejecutable, igual que 0002,
-- 0003 y 0004.

insert into public.games (id, title, short, "long", cat, cover, color, sort_order) values
  (
    'snake',
    'SNAKE',
    'Come fruta, crece y no te muerdas.',
    'Una serpiente recorre una grilla de 20×15 buscando fruta. Cada bocado la alarga 10 puntos y, cada cinco frutas, el mundo se mueve un poco más rápido. El muro mata y la propia cola también; tienes tres vidas para llegar lo más lejos posible.',
    'ARCADE',
    'cover-snake',
    'green',
    11
  )
on conflict (id) do nothing;
