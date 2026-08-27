-- SPEC 06 — Seed del catálogo.
--
-- Los nueve juegos de `GAMES` en `lib/games.ts`, con `sort_order` según el
-- orden del array: es el orden con el que se diseñó la biblioteca y sin él
-- dependería del `id` o de la fecha de inserción.
--
-- `on conflict (id) do nothing` hace la migración reejecutable. Esto siembra,
-- no sincroniza: un cambio posterior del catálogo es su propia migración.

insert into public.games (id, title, short, "long", cat, cover, color, sort_order) values
  (
    'bloque-buster',
    'BLOQUE BUSTER',
    'Rebota la pelota y destruye muros de neón.',
    'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?',
    'ARCADE',
    'cover-bricks',
    'cyan',
    0
  ),
  (
    'caida',
    'CAÍDA',
    'Encaja las piezas antes de que el techo te aplaste.',
    'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.',
    'PUZZLE',
    'cover-tetro',
    'magenta',
    1
  ),
  (
    'serpentina',
    'SERPENTINA',
    'Crece sin morder tu propia cola.',
    'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.',
    'ARCADE',
    'cover-snake',
    'green',
    2
  ),
  (
    'gloton',
    'GLOTÓN',
    'Devora puntos y escapa de los fantasmas.',
    'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.',
    'ARCADE',
    'cover-glot',
    'yellow',
    3
  ),
  (
    'invasores',
    'INVASORES',
    'Defiende el planeta de filas alienígenas.',
    'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.',
    'SHOOTER',
    'cover-invaders',
    'green',
    4
  ),
  (
    'rocas',
    'ROCAS',
    'Pulveriza asteroides en gravedad cero.',
    'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.',
    'SHOOTER',
    'cover-rocas',
    'yellow',
    5
  ),
  (
    'ranaria',
    'RANARIA',
    'Cruza la autopista de pixeles.',
    'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.',
    'ARCADE',
    'cover-rana',
    'green',
    6
  ),
  (
    'asteroides',
    'ASTEROIDES',
    'El clásico de 1979, jugable de verdad.',
    'Una nave vectorial a la deriva en un campo de asteroides. Rota, propulsa y dispara para partir cada roca en fragmentos más pequeños hasta limpiar el sector. Recoge el power-up 3x para disparar tres balas a la vez y aguanta con tus tres vidas todo lo que puedas.',
    'SHOOTER',
    'cover-rocas',
    'yellow',
    7
  ),
  (
    'duelo-pixel',
    'DUELO PIXEL',
    'Dos paletas. Una pelota. Reflejos máximos.',
    'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.',
    'VERSUS',
    'cover-duelo',
    'cyan',
    8
  )
on conflict (id) do nothing;
