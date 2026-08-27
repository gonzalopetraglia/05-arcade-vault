"use client";

import { useEffect, useState } from "react";
import type { GamesResponse, GameWithStats } from "@/app/api/games/route";

export type CatalogStatus = "loading" | "ready" | "error";

type Result = { status: "ready" | "error"; games: GameWithStats[] };

/**
 * Catálogo con métricas desde `GET /api/games`.
 *
 * Mismo patrón que `useTopScores`: "cargando" es no tener respuesta todavía,
 * no un estado que el efecto tenga que escribir.
 */
export function useCatalog() {
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);

  const status: CatalogStatus = result?.status ?? "loading";
  const games = result?.status === "ready" ? result.games : [];

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/games", { signal: controller.signal });
        const body = (await res.json()) as GamesResponse;
        if (!body.ok) throw new Error(body.error);
        setResult({ status: "ready", games: body.games });
      } catch (cause) {
        if (controller.signal.aborted) return;
        console.error("[biblioteca] No se pudo cargar el catálogo:", cause);
        setResult({ status: "error", games: [] });
      }
    })();

    return () => controller.abort();
  }, [attempt]);

  const retry = () => {
    setResult(null);
    setAttempt((n) => n + 1);
  };

  return { status, games, retry };
}
