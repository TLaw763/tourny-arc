import { APP_NAME } from "@/lib/branding";

type TeLogoProps = {
  size?: number;
  showLabel?: boolean;
  className?: string;
};

export function TeLogo({ size = 28, showLabel = true, className = "" }: TeLogoProps) {
  const radius = Math.round(size * 0.25);

  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width={size}
        height={size}
        aria-hidden={showLabel}
        role={showLabel ? undefined : "img"}
        aria-label={showLabel ? undefined : APP_NAME}
      >
        <rect width="32" height="32" rx={radius} fill="#265dce" />
        <text
          x="16"
          y="21.5"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
          fontSize="13"
          fontWeight="700"
          fill="#ffffff"
        >
          TE
        </text>
      </svg>
      {showLabel ? <span>{APP_NAME}</span> : null}
    </span>
  );
}
