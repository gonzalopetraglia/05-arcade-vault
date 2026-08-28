-- SPEC 08 — Seed de ARKANOID.
--
-- La undécima entrada del catálogo, con `sort_order` 10 para que quede al
-- final, detrás de TETRIS. Convive con `bloque-buster`, que describe el mismo
-- género: renombrarla o borrarla rompería /games/bloque-buster,
-- /jugar/bloque-buster y las puntuaciones ya guardadas con esa clave.
--
-- `on conflict (id) do nothing` hace la migración reejecutable, igual que 0002
-- y 0003.

insert into public.games (id, title, short, "long", cat, cover, color, sort_order) values
  (
    'arkanoid',
    'ARKANOID',
    'Cinco muros, tres vidas y una pelota que no perdona.',
    'El rompeladrillos clásico con sus sprites originales. Cinco niveles con formaciones distintas —muro lleno, pirámide, tablero de ajedrez, hueco y marco con cruz— y la pelota acelerando un 10 % en cada uno. Cada bloque estalla en cuatro fotogramas y suma 10 puntos.',
    'ARCADE',
    'cover-bricks',
    'cyan',
    10
  )
on conflict (id) do nothing;
