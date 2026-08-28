-- SPEC 07 — Seed de TETRIS.
--
-- La décima entrada del catálogo, con `sort_order` 9 para que quede al final,
-- detrás de DUELO PIXEL. Convive con `caida`, que describe el mismo género:
-- renombrarla o borrarla rompería /games/caida, /jugar/caida y las puntuaciones
-- ya guardadas con esa clave.
--
-- `on conflict (id) do nothing` hace la migración reejecutable, igual que 0002.

insert into public.games (id, title, short, "long", cat, cover, color, sort_order) values
  (
    'tetris',
    'TETRIS',
    'Encaja tetrominós y una tuerca que no encaja en nada.',
    'El puzle de caída de toda la vida, con las siete piezas clásicas y una octava: una tuerca hueca que aparece con la misma frecuencia que las demás y que no rellena ninguna línea sola. Rota, encaja y limpia filas mientras la velocidad sube cada 10 líneas.',
    'PUZZLE',
    'cover-tetro',
    'magenta',
    9
  )
on conflict (id) do nothing;
