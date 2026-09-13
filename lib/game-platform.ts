import type { GamePlatform } from "@/lib/domain/types";

export const GAME_PLATFORMS: GamePlatform[] = ["tcg", "genesys", "master_duel"];

/** Official logos hosted on Konami / Yu-Gi-Oh! TCG sites. */
const PLATFORM_META: Record<
  GamePlatform,
  { label: string; shortLabel: string; logoSrc: string; logoAlt: string }
> = {
  tcg: {
    label: "Yu-Gi-Oh! TCG",
    shortLabel: "TCG",
    logoSrc: "https://www.yugioh-card.com/en/wp-content/uploads/2020/04/logo-main.png",
    logoAlt: "Yu-Gi-Oh! Trading Card Game logo",
  },
  genesys: {
    label: "Yu-Gi-Oh! Genesys",
    shortLabel: "Genesys",
    logoSrc: "https://www.yugioh-card.com/en/wp-content/uploads/2025/08/genesys_logo.png",
    logoAlt: "Yu-Gi-Oh! Genesys logo",
  },
  master_duel: {
    label: "Yu-Gi-Oh! Master Duel",
    shortLabel: "Master Duel",
    logoSrc: "https://www.konami.com/yugioh/masterduel/images/logo.png",
    logoAlt: "Yu-Gi-Oh! Master Duel logo",
  },
};

export function isGamePlatform(value: string | null | undefined): value is GamePlatform {
  return value != null && (GAME_PLATFORMS as string[]).includes(value);
}

/** Infer platform from competition name when the column is unset (legacy rows). */
export function inferGamePlatformFromName(name: string): GamePlatform | null {
  const normalized = name.toLowerCase();
  if (normalized.includes("master duel")) return "master_duel";
  if (normalized.includes("genesys")) return "genesys";
  if (normalized.includes("tcg") || normalized.includes("trading card")) return "tcg";
  return null;
}

export function resolveGamePlatform(
  stored: string | null | undefined,
  competitionName?: string | null,
): GamePlatform | null {
  if (isGamePlatform(stored)) return stored;
  if (competitionName) return inferGamePlatformFromName(competitionName);
  return null;
}

export function gamePlatformMeta(platform: GamePlatform) {
  return PLATFORM_META[platform];
}

export function gamePlatformLabel(platform: GamePlatform) {
  return PLATFORM_META[platform].label;
}
