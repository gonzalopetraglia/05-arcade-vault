"use client";

import Link from "next/link";
import { useRef } from "react";
import type { GameWithStats } from "@/app/api/games/route";
import { formatScore } from "@/lib/games";

function GameCard({ game }: { game: GameWithStats }) {
  const tiltRef = useRef<HTMLAnchorElement>(null);

  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `translateY(-6px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
  };

  const onLeave = () => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.transform = "";
  };

  return (
    <Link
      ref={tiltRef}
      className="card"
      href={`/games/${game.id}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="cover">
        <div className={"cover-bg " + game.cover}></div>
        <div className="label">{game.cat}</div>
      </div>
      <div className="meta">
        <div className="title">{game.title}</div>
        <div className="desc">{game.short}</div>
        <div className="row">
          <div className="score-badge">
            <span>MEJOR PUNTUACIÓN</span>
            <b>{formatScore(game.best)}</b>
          </div>
          <span
            className={
              "btn " +
              (game.color === "magenta" ? "magenta" : game.color === "yellow" ? "yellow" : "")
            }
          >
            JUGAR
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * La cuadrícula de portadas del MVP visual. Los filtros y la carga del
 * catálogo viven en `LibraryView`, para que la vista de tabla comparta ambos.
 */
export function LibraryGrid({ games }: { games: GameWithStats[] }) {
  return (
    <div className="av-grid">
      {games.map((g) => (
        <GameCard key={g.id} game={g} />
      ))}
    </div>
  );
}
