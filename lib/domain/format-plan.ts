import type {
  CompetitionFormatTemplate,
  FormatPhaseConfig,
  FormatPlanPreview,
} from "@/lib/domain/types";
import { generateSingleRoundRobin } from "./pairing";

export type FormatWizardInput = {
  template: CompetitionFormatTemplate;
  leagueMode?: "single_round_robin" | "double_round_robin" | "manual";
  swissRounds?: number;
  cutSize?: number;
  bracketSize?: number;
  bracketStyle?: "single_elimination" | "double_elimination";
};

export type FormatValidationIssue = {
  code: string;
  message: string;
};

const TEMPLATE_LABELS: Record<CompetitionFormatTemplate, string> = {
  league: "League (round-robin)",
  swiss: "Swiss rounds",
  bracket: "Elimination bracket",
  hybrid_swiss_cut: "Swiss → top cut (e.g. day 1 / day 2)",
};

/** Build normalized phase config from wizard template + options. */
export function buildPhasesFromTemplate(input: FormatWizardInput): FormatPhaseConfig[] {
  switch (input.template) {
    case "league": {
      const mode = input.leagueMode ?? "single_round_robin";
      const label =
        mode === "double_round_robin"
          ? "Double round-robin"
          : mode === "manual"
            ? "Manual schedule"
            : "Single round-robin";
      return [
        {
          sequence: 1,
          kind: "league",
          label,
          leagueMode: mode,
          status: "planned",
        },
      ];
    }
    case "swiss":
      return [
        {
          sequence: 1,
          kind: "swiss",
          label: `Swiss (${input.swissRounds ?? 5} rounds)`,
          swissRounds: input.swissRounds ?? 5,
          status: "planned",
        },
      ];
    case "bracket": {
      const size = input.bracketSize ?? 8;
      const style = input.bracketStyle ?? "single_elimination";
      return [
        {
          sequence: 1,
          kind: "bracket",
          label:
            style === "double_elimination"
              ? `Double elimination (${size})`
              : `Single elimination (${size})`,
          bracketSize: size,
          bracketStyle: style,
          status: "planned",
        },
      ];
    }
    case "hybrid_swiss_cut": {
      const rounds = input.swissRounds ?? 5;
      const cut = input.cutSize ?? 8;
      const style = input.bracketStyle ?? "single_elimination";
      return [
        {
          sequence: 1,
          kind: "swiss",
          label: `Swiss day 1 (${rounds} rounds)`,
          swissRounds: rounds,
          cutSize: cut,
          status: "planned",
        },
        {
          sequence: 2,
          kind: "bracket",
          label:
            style === "double_elimination"
              ? `Top ${cut} double elimination`
              : `Top ${cut} single elimination`,
          bracketSize: cut,
          bracketStyle: style,
          cutSize: cut,
          status: "planned",
        },
      ];
    }
  }
}

export function validateFormatWizardInput(
  input: FormatWizardInput,
): FormatValidationIssue[] {
  const errors: FormatValidationIssue[] = [];

  switch (input.template) {
    case "league":
      break;
    case "swiss":
      if (input.swissRounds !== undefined && (input.swissRounds < 1 || input.swissRounds > 15)) {
        errors.push({
          code: "INVALID_SWISS_ROUNDS",
          message: "Swiss rounds must be between 1 and 15",
        });
      }
      break;
    case "bracket": {
      const size = input.bracketSize ?? 8;
      if (size < 2) {
        errors.push({ code: "INVALID_BRACKET_SIZE", message: "Bracket size must be at least 2" });
      }
      break;
    }
    case "hybrid_swiss_cut": {
      const cut = input.cutSize ?? 8;
      const rounds = input.swissRounds ?? 5;
      if (cut < 2) {
        errors.push({ code: "INVALID_CUT_SIZE", message: "Top cut size must be at least 2" });
      }
      if (rounds < 1 || rounds > 15) {
        errors.push({
          code: "INVALID_SWISS_ROUNDS",
          message: "Swiss rounds must be between 1 and 15",
        });
      }
      break;
    }
  }

  return errors;
}

function phaseAutomationStatus(kind: FormatPhaseConfig["kind"]): "available" | "planned" {
  return kind === "league" ? "available" : "planned";
}

function describePhase(
  phase: FormatPhaseConfig,
  participantCount?: number,
): { summary: string; automationStatus: "available" | "planned" } {
  const automationStatus = phaseAutomationStatus(phase.kind);

  switch (phase.kind) {
    case "league": {
      const mode = phase.leagueMode ?? "single_round_robin";
      if (mode === "manual") {
        return {
          summary:
            "Organizer defines each round and pairing — ideal when importing a schedule from another platform",
          automationStatus,
        };
      }
      let roundCount = "?";
      if (participantCount && participantCount >= 2) {
        const single = generateSingleRoundRobin(
          Array.from({ length: participantCount }, (_, i) => `p${i}`),
        );
        roundCount = String(mode === "double_round_robin" ? single.length * 2 : single.length);
      }
      const summary =
        mode === "double_round_robin"
          ? `${roundCount} rounds — each player meets every opponent home and away`
          : `${roundCount} rounds — each player meets every opponent once`;
      return { summary, automationStatus };
    }
    case "swiss": {
      const rounds = phase.swissRounds ?? 5;
      const cutNote = phase.cutSize ? ` Top ${phase.cutSize} advance.` : "";
      const perRound =
        participantCount && participantCount >= 2
          ? ` ~${Math.floor(participantCount / 2)} tables per round.`
          : "";
      return {
        summary: `${rounds} Swiss rounds — pair by match record each round.${perRound}${cutNote}`,
        automationStatus,
      };
    }
    case "bracket": {
      const size = phase.bracketSize ?? 8;
      const style = phase.bracketStyle ?? "single_elimination";
      const matches = style === "single_elimination" ? size - 1 : size * 2 - 2;
      return {
        summary:
          style === "double_elimination"
            ? `${size} players, double elimination (~${matches} bracket matches)`
            : `${size} players, single elimination (${matches} bracket matches)`,
        automationStatus,
      };
    }
  }
}

/** Human-readable preview for the wizard review step. */
export function describeFormatPlan(
  template: CompetitionFormatTemplate,
  phases: FormatPhaseConfig[],
  participantCount?: number,
): FormatPlanPreview {
  const notes: string[] = [];
  const previewPhases = phases.map((phase) => {
    const { summary, automationStatus } = describePhase(phase, participantCount);
    return {
      sequence: phase.sequence,
      label: phase.label,
      kind: phase.kind,
      summary,
      automationStatus,
    };
  });

  const hasPlanned = previewPhases.some((p) => p.automationStatus === "planned");
  if (hasPlanned) {
    notes.push(
      "Swiss and bracket phases are saved in your format plan. Automated pairing for those phases is coming next — enroll players and use league generation for round-robin seasons today.",
    );
  }

  if (template === "hybrid_swiss_cut") {
    notes.push(
      "Official YGO-style flow: Swiss day 1 builds standings by match points; top cut is seeded into an elimination bracket through finals.",
    );
    const cut = phases.find((p) => p.cutSize)?.cutSize ?? phases[1]?.bracketSize;
    if (cut && (cut & (cut - 1)) !== 0) {
      notes.push(
        `Top ${cut} is not a power of 2 — bracket byes may be required when bracket pairing is automated.`,
      );
    }
  }

  return {
    template,
    templateLabel: TEMPLATE_LABELS[template],
    phases: previewPhases,
    notes,
  };
}

/** Map the active league phase to scheduleGenerationMode for fixture generation. */
export function leagueModeFromFormatPlan(
  phases: FormatPhaseConfig[],
): "single_round_robin" | "double_round_robin" | "manual" | null {
  const leaguePhase = phases.find((p) => p.kind === "league");
  if (!leaguePhase?.leagueMode) return null;
  return leaguePhase.leagueMode;
}

export function isLeagueFormatTemplate(template: CompetitionFormatTemplate): boolean {
  return template === "league";
}
