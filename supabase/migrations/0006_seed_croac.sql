-- SPEC 12 — Seed de CROAC.
--
-- La decimotercera entrada del catálogo, con `sort_order` 12 para que quede al
-- final, detrás de SNAKE. Convive con `ranaria`, que describe el mismo género:
-- renombrarla o borrarla rompería /games/ranaria, /jugar/ranaria y las
-- puntuaciones ya guardadas con esa clave.
--
-- `on conflict (id) do nothing` hace la migración reejecutable, igual que
-- 0002–0005. Esto siembra, no sincroniza.

insert into public.games (id, title, short, "long", cat, cover, color, sort_order) values
  (
    'croac',
    'CROAC',
    'Salta carriles, cruza el río y llena la charca.',
    'Una rana tiene que cruzar cinco carriles de tráfico y un río de troncos y hojas que se hunden para llegar a los cinco nenúfares del otro lado. Cada fila nueva suma 10 puntos y cada nenúfar 100; llena los cinco y el tráfico acelera. Tres vidas para llegar lo más lejos posible.',
    'ARCADE',
    'cover-rana',
    'green',
    12
  )
on conflict (id) do nothing;
