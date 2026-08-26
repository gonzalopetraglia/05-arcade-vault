"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { useSession } from "@/components/session-provider";
import { type Game, type ScoreRow, seededScores } from "@/lib/games";

function formatDate(at: number) {
  const d = new Date(at);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${mon}/${d.getFullYear()}`;
}

export function HallOfFame({ games }: { games: Game[] }) {
  const { scores } = useSession();
  const [tab, setTab] = useState(games[0].id);
  const rows = useMemo(() => seededScores(tab.length * 23 + 7, 12), [tab]);
  const game = games.find((g) => g.id === tab);

  // Best run the player actually saved on this game, if any.
  const best = useMemo(() => {
    const mine = scores.filter((s) => s.game === tab);
    if (mine.length === 0) return null;
    return mine.reduce((a, b) => (b.score > a.score ? b : a));
  }, [scores, tab]);

  // The saved row slots in by score, so its rank is the one it really earns.
  const table = useMemo<(ScoreRow & { you: boolean })[]>(() => {
    const mock = rows.map((r) => ({ ...r, you: false }));
    if (!best) return mock;
    const yours = {
      rank: 0,
      name: best.name,
      score: best.score,
      date: formatDate(best.at),
      you: true,
    };
    return [...mock, yours]
      .sort((a, b) => b.score - a.score)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [rows, best]);

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{rows[1].name}</div>
          <div className="score">{rows[1].score.toLocaleString("es-ES")}</div>
          <div className="date">{rows[1].date}</div>
        </div>
        <div className="podium-slot gold">
          <div
            className="pixel"
            style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
          >
            CAMPEÓN
          </div>
          <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
            01
          </div>
          <div className="name">{rows[0].name}</div>
          <div className="score" style={{ fontSize: 20 }}>
            {rows[0].score.toLocaleString("es-ES")}
          </div>
          <div className="date">{rows[0].date}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{rows[2].name}</div>
          <div className="score">{rows[2].score.toLocaleString("es-ES")}</div>
          <div className="date">{rows[2].date}</div>
        </div>
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {table.map((r, i) =>
          r.you ? (
            <Fragment key="you">
              <div className="tr you-label">▸ TU MEJOR MARCA EN {game?.title}</div>
              <div className="tr you" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="rk" style={{ color: "var(--yellow)" }}>
                  #{String(r.rank).padStart(2, "0")}
                </div>
                <div className="pl" style={{ color: "var(--yellow)" }}>
                  {r.name}
                </div>
                <div
                  className="sc"
                  style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}
                >
                  {r.score.toLocaleString("es-ES")}
                </div>
                <div className="dt">{r.date}</div>
              </div>
            </Fragment>
          ) : (
            <div
              key={r.name + i}
              className={
                "tr" + (r.rank === 1 ? " top1" : r.rank === 2 ? " top2" : r.rank === 3 ? " top3" : "")
              }
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">{r.name}</div>
              <div className="sc">{r.score.toLocaleString("es-ES")}</div>
              <div className="dt">{r.date}</div>
            </div>
          ),
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link className="btn lg" href="/">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
