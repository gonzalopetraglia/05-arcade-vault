"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GameWithStats } from "@/app/api/games/route";
import { formatScore } from "@/lib/games";

type Column = "title" | "cat" | "best" | "plays";
type Direction = "asc" | "desc";

const COLUMNS: { key: Column; label: string; numeric: boolean }[] = [
  { key: "title", label: "JUEGO", numeric: false },
  { key: "cat", label: "CATEGORÍA", numeric: false },
  { key: "best", label: "MEJOR", numeric: true },
  { key: "plays", label: "PARTIDAS", numeric: true },
];

/**
 * La biblioteca como tabla ordenable.
 *
 * Sin columna pulsada mantiene el orden que trae la API, que es el
 * `sort_order` del catálogo: el mismo con el que se ve la cuadrícula, para
 * que las dos vistas no arranquen distintas.
 */
export function LibraryTable({ games }: { games: GameWithStats[] }) {
  const [sort, setSort] = useState<{ column: Column; direction: Direction } | null>(null);

  const rows = useMemo(() => {
    if (!sort) return games;
    const { column, direction } = sort;
    const factor = direction === "asc" ? 1 : -1;

    return [...games].sort((a, b) => {
      const x = a[column];
      const y = b[column];
      const cmp =
        typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y), "es-ES");
      return cmp * factor;
    });
  }, [games, sort]);

  const toggle = (column: Column, numeric: boolean) => {
    setSort((prev) => {
      // Primer clic: lo más útil arriba. En números, el más alto; en texto, la A.
      if (prev?.column !== column) return { column, direction: numeric ? "desc" : "asc" };
      return { column, direction: prev.direction === "asc" ? "desc" : "asc" };
    });
  };

  return (
    <div className="av-table-wrap">
      <table className="av-table">
        <thead>
          <tr>
            {COLUMNS.map(({ key, label, numeric }) => {
              const active = sort?.column === key;
              return (
                <th
                  key={key}
                  className={numeric ? "num" : undefined}
                  aria-sort={
                    active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  <button
                    type="button"
                    className={"sorter" + (active ? " active" : "")}
                    onClick={() => toggle(key, numeric)}
                  >
                    {label}
                    <span className="arrow" aria-hidden="true">
                      {active ? (sort.direction === "asc" ? "▲" : "▼") : "◆"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((game) => (
            <tr key={game.id}>
              <td className="game">
                {/* El enlace ocupa la fila entera: clic en cualquier celda entra
                    al juego, y sigue siendo un enlace de verdad para el teclado. */}
                <Link href={`/games/${game.id}`}>
                  <span className={"dot " + game.color} aria-hidden="true" />
                  {game.title}
                </Link>
              </td>
              <td>{game.cat}</td>
              <td className="num best">{formatScore(game.best)}</td>
              <td className="num">{formatScore(game.plays)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
