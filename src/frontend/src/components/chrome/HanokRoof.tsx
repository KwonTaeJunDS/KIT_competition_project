import { cn } from "@/lib/utils/cn";

interface HanokRoofProps {
  className?: string;
  compact?: boolean;
}

export function HanokRoof({ className, compact = false }: HanokRoofProps) {
  const tileXs = compact
    ? Array.from({ length: 20 }, (_, index) => 88 + index * 34)
    : Array.from({ length: 24 }, (_, index) => 64 + index * 30);
  const beadXs = compact
    ? Array.from({ length: 28 }, (_, index) => 66 + index * 24)
    : Array.from({ length: 34 }, (_, index) => 42 + index * 22);

  return (
    <svg
      viewBox="0 0 840 116"
      fill="none"
      className={cn("w-full overflow-visible", className)}
      aria-hidden="true"
    >
      <path
        d="M42 88C128 54 254 34 420 34s292 20 378 54"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M24 90C118 63 249 48 420 48s302 15 396 42"
        stroke="currentColor"
        strokeWidth="7.8"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M35 89c-6 8-16 12-24 11"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M805 89c6 8 16 12 24 11"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M62 92h716"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.7"
      />

      {tileXs.map((x) => (
        <g key={x} opacity="0.95">
          <path
            d={`M${x - 12} 70c5-7 31-7 36 0`}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d={`M${x - 12} 71h36v17c0 3-3 5-6 5h-24c-3 0-6-2-6-5V71Z`}
            fill="rgba(255,255,255,0.6)"
            stroke="currentColor"
            strokeWidth="1.1"
          />
        </g>
      ))}

      {beadXs.map((x) => (
        <circle
          key={x}
          cx={x}
          cy="96"
          r="3.1"
          fill="rgba(255,255,255,0.68)"
          stroke="currentColor"
          strokeWidth="1"
        />
      ))}

      <path
        d="M72 100h696"
        stroke="currentColor"
        strokeWidth="1.8"
        opacity="0.55"
      />
    </svg>
  );
}
