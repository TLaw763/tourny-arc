import { OrganizerBoard } from "@/components/organizer-board";
import { requireSelectedSeasonId } from "@/lib/selected-season";

export default async function OrganizerPage() {
  const selectedSeasonId = await requireSelectedSeasonId();
  return <OrganizerBoard selectedSeasonId={selectedSeasonId} />;
}
