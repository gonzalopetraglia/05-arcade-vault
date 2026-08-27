import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/lib/games";

/** Un juego del catálogo con sus métricas derivadas de `scores`. */
export type GameWithStats = Game & { best: number; plays: number };

export type GamesResponse = { ok: true; games: GameWithStats[] } | { ok: false; error: string };

// Las métricas cambian con cada partida guardada: cachear esta ruta dejaría la
// biblioteca mostrando números viejos.
export const dynamic = "force-dynamic";

type GameRow = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Game["cat"];
  cover: string;
  color: Game["color"];
  sort_order: number;
};

type StatsRow = { game_id: string; best: number | null; plays: number | null };

export async function GET() {
  try {
    // Clave publicable a propósito: la lectura pasa por la RLS, como cualquier
    // otro cliente. La clave secreta solo escribe, y solo en POST /api/scores.
    const supabase = await createClient();

    const [games, stats] = await Promise.all([
      supabase
        .from("games")
        .select("id, title, short, long, cat, cover, color, sort_order")
        .order("sort_order", { ascending: true })
        .returns<GameRow[]>(),
      supabase.from("game_stats").select("game_id, best, plays").returns<StatsRow[]>(),
    ]);

    if (games.error || stats.error) {
      console.error("[api/games] Error de Supabase:", games.error ?? stats.error);
      return Response.json({ ok: false, error: "DB_ERROR" } satisfies GamesResponse, {
        status: 500,
      });
    }

    const byGame = new Map(stats.data.map((s) => [s.game_id, s]));

    const withStats: GameWithStats[] = games.data.map((game) => {
      const s = byGame.get(game.id);
      return {
        id: game.id,
        title: game.title,
        short: game.short,
        long: game.long,
        cat: game.cat,
        cover: game.cover,
        color: game.color,
        // Un juego sin partidas no aparece en la vista con nulos, pero el
        // `coalesce` vive en SQL y aquí solo se defiende el caso de que la
        // fila falte del todo.
        best: Number(s?.best ?? 0),
        plays: Number(s?.plays ?? 0),
      };
    });

    return Response.json({ ok: true, games: withStats } satisfies GamesResponse);
  } catch (cause) {
    console.error("[api/games] Falló la consulta del catálogo:", cause);
    return Response.json({ ok: false, error: "DB_ERROR" } satisfies GamesResponse, { status: 500 });
  }
}
