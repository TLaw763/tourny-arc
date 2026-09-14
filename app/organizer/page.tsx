import { OrganizerBoard } from "@/components/organizer-board";
import { isMdLeagueImportConfigured } from "@/lib/md-league/config";
import { requireSelectedSeasonId } from "@/lib/selected-season";

export default async function OrganizerPage() {
  const selectedSeasonId = await requireSelectedSeasonId();
  return (
    <OrganizerBoard
      selectedSeasonId={selectedSeasonId}
      mdLeagueImportEnabled={isMdLeagueImportConfigured()}
    />
  );
}
