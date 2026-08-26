import { LibraryGrid } from "@/components/library-grid";
import { GAMES } from "@/lib/games";

export default function GamesPage() {
  return <LibraryGrid games={GAMES} />;
}
