import { createClient } from "@/lib/supabase/server";
import { GAMES, visibleGames, type Game } from "@/lib/games";

/**
 * Catálogo para Server Components: la tabla `games` manda.
 *
 * `GAMES` solo se usa cuando la tabla está vacía (base recién creada, sin
 * seeds), para que el sitio no quede sin juegos. Si la base tiene filas, un
 * juego que no esté en ella no se muestra aunque siga en `lib/games.ts`. Sobre
 * eso, `visibleGames` oculta los simulacros si hay algún juego jugable.
 */
export async function getCatalog(): Promise<Game[]> {
  // Fuera del try: `cookies()` lanza a propósito al prerenderizar para marcar
  // la ruta como dinámica, y ese error tiene que llegarle a Next.
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("games")
      .select("id, title, short, long, cat, cover, color")
      .order("sort_order", { ascending: true })
      .returns<Game[]>();

    if (error) throw error;
    return visibleGames(data.length > 0 ? data : GAMES);
  } catch (cause) {
    // Sin base no hay forma de saber qué juegos existen: se cae al catálogo
    // sembrado antes que romper la landing o el salón.
    console.error("[catalog] No se pudo leer la tabla games:", cause);
    return visibleGames(GAMES);
  }
}

export async function getCatalogGame(id: string): Promise<Game | undefined> {
  const games = await getCatalog();
  return games.find((g) => g.id === id);
}
