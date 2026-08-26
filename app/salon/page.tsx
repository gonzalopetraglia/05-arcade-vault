import { HallOfFame } from "@/components/hall-of-fame";
import { GAMES } from "@/lib/games";

export default function SalonPage() {
  return <HallOfFame games={GAMES} />;
}
