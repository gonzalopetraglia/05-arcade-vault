import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/game-player";
import { AsteroidsPlayer } from "@/components/games/asteroids-player";
import { GAMES, getGame } from "@/lib/games";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export default async function PlayPage({ params }: PageProps<"/jugar/[id]">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  // Cada juego portado trae su propio player; el resto siguen con el simulacro.
  if (game.id === "asteroides") return <AsteroidsPlayer game={game} />;

  return <GamePlayer game={game} />;
}
