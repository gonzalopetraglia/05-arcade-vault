import { createClient } from "@/lib/supabase/server";

export type ScoreEntry = {
  id: string;
  rank: number;
  name: string;
  score: number;
  at: string;
};

export type ScoresResponse = { ok: true; scores: ScoreEntry[] } | { ok: false; error: string };

// El top cambia con cada partida guardada: cachear dejaría el salón congelado.
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

type ScoreRow = {
  id: string;
  player_name: string;
  score: number;
  created_at: string;
};

/**
 * El `rank` no vive en la base: es la posición dentro de este top concreto, y
 * depende del `limit` con el que se haya pedido.
 */
function toEntries(rows: ScoreRow[]): ScoreEntry[] {
  return rows.map((row, i) => ({
    id: row.id,
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    at: row.created_at,
  }));
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const game = params.get("game");

  if (!game) {
    return Response.json({ ok: false, error: "MISSING_GAME" } satisfies ScoresResponse, {
      status: 400,
    });
  }

  let limit = DEFAULT_LIMIT;
  const rawLimit = params.get("limit");
  if (rawLimit !== null) {
    const parsed = Number(rawLimit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
      return Response.json({ ok: false, error: "INVALID_LIMIT" } satisfies ScoresResponse, {
        status: 400,
      });
    }
    limit = parsed;
  }

  try {
    const supabase = await createClient();

    // Mismo orden que el índice `scores_game_score_idx`: a igualdad de
    // puntuación gana quien la consiguió antes.
    const { data, error } = await supabase
      .from("scores")
      .select("id, player_name, score, created_at")
      .eq("game_id", game)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(limit)
      .returns<ScoreRow[]>();

    if (error) {
      console.error("[api/scores] Error de Supabase:", error);
      return Response.json({ ok: false, error: "DB_ERROR" } satisfies ScoresResponse, {
        status: 500,
      });
    }

    return Response.json({ ok: true, scores: toEntries(data) } satisfies ScoresResponse);
  } catch (cause) {
    console.error("[api/scores] Falló la consulta del top:", cause);
    return Response.json({ ok: false, error: "DB_ERROR" } satisfies ScoresResponse, {
      status: 500,
    });
  }
}
