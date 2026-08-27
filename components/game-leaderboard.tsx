"use client";

import { formatScore } from "@/lib/games";
import { formatDate, useTopScores } from "@/lib/use-top-scores";

const TOP_SIZE = 10;

/**
 * Top de un juego en la página de detalle.
 *
 * Es cliente para que `app/games/[id]/page.tsx` siga siendo estática: la
 * página se genera en build desde el seed y solo este panel va a la API.
 */
export function GameLeaderboard({ gameId }: { gameId: string }) {
  const { status, scores, retry } = useTopScores(gameId, TOP_SIZE);

  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>

      {status === "error" ? (
        <div className="lb-state error">
          <div>NO SE PUDO CARGAR</div>
          <button className="btn yellow" onClick={retry}>
            REINTENTAR
          </button>
        </div>
      ) : status === "loading" ? (
        <div className="lb-state">
          <div className="loading">CARGANDO…</div>
        </div>
      ) : scores.length === 0 ? (
        <div className="lb-state">
          <div>AÚN NADIE HA JUGADO A ESTE JUEGO</div>
        </div>
      ) : (
        scores.map((entry, i) => (
          <div
            key={entry.id}
            className={"lb-row" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
          >
            <div className="rk">#{String(entry.rank).padStart(2, "0")}</div>
            <div className="pl">
              {entry.name}
              <div style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>
                {formatDate(entry.at)}
              </div>
            </div>
            <div className="sc">{formatScore(entry.score)}</div>
          </div>
        ))
      )}
    </div>
  );
}
