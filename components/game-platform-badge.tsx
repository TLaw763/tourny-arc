import type { GamePlatform } from "@/lib/domain/types";
import { gamePlatformMeta } from "@/lib/game-platform";

type GamePlatformBadgeProps = {
  platform: GamePlatform;
  variant?: "card" | "hero" | "inline";
};

export function GamePlatformBadge({ platform, variant = "inline" }: GamePlatformBadgeProps) {
  const meta = gamePlatformMeta(platform);

  return (
    <span className={`game-platform-badge game-platform-badge--${variant}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={meta.logoSrc} alt="" className="game-platform-badge-logo" />
      <span className="game-platform-badge-label">{meta.label}</span>
    </span>
  );
}
