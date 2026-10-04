# TODO de sugerencias de juegos

Memoria del agente `game-planner`. Una fila por idea sugerida alguna vez.
Estado: `[ ]` pendiente · `[~]` con spec escrita · `[x]` implementada · `[-]` descartada.

## Pendientes

| Estado | Id | Título | Categoría | Origen | Esfuerzo | Sugerida | Motivo |
|--------|----|--------|-----------|--------|----------|----------|--------|
| [ ] | `duelo-pixel` | DUELO PIXEL | VERSUS / cyan | Entrada simulada del catálogo (desde cero, sin assets) | Bajo | 2026-09-24 | #1 recomendado. VERSUS es la única categoría con 0 juegos jugables. Pong contra CPU: canvas único, formas geométricas, puntuación = puntos anotados + bonus por nivel. El modo 2 jugadores local no puntúa en el leaderboard. |
| [ ] | `invasores` | INVASORES | SHOOTER / green | Entrada simulada del catálogo (desde cero, sprites dibujados en código) | Medio | 2026-09-24 | #2. SHOOTER solo tiene 1 jugable. Oleadas, escudos y ritmo de marcha; mecánica distinta a asteroides (disparo fijo en vertical frente a rotación libre). |
| [ ] | `ranaria` | RANARIA | ARCADE / green | Entrada simulada del catálogo (desde cero) | Medio | 2026-09-24 | #3. Mecánica nueva (cruzar carriles), pero ARCADE ya tiene 2 jugables. Puntuación por avance, llegadas y tiempo sobrante. |
| [ ] | `combate` | COMBATE | VERSUS / green | Desde cero | Medio | 2026-09-24 | #1 VERSUS. Duelo de tanques cenital contra CPU (Combat, Atari 2600), balas con un rebote, arenas por nivel. 100 por impacto, ronda a 5 impactos. Aquí vale como VERSUS; como SHOOTER se descartó por la rotación tipo asteroides. |
| [ ] | `sumo-neon` | SUMO NEÓN | VERSUS / magenta | Desde cero | Bajo | 2026-09-24 | #2 VERSUS. Discos que se empujan fuera de un ring que encoge. Física de círculos solo. Puntuación por rondas (a saltos). |
| [ ] | `artilleria` | ARTILLERÍA | VERSUS / yellow | Desde cero | Medio | 2026-09-24 | #3 VERSUS. Por turnos contra CPU (Gorillas / Scorched Earth), terreno destructible y viento. Riesgo: turnos en el bucle rAF y controles táctiles de ángulo y potencia. |
| [ ] | `ciclos-luz` | CICLOS DE LUZ | VERSUS / cyan | Desde cero | Bajo | 2026-09-24 | #4 VERSUS. Motos de luz contra CPU (Tron). Comparte rejilla y estela con `snake`; como ARCADE se descarta por eso, y como VERSUS solo se sostiene por la IA rival. |
| [ ] | `ring-pixel` | RING PIXEL | VERSUS / magenta | Desde cero | Medio | 2026-09-24 | #5 VERSUS. Boxeo cenital contra CPU (Boxing, Atari 2600). Puntuación continua por golpe; ajustar la IA de combate cuesta. |
| [ ] | `defensa-orbital` | DEFENSA ORBITAL | SHOOTER / magenta | Desde cero | Bajo-medio | 2026-09-24 | #1 SHOOTER. Missile Command: mira y explosiones circulares que protegen ciudades. `lives` = ciudades. Decidir mira por teclado o un `setPointer` nuevo en el motor. |
| [ ] | `arena-neon` | ARENA NEÓN | SHOOTER / cyan | Desde cero | Medio | 2026-09-24 | #2 SHOOTER. Twin-stick en arena (Robotron): WASD mueve, flechas disparan, rescates con multiplicador. Solo necesita `setKey`. |
| [ ] | `escuadron` | ESCUADRÓN | SHOOTER / green | Desde cero | Medio-alto | 2026-09-24 | #3 SHOOTER. Shmup vertical por fases (1942 / Xevious) con patrones de vuelo, jefes y power-ups. |
| [ ] | `galeria-neon` | GALERÍA NEÓN | SHOOTER / yellow | Desde cero | Bajo | 2026-09-24 | #4 SHOOTER. Galería de tiro (Duck Hunt, Hogan's Alley). Se solapa con `defensa-orbital` en la mecánica de apuntar: si se hace uno, el otro pierde valor. |
| [ ] | `caverna` | CAVERNA | SHOOTER / cyan | Desde cero | Alto | 2026-09-24 | #5 SHOOTER. Scroll horizontal por cuevas (Scramble) con combustible como temporizador. |
| [ ] | `fusion` | FUSIÓN | PUZZLE / yellow | Desde cero | Bajo | 2026-09-24 | #1 PUZZLE. 2048 en 4x4. `score` = suma de fusiones, `level` = log2 de la ficha máxima. Cuatro teclas, sin caída de piezas. |
| [ ] | `joyas` | JOYAS | PUZZLE / magenta | Desde cero | Medio | 2026-09-24 | #2 PUZZLE. Match-3 (Bejeweled) contra barra de tiempo, cascadas con multiplicador. |
| [ ] | `minas` | MINAS | PUZZLE / cyan | Desde cero | Bajo-medio | 2026-09-24 | #3 PUZZLE. Buscaminas por niveles con 3 vidas y cursor de teclado; el toque directo necesitaría extender el motor. |
| [ ] | `tuberias` | TUBERÍAS | PUZZLE / green | Desde cero | Medio | 2026-09-24 | #4 PUZZLE. Pipe Mania: cola de piezas y fluido que avanza. Diseñar la dificultad es fino. |
| [ ] | `apagon` | APAGÓN | PUZZLE / cyan | Desde cero | Bajo | 2026-09-24 | #5 PUZZLE. Lights Out con niveles generados. La puntuación sale de reglas artificiales y no de la mecánica. |
| [ ] | `aleteo` | ALETEO | ARCADE / yellow | Desde cero | Bajo | 2026-09-24 | #1 ARCADE. Flappy Bird: un botón, +1 por columna, nivel cada 10. Ideal en táctil. |
| [ ] | `alunizaje` | ALUNIZAJE | ARCADE / cyan | Desde cero | Medio | 2026-09-24 | #2 ARCADE. Lunar Lander; reutiliza la nave vectorial de `lib/games/asteroids/`. Multiplicador por plataforma más combustible sobrante. |
| [ ] | `territorio` | TERRITORIO | ARCADE / magenta | Desde cero | Medio-alto | 2026-09-24 | #3 ARCADE. Qix sobre una grilla con relleno por inundación. La mecánica más original del lote. |
| [ ] | `apilador` | APILADOR | ARCADE / magenta | Desde cero | Bajo | 2026-09-24 | #4 ARCADE. Stacker: un botón, poca profundidad. |
| [ ] | `lluvia-bombas` | LLUVIA DE BOMBAS | ARCADE / green | Desde cero | Bajo | 2026-09-24 | #5 ARCADE. Kaboom!; la pala horizontal abajo recuerda a `arkanoid`. |

## Implementadas

| Estado | Id | Título | Fecha |
|--------|----|--------|-------|
| [x] | `asteroides` | ASTEROIDES | SPEC 05 |
| [x] | `tetris` | TETRIS | SPEC 07 |
| [x] | `arkanoid` | ARKANOID | SPEC 08 |
| [x] | `snake` | SNAKE | SPEC 09 |

## Descartadas

| Id | Título | Fecha | Motivo del descarte |
|----|--------|-------|---------------------|
| `bloque-buster` | BLOQUE BUSTER | 2026-09-24 | Entrada simulada que duplica la mecánica de `arkanoid` (ya jugable). Mejor retirarla o redirigirla que portarla. |
| `caida` | CAÍDA | 2026-09-24 | Entrada simulada que duplica la mecánica de `tetris` (ya jugable). |
| `serpentina` | SERPENTINA | 2026-09-24 | Entrada simulada que duplica la mecánica de `snake` (ya jugable). |
| `rocas` | ROCAS | 2026-09-24 | Entrada simulada que duplica la mecánica de `asteroides` (ya jugable). |
| `gloton` | GLOTÓN | 2026-09-24 | Aplazada, no rechazada: esfuerzo alto (laberinto, IA de 4 fantasmas, modos de persecución) y va a ARCADE, que ya es la categoría más llena. Reconsiderar cuando VERSUS y SHOOTER tengan más juegos. |
| `tron` | TRON (ARCADE) | 2026-09-24 | Como ARCADE repite la rejilla y la estela de `snake`. Su versión VERSUS sigue pendiente como `ciclos-luz`. |
| `donkey-kong` | DONKEY KONG | 2026-09-24 | Esfuerzo alto (plataformas, escaleras, IA). Mismo motivo que `gloton`. |
| `lode-runner` | LODE RUNNER | 2026-09-24 | Esfuerzo alto (plataformas, escaleras, IA). |
| `qbert` | Q\*BERT | 2026-09-24 | Isométrico y enemigos: esfuerzo alto sin aportar más que `territorio`. |
| `hockey-aire` | HOCKEY DE AIRE | 2026-09-24 | Repite la mecánica de Pong (`duelo-pixel`). |
| `warlords` | WARLORDS | 2026-09-24 | Repite la mecánica de Pong (`duelo-pixel`). |
| `spacewar` | SPACEWAR! | 2026-09-24 | Repite la rotación y el empuje de `asteroides`. |
| `cuatro-en-raya` | CUATRO EN RAYA | 2026-09-24 | La puntuación no crece durante la partida; encaja mejor como PUZZLE que como VERSUS. |
| `reversi` | REVERSI | 2026-09-24 | La puntuación no crece durante la partida; encaja mejor como PUZZLE que como VERSUS. |
| `centipede` | CENTIPEDE | 2026-09-24 | El ciempiés baja por la pantalla, demasiado cerca de `invasores`. |
| `galaga` | GALAGA | 2026-09-24 | Formación que se lanza en picado: duplica `invasores`. |
| `berzerk` | BERZERK | 2026-09-24 | Disparo en 8 direcciones, se solapa con `arena-neon`. |
