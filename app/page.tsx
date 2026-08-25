import { LibraryGrid } from "@/components/library-grid";
import { GAMES } from "@/lib/games";

export default function Home() {
  return <LibraryGrid games={GAMES} />;
}
