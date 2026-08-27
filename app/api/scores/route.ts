import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ScoreEntry = {
  id: string;
  rank: number;
  name: string;
  score: number;
  at: string;
};

export type ScoresResponse = { ok: true; scores: ScoreEntry[] } | { ok: false; error: string };

export type PostScoreError = "INVALID_BODY" | "UNKNOWN_GAME" | "RATE_LIMITED" | "DB_ERROR";

export type PostScoreResponse =
  { ok: true; entry: ScoreEntry } | { ok: false; error: PostScoreError };

// El top cambia con cada partida guardada: cachear dejaría el salón congelado.
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

type ScoreRecord = {
  id: string;
  player_name: string;
  score: number;
  created_at: string;
};

/**
 * El `rank` no vive en la base: es la posición dentro de este top concreto, y
 * depende del `limit` con el que se haya pedido.
 */
function toEntries(rows: ScoreRecord[]): ScoreEntry[] {
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
      .returns<ScoreRecord[]>();

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

const MAX_SCORE = 10_000_000;
const MAX_NAME_LENGTH = 10;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Límite de frecuencia por IP, en memoria del módulo.
 *
 * Se sabe imperfecto y se acepta como tal: no sobrevive a un reinicio del
 * proceso y no se comparte entre instancias, así que en serverless con varias
 * lambdas el tope real es mayor. Es un cortacircuitos contra el spam trivial,
 * no antifraude. El antifraude de verdad necesita auth, y llega con esa spec.
 */
const hits = new Map<string, number[]>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(ip, recent);
    return true;
  }

  recent.push(now);
  hits.set(ip, recent);
  return false;
}

/**
 * Misma regla que el `signIn` de la sesión falsa, ahora también en el servidor:
 * recortar, mayúsculas, 10 caracteres y solo el alfabeto que la interfaz sabe
 * pintar. Devuelve "" si no queda nada utilizable.
 */
function sanitizeName(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .slice(0, MAX_NAME_LENGTH)
    .replace(/[^A-Z0-9 ÁÉÍÓÚÜÑ.-]/g, "")
    .trim();
}

function fail(error: PostScoreError, status: number) {
  return Response.json({ ok: false, error } satisfies PostScoreResponse, { status });
}

export async function POST(request: Request) {
  // El límite va primero, antes de tocar la base: una ráfaga no debe traducirse
  // en una ráfaga de consultas.
  if (rateLimited(clientIp(request))) return fail("RATE_LIMITED", 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", 400);
  }

  if (typeof body !== "object" || body === null) return fail("INVALID_BODY", 400);
  const { game, score, name } = body as Record<string, unknown>;

  if (typeof game !== "string" || game.length === 0) return fail("INVALID_BODY", 400);
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return fail("INVALID_BODY", 400);
  }
  if (typeof name !== "string") return fail("INVALID_BODY", 400);

  const playerName = sanitizeName(name);
  if (playerName.length === 0) return fail("INVALID_BODY", 400);

  try {
    // La existencia del juego se comprueba contra la tabla, no contra el array
    // del seed: la base es la que manda.
    const supabase = await createClient();
    const { data: found, error: lookupError } = await supabase
      .from("games")
      .select("id")
      .eq("id", game)
      .maybeSingle();

    if (lookupError) {
      console.error("[api/scores] Error comprobando el juego:", lookupError);
      return fail("DB_ERROR", 500);
    }
    if (!found) return fail("UNKNOWN_GAME", 400);

    // Única escritura del proyecto con la clave secreta: la RLS deniega el
    // INSERT a la clave publicable, así que esta es la puerta y no hay otra.
    const admin = createAdminClient();
    const { data: inserted, error: insertError } = await admin
      .from("scores")
      .insert({ game_id: game, player_name: playerName, score })
      .select("id, player_name, score, created_at")
      .single<ScoreRecord>();

    if (insertError || !inserted) {
      console.error("[api/scores] Error insertando la puntuación:", insertError);
      return fail("DB_ERROR", 500);
    }

    // Posición real de la fila en el ranking del juego, con el mismo desempate
    // que el resto: mejor puntuación primero, y a igualdad gana la más antigua.
    const { count, error: rankError } = await admin
      .from("scores")
      .select("id", { count: "exact", head: true })
      .eq("game_id", game)
      .or(
        `score.gt.${inserted.score},and(score.eq.${inserted.score},created_at.lt.${inserted.created_at})`,
      );

    if (rankError) {
      console.error("[api/scores] Error calculando el rank:", rankError);
      return fail("DB_ERROR", 500);
    }

    const entry: ScoreEntry = {
      id: inserted.id,
      rank: (count ?? 0) + 1,
      name: inserted.player_name,
      score: inserted.score,
      at: inserted.created_at,
    };

    return Response.json({ ok: true, entry } satisfies PostScoreResponse, { status: 201 });
  } catch (cause) {
    console.error("[api/scores] Falló el alta de la puntuación:", cause);
    return fail("DB_ERROR", 500);
  }
}
