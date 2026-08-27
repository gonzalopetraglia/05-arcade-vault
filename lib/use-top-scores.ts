"use client";

import { useEffect, useState } from "react";
import type { ScoreEntry, ScoresResponse } from "@/app/api/scores/route";

export type TopScoresStatus = "loading" | "ready" | "error";

/** Lo último que respondió la API, con el juego al que pertenece. */
type Result = { game: string; status: "ready" | "error"; scores: ScoreEntry[] };

/** ISO de Postgres a dd/mm/aaaa. Solo se pinta en cliente, tras el fetch. */
export function formatDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${mon}/${d.getFullYear()}`;
}

/**
 * Top de un juego desde `GET /api/scores`, con sus tres estados.
 *
 * "Cargando" es derivado, no un estado propio: es no tener todavía la
 * respuesta del juego pedido. Así el efecto no llama a setState de forma
 * síncrona y no encadena renders de más. Cambiar de juego aborta la petición
 * anterior, para que una respuesta lenta no pise a una rápida.
 */
export function useTopScores(gameId: string, limit: number) {
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);

  const status: TopScoresStatus = result?.game === gameId ? result.status : "loading";
  const scores = status === "ready" && result ? result.scores : [];

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/scores?game=${encodeURIComponent(gameId)}&limit=${limit}`, {
          signal: controller.signal,
        });
        const body = (await res.json()) as ScoresResponse;
        if (!body.ok) throw new Error(body.error);
        setResult({ game: gameId, status: "ready", scores: body.scores });
      } catch (cause) {
        // Abortar al cambiar de juego no es un error que el jugador deba ver,
        // solo una carga que ya no interesa.
        if (controller.signal.aborted) return;
        console.error("[scores] No se pudo cargar el top:", cause);
        setResult({ game: gameId, status: "error", scores: [] });
      }
    })();

    return () => controller.abort();
  }, [gameId, limit, attempt]);

  const retry = () => {
    setResult(null);
    setAttempt((n) => n + 1);
  };

  return { status, scores, retry };
}
