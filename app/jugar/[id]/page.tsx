import type { ComponentType } from "react";
import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/game-player";
import { ArkanoidPlayer } from "@/components/games/arkanoid-player";
import { AsteroidsPlayer } from "@/components/games/asteroids-player";
import { SnakePlayer } from "@/components/games/snake-player";
import { TetrisPlayer } from "@/components/games/tetris-player";
import { GAMES, getGame, type Game } from "@/lib/games";

/** Cada juego portado trae su propio player; el resto siguen con el simulacro. */
const PLAYERS: Record<string, ComponentType<{ game: Game }>> = {
  asteroides: AsteroidsPlayer,
  tetris: TetrisPlayer,
  arkanoid: ArkanoidPlayer,
  snake: SnakePlayer,
};

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export default async function PlayPage({ params }: PageProps<"/jugar/[id]">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  const Player = PLAYERS[game.id] ?? GamePlayer;

  return <Player game={game} />;
}
