"use client";

import Link from "next/link";
import { useState } from "react";
import type { ScoreEntry } from "@/app/api/scores/route";
import { type Game, formatScore } from "@/lib/games";
import { formatDate, useTopScores } from "@/lib/use-top-scores";

const TOP_SIZE = 10;
const PODIUM_SIZE = 3;

/**
 * Un puesto del podio. Sin fila que mostrar pinta un hueco: con menos de tres
 * puntuaciones el podio queda incompleto a propósito, porque rellenarlo con
 * nombres inventados es exactamente lo que esta pantalla dejó de hacer.
 */
function PodiumSlot({
  medal,
  rank,
  entry,
  champion = false,
}: {
  medal: "gold" | "silver" | "bronze";
  rank: number;
  entry?: ScoreEntry;
  champion?: boolean;
}) {
  return (
    <div className={`podium-slot ${medal}${entry ? "" : " empty"}`}>
      {champion && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div className="rank-num" style={champion ? { fontSize: 36, marginTop: 4 } : undefined}>
        {String(rank).padStart(2, "0")}
      </div>
      <div className="name">{entry ? entry.name : "LIBRE"}</div>
      <div className="score" style={champion ? { fontSize: 20 } : undefined}>
        {entry ? formatScore(entry.score) : "—"}
      </div>
      <div className="date">{entry ? formatDate(entry.at) : "SIN RECLAMAR"}</div>
    </div>
  );
}

export function HallOfFame({ games }: { games: Game[] }) {
  const [tab, setTab] = useState(games[0].id);
  const { status, scores, retry } = useTopScores(tab, TOP_SIZE);

  const game = games.find((g) => g.id === tab);
  const podium = Array.from({ length: PODIUM_SIZE }, (_, i) => scores[i]);
  const empty = status === "ready" && scores.length === 0;

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

      {status === "error" ? (
        <div className="data-state error">
          <div className="data-state-title">NO SE PUDO CARGAR EL SALÓN</div>
          <p className="data-state-note">La señal se ha perdido entre el vault y la pantalla.</p>
          <button className="btn yellow" onClick={retry}>
            REINTENTAR
          </button>
        </div>
      ) : status === "loading" ? (
        <div className="data-state">
          <div className="data-state-title loading">CARGANDO…</div>
          <p className="data-state-note">Leyendo las marcas de {game?.title}.</p>
        </div>
      ) : empty ? (
        <div className="data-state">
          <div className="data-state-title">AÚN NADIE HA JUGADO A ESTE JUEGO</div>
          <p className="data-state-note">
            El primer puesto está sin reclamar. La primera partida lo decide.
          </p>
          <Link className="btn yellow" href={`/jugar/${tab}`}>
            JUGAR A {game?.title}
          </Link>
        </div>
      ) : (
        <>
          <div className="podium">
            <PodiumSlot medal="silver" rank={2} entry={podium[1]} />
            <PodiumSlot medal="gold" rank={1} entry={podium[0]} champion />
            <PodiumSlot medal="bronze" rank={3} entry={podium[2]} />
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {scores.map((entry, i) => (
              <div
                key={entry.id}
                className={
                  "tr" +
                  (entry.rank === 1
                    ? " top1"
                    : entry.rank === 2
                      ? " top2"
                      : entry.rank === 3
                        ? " top3"
                        : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(entry.rank).padStart(2, "0")}</div>
                <div className="pl">{entry.name}</div>
                <div className="sc">{formatScore(entry.score)}</div>
                <div className="dt">{formatDate(entry.at)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link className="btn lg" href="/games">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
