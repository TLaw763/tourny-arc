import type { GamePlatform } from "@/lib/domain/types";
import { gamePlatformMeta } from "@/lib/game-platform";

type GamePlatformLogoProps = {
  platform: GamePlatform;
  className?: string;
};

/** Official platform logo only — for avatar / logo slots. */
export function GamePlatformLogo({ platform, className = "" }: GamePlatformLogoProps) {
  const meta = gamePlatformMeta(platform);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={meta.logoSrc}
      alt=""
      className={className}
    />
  );
}

type GamePlatformLabelProps = {
  platform: GamePlatform;
  variant?: "card" | "hero" | "inline";
};

/** Written platform name only — logo lives in the tournament avatar slot. */
export function GamePlatformLabel({ platform, variant = "inline" }: GamePlatformLabelProps) {
  return (
    <span className={`game-platform-label game-platform-label--${variant}`}>
      {gamePlatformMeta(platform).label}
    </span>
  );
}
