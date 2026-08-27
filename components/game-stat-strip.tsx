"use client";

import { formatScore } from "@/lib/games";
import { useCatalog } from "@/lib/use-catalog";

/**
 * Partidas y mejor global de un juego, desde `/api/games`.
 *
 * Es cliente por lo mismo que `GameLeaderboard`: la página de detalle se
 * genera en build desde el seed y estas dos cifras son lo único que cambia
 * con cada partida. Mientras no hay respuesta, un guion — nunca un cero, que
 * se leería como "nadie ha jugado".
 */
export function GameStatStrip({ gameId }: { gameId: string }) {
  const { status, games } = useCatalog();
  const game = games.find((g) => g.id === gameId);

  const plays = status === "ready" && game ? formatScore(game.plays) : "—";
  const best = status === "ready" && game ? formatScore(game.best) : "—";

  return (
    <div className="stat-strip">
      <div>
        <div className="l">Partidas</div>
        <div className="v">{plays}</div>
      </div>
      <div>
        <div className="l">Mejor global</div>
        <div
          className="v"
          style={{ color: "var(--magenta)", textShadow: "0 0 6px rgba(255,0,110,0.5)" }}
        >
          {best}
        </div>
      </div>
      <div>
        <div className="l">Dificultad</div>
        <div
          className="v"
          style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}
        >
          ★ ★ ★ ☆ ☆
        </div>
      </div>
    </div>
  );
}
