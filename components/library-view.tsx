"use client";

import { useMemo, useState } from "react";
import { LibraryGrid } from "@/components/library-grid";
import { LibraryTable } from "@/components/library-table";
import { CATS } from "@/lib/games";
import { useCatalog } from "@/lib/use-catalog";
import { useStoredView } from "@/lib/use-stored-view";

/**
 * La biblioteca: carga el catálogo con métricas, filtra por búsqueda y
 * categoría, y lo pinta como portadas o como tabla.
 *
 * El filtro vive aquí y no dentro de cada vista, para que conmutar no cambie
 * lo que se está mirando.
 */
export function LibraryView() {
  const { status, games, retry } = useCatalog();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("TODOS");
  const [view, setView] = useStoredView();

  const filtered = useMemo(
    () =>
      games.filter(
        (g) =>
          (cat === "TODOS" || g.cat === cat) && g.title.toLowerCase().includes(q.toLowerCase()),
      ),
    [games, q, cat],
  );

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <div className="av-filters">
        <div className="av-search">
          <span className="ico">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar un juego por nombre…"
          />
        </div>
        <div className="av-chips">
          {CATS.map((c) => (
            <button
              key={c}
              className={"chip" + (cat === c ? " active" : "")}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="av-viewswitch" role="group" aria-label="Vista de la biblioteca">
          <button
            className={"chip" + (view === "grid" ? " active" : "")}
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            CUADRÍCULA
          </button>
          <button
            className={"chip" + (view === "table" ? " active" : "")}
            aria-pressed={view === "table"}
            onClick={() => setView("table")}
          >
            TABLA
          </button>
        </div>
      </div>

      {status === "error" ? (
        <div className="data-state error">
          <div className="data-state-title">NO SE PUDO CARGAR LA BIBLIOTECA</div>
          <p className="data-state-note">El vault no responde. Los juegos siguen ahí.</p>
          <button className="btn yellow" onClick={retry}>
            REINTENTAR
          </button>
        </div>
      ) : status === "loading" ? (
        <div className="data-state">
          <div className="data-state-title loading">CARGANDO…</div>
          <p className="data-state-note">Abriendo el vault.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="data-state">
          <div className="data-state-title">NO HAY RESULTADOS</div>
          <p className="data-state-note">Intenta otra búsqueda o categoría.</p>
        </div>
      ) : view === "table" ? (
        <LibraryTable games={filtered} />
      ) : (
        <LibraryGrid games={filtered} />
      )}
    </div>
  );
}
