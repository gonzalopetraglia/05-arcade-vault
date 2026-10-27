import { HallOfFame } from "@/components/hall-of-fame";
import { getCatalog } from "@/lib/catalog";

export default async function SalonPage() {
  return <HallOfFame games={await getCatalog()} />;
}
