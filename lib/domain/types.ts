/** Domain types aligned with competition-contracts for migration compatibility. */

export type CompetitionVisibility = "private" | "public";
export type CompetitionStatus = "draft" | "active" | "completed" | "archived";
export type SeasonStatus = "draft" | "active" | "completed" | "archived";
export type ScheduleGenerationMode =
  | "single_round_robin"
  | "double_round_robin"
  | "manual";
export type CompetitionFormatTemplate =
  | "league"
  | "swiss"
  | "bracket"
  | "hybrid_swiss_cut";
export type PhaseKind = "league" | "swiss" | "bracket";
export type BracketStyle = "single_elimination" | "double_elimination";
export type FormatPhaseStatus = "planned" | "active" | "completed";
export type MembershipRole = "organizer" | "participant";
export type MembershipStatus = "invited" | "active" | "suspended" | "withdrawn";
export type RoundPublicationState = "draft" | "published" | "locked";
export type FixtureState =
  | "generated"
  | "time_proposed"
  | "confirmed"
  | "in_progress"
  | "result_pending"
  | "disputed"
  | "finalized"
  | "postponed"
  | "cancelled";
export type FixtureSlotSide = "A" | "B";
export type ScheduleProposalStatus =
  | "pending"
  | "acknowledged"
  | "superseded"
  | "withdrawn";
export type GameOutcome =
  | "playerAWin"
  | "playerBWin"
  | "draw"
  | "forfeit"
  | "void"
  | "unplayed";
export type MatchOutcome =
  | "playerAWin"
  | "playerBWin"
  | "draw"
  | "forfeitA"
  | "forfeitB"
  | "void";
export type ResultSubmissionState =
  | "submitted"
  | "confirmed"
  | "disputed"
  | "finalized"
  | "corrected";
export type StreamLinkVisibility = "organizer_only" | "public";

export const DEFAULT_MATCH_POINTS = { win: 3, draw: 1, loss: 0 } as const;
export const DEFAULT_GAMES_TO_WIN_MATCH = 2;

export type FormatPhaseConfig = {
  sequence: number;
  kind: PhaseKind;
  label: string;
  leagueMode?: ScheduleGenerationMode;
  swissRounds?: number;
  cutSize?: number;
  bracketSize?: number;
  bracketStyle?: BracketStyle;
  status: FormatPhaseStatus;
};

export type FormatPlanPreview = {
  template: CompetitionFormatTemplate;
  templateLabel: string;
  phases: Array<{
    sequence: number;
    label: string;
    kind: PhaseKind;
    summary: string;
    automationStatus: "available" | "planned";
  }>;
  notes: string[];
};

export type SeasonFormatPlan = {
  id: string;
  seasonId: string;
  template: CompetitionFormatTemplate;
  phases: FormatPhaseConfig[];
  createdAt: string;
  updatedAt: string;
};

export type Standing = {
  participantId: string;
  seasonId: string;
  rank: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesDrawn: number;
  matchesLost: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesDrawn: number;
  gamesLost: number;
  matchPoints: number;
  tiebreakerValues: Record<string, number>;
  rebuiltAt: string;
};

export type CreateCompetitionWizardRequest = {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  visibility: CompetitionVisibility;
  timezone: string;
  seasonName: string;
  startsAt?: string | null;
  endsAt?: string | null;
  template: CompetitionFormatTemplate;
  leagueMode?: ScheduleGenerationMode;
  swissRounds?: number;
  cutSize?: number;
  bracketSize?: number;
  bracketStyle?: BracketStyle;
  rosterPlayers?: Array<{
    displayName: string;
    onlineClientUsername?: string | null;
  }>;
};

export type Profile = {
  id: string;
  display_name: string;
  email: string;
  online_client_username?: string | null;
  created_at: string;
};
